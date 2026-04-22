import { VenumApiError, VenumNetworkError, VenumStreamClosedError, isAbortError } from './errors.js';
import { iterateSseStream, type SseIteratorOptions, type SseRawMessage } from './sse.js';
import type {
  BalanceHistoryParams,
  BalanceHistoryResult,
  BalanceHistoryStreamMessage,
  BalancesResponse,
  ChartInterval,
  ChartRange,
  ChartResponse,
  HealthResponse,
  NewPoolEventPayload,
  NewPoolListResponse,
  PairsResponse,
  PoolListResponse,
  PoolResponse,
  PoolStreamMessage,
  PoolsQuery,
  PriceStreamMessage,
  PricesBatchResponse,
  QuoteRequest,
  QuoteResponse,
  RetryOptions,
  SearchResponse,
  SendResponse,
  SwapBuildRequest,
  SwapBuildResponse,
  SwapOptions,
  SwapResult,
  SwapSubmitRequest,
  SwapSubmitResponse,
  TokenDetailResponse,
  TokenListResponse,
  TokenPrice,
  TraceResponse,
  TrendingResponse,
  TxEvent,
  TxEventPayload,
  TxStatusResponse,
  TxStreamMessage,
  UsageResponse,
  VolumeStatsResponse,
} from './types.js';

const DEFAULT_BASE_URL = 'https://api.venum.dev';
const SDK_VERSION = '0.1.0';
const DEFAULT_USER_AGENT = `@venumdev/sdk/${SDK_VERSION}`;
const DEFAULT_RETRY_STATUSES = [429, 502, 503, 504];

/** Options passed to every `VenumClient` method that issues an HTTP request. */
export interface RequestOptions {
  /** Abort the in-flight request. Aborting a retrying request cancels further attempts. */
  signal?: AbortSignal;
  /** Override the client's retry policy for this request. `false` disables retries entirely. */
  retry?: RetryOptions | false;
}

/** Shared options across all SSE stream consumers. */
export interface StreamOptions {
  /** Abort the stream. Stops in-flight reads and any pending reconnect. */
  signal?: AbortSignal;
  /**
   * Delay between reconnect attempts in ms. Default 3000 for prices/pools,
   * 0 (single-shot) for tx/balance-history. Set to 0 to disable reconnect.
   */
  reconnectDelayMs?: number;
  /** Notified when a transient error fires while the stream is still alive (pre-reconnect). */
  onError?: (error: string) => void;
}

/** Callback-mode options for `streamPrices`. */
export interface PriceStreamOptions extends StreamOptions {
  /** Called with each typed message. */
  onEvent: (message: PriceStreamMessage) => void;
  /** Surface optimistic (unconfirmed) price updates alongside confirmed ones. Default true. */
  includeOptimistic?: boolean;
  /** Minimum fractional change to emit (default 0.00001 = 0.1 bp). */
  dedupThreshold?: number;
}

/** Options for the iterator variant of the price stream. */
export interface PriceIteratorOptions extends StreamOptions {
  includeOptimistic?: boolean;
  dedupThreshold?: number;
}

/** Callback-mode options for `streamPools`. */
export interface PoolStreamOptions extends StreamOptions {
  onEvent: (message: PoolStreamMessage) => void;
}

/** Callback-mode options for `streamTx`. */
export interface TxStreamOptions extends StreamOptions {
  onEvent: (message: TxStreamMessage) => void;
  events?: TxEvent[];
}

/** Options for `iterateTx`. */
export interface TxIteratorOptions extends StreamOptions {
  events?: TxEvent[];
}

/** Callback-mode options for `streamBalanceHistory`. */
export interface BalanceHistoryStreamOptions extends StreamOptions {
  onEvent: (message: BalanceHistoryStreamMessage) => void;
}

/** Options for `waitForTx`. */
export interface WaitForTxOptions extends RequestOptions {
  /** Which event statuses resolve the promise. Default `['landed', 'processed', 'confirmed']`. */
  events?: TxEvent[];
}

/** Client construction options. */
export interface VenumClientOptions {
  /** Override the API base URL. Defaults to `https://api.venum.dev`. */
  baseUrl?: string;
  /** API key sent in `X-API-Key`. In Node, falls back to `process.env.VENUM_API_KEY` when omitted. */
  apiKey?: string;
  /** Override the `User-Agent` header. Defaults to `@venumdev/sdk/<version>`. */
  userAgent?: string;
  /** Inject a custom `fetch` (e.g. for logging, middleware, or testing). */
  fetch?: typeof globalThis.fetch;
  /**
   * Retry policy for transient failures (network errors + status 429/5xx).
   *
   * - Defaults: 3 retries, 500 ms base delay, 5 s cap, retry on `[429, 502, 503, 504]`.
   * - Never retries `submitSwap` or `send` (non-idempotent).
   * - Never retries `401`/`403`/`404` (those surface immediately).
   * - Honors `Retry-After` on 429 responses.
   * - Pass `false` to disable retries globally.
   */
  retry?: RetryOptions | false;
}

interface ResolvedRetry {
  retries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryOn: Set<number>;
}

/**
 * Typed client for the Venum Solana execution API.
 *
 * Covers every public endpoint: prices, pools, pairs, tokens, search, trending, charts,
 * quotes, swap build/submit, raw tx send, balances, balance history, usage, stats,
 * transaction status and trace, plus all SSE streams.
 *
 * Isomorphic (Node 22+ and modern browsers). Zero runtime dependencies.
 *
 * @example
 * ```ts
 * const venum = new VenumClient({ apiKey: process.env.VENUM_API_KEY });
 * const sol = await venum.price('SOL');
 * console.log(sol.priceUsd);
 * ```
 */
export class VenumClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly userAgent: string;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly defaultRetry: ResolvedRetry | false;

  constructor(options: VenumClientOptions = {}) {
    const env = readNodeEnv();
    this.baseUrl = (options.baseUrl ?? env.VENUM_API_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.apiKey = options.apiKey ?? env.VENUM_API_KEY;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    const rawFetch = options.fetch ?? globalThis.fetch;
    if (!rawFetch) {
      throw new Error('fetch is not available; provide options.fetch (Node <18 or non-standard runtime)');
    }
    this.fetchImpl = rawFetch.bind(globalThis);
    this.defaultRetry = options.retry === false ? false : resolveRetry(options.retry);
  }

  /** Health probe. No auth required. */
  async health(opts: RequestOptions = {}): Promise<HealthResponse> {
    return this.get('/health', opts);
  }

  /** API-key usage stats (self-service keys only). */
  async usage(opts: RequestOptions = {}): Promise<UsageResponse> {
    return this.get('/v1/usage', opts);
  }

  /**
   * Aggregate swap volume for a time window.
   * @param params.from Unix seconds.
   * @param params.to Unix seconds.
   */
  async volumeStats(params: { from: number; to: number }, opts: RequestOptions = {}): Promise<VolumeStatsResponse> {
    const qs = new URLSearchParams({ from: String(params.from), to: String(params.to) });
    return this.get(`/v1/stats/volume?${qs.toString()}`, opts);
  }

  /** List tracked tokens, optionally filtered by category. */
  async tokens(params: { category?: string } = {}, opts: RequestOptions = {}): Promise<TokenListResponse> {
    const qs = params.category ? `?category=${encodeURIComponent(params.category)}` : '';
    return this.get(`/v1/tokens${qs}`, opts);
  }

  /** Detailed token page (price summary + top pools + GeckoTerminal enrichment). */
  async token(mint: string, params: { include?: string[]; topPools?: number } = {}, opts: RequestOptions = {}): Promise<TokenDetailResponse> {
    const qs = new URLSearchParams();
    if (params.include?.length) qs.set('include', params.include.join(','));
    if (params.topPools !== undefined) qs.set('topPools', String(params.topPools));
    const suffix = qs.size > 0 ? `?${qs.toString()}` : '';
    return this.get(`/v1/token/${encodeURIComponent(mint)}${suffix}`, opts);
  }

  /** Fuzzy search across tokens and pools by symbol / name / address. */
  async search(query: string, params: { limit?: number } = {}, opts: RequestOptions = {}): Promise<SearchResponse> {
    const qs = new URLSearchParams({ q: query });
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    return this.get(`/v1/search?${qs.toString()}`, opts);
  }

  /** Top movers + most-active tokens + newest pools. */
  async trending(params: { limit?: number } = {}, opts: RequestOptions = {}): Promise<TrendingResponse> {
    const qs = params.limit !== undefined ? `?limit=${params.limit}` : '';
    return this.get(`/v1/trending${qs}`, opts);
  }

  /** OHLCV candles for a token's best pool. */
  async chart(mint: string, params: { range?: ChartRange; interval?: ChartInterval } = {}, opts: RequestOptions = {}): Promise<ChartResponse> {
    const qs = new URLSearchParams();
    if (params.range) qs.set('range', params.range);
    if (params.interval) qs.set('interval', params.interval);
    const suffix = qs.size > 0 ? `?${qs.toString()}` : '';
    return this.get(`/v1/chart/${encodeURIComponent(mint)}${suffix}`, opts);
  }

  /** Current USD price for a single token (symbol or mint). */
  async price(token: string, opts: RequestOptions = {}): Promise<TokenPrice> {
    return this.get(`/v1/price/${encodeURIComponent(token)}`, opts);
  }

  /** Batch prices for up to 50 tokens. */
  async prices(tokens: string[], opts: RequestOptions = {}): Promise<PricesBatchResponse> {
    if (tokens.length === 0) throw new Error('prices() requires at least one token');
    const qs = new URLSearchParams({ tokens: tokens.join(',') });
    return this.get(`/v1/prices?${qs.toString()}`, opts);
  }

  /** Single pool by address. */
  async pool(address: string, opts: RequestOptions = {}): Promise<PoolResponse> {
    return this.get(`/v1/pool/${encodeURIComponent(address)}`, opts);
  }

  /** Paginated pool listing with filter support (by token, pair, dex). */
  async pools(params: PoolsQuery = {}, opts: RequestOptions = {}): Promise<PoolListResponse> {
    const qs = poolsQueryString(params);
    return this.get(`/v1/pools${qs ? `?${qs}` : ''}`, opts);
  }

  /** Most recently discovered pools. */
  async newPools(params: { limit?: number } = {}, opts: RequestOptions = {}): Promise<NewPoolListResponse> {
    const qs = params.limit !== undefined ? `?limit=${params.limit}` : '';
    return this.get(`/v1/pools/new${qs}`, opts);
  }

  /** Exhaustive pool dump (paginated, for seeding local indexes). */
  async poolsSeed(params: PoolsQuery = {}, opts: RequestOptions = {}): Promise<PoolListResponse> {
    const qs = poolsQueryString(params);
    return this.get(`/v1/pools/seed${qs ? `?${qs}` : ''}`, opts);
  }

  /** Output mints tradeable against `mint` (sorted by pool count). */
  async pairs(mint: string, opts: RequestOptions = {}): Promise<PairsResponse> {
    return this.get(`/v1/pairs/${encodeURIComponent(mint)}`, opts);
  }

  /** SPL + SOL balances for a wallet. */
  async balances(wallet: string, opts: RequestOptions = {}): Promise<BalancesResponse> {
    return this.get(`/v1/balances/${encodeURIComponent(wallet)}`, opts);
  }

  /** Historical balance points for a wallet. Requires caller-provided Helius RPC. */
  async balanceHistory(params: BalanceHistoryParams, opts: RequestOptions = {}): Promise<BalanceHistoryResult> {
    const qs = balanceHistoryQueryString(params);
    return this.get(`/v1/history/balance?${qs}`, opts);
  }

  /** Get a swap quote for `amount` of `inputMint` → `outputMint`. */
  async quote(request: QuoteRequest, opts: RequestOptions = {}): Promise<QuoteResponse> {
    return this.post('/v1/quote', request, opts);
  }

  /** Build an unsigned swap transaction from a quote. */
  async buildSwap(request: SwapBuildRequest, opts: RequestOptions = {}): Promise<SwapBuildResponse> {
    return this.post('/v1/swap/build', request, opts);
  }

  /**
   * Submit a signed swap transaction by `quoteId`. Never retried (non-idempotent).
   */
  async submitSwap(request: SwapSubmitRequest, opts: RequestOptions = {}): Promise<SwapSubmitResponse> {
    return this.post('/v1/swap', request, { ...opts, retry: false });
  }

  /**
   * Submit any signed Solana transaction via Jito + RPC. No quote required.
   * Never retried (non-idempotent).
   */
  async send(signedTransaction: string, opts: RequestOptions = {}): Promise<SendResponse> {
    return this.post('/v1/send', { transaction: signedTransaction }, { ...opts, retry: false });
  }

  /** Transaction status lookup. */
  async txStatus(signature: string, opts: RequestOptions = {}): Promise<TxStatusResponse> {
    return this.get(`/v1/tx/${encodeURIComponent(signature)}`, opts);
  }

  /** CPI tree + per-program compute-unit breakdown for a landed transaction. */
  async trace(signature: string, opts: RequestOptions = {}): Promise<TraceResponse> {
    return this.get(`/v1/trace/${encodeURIComponent(signature)}`, opts);
  }

  /**
   * Run a full swap: build → sign via caller-provided signer → submit → optionally wait.
   *
   * The signer is a callback you supply — the SDK does not import any Solana library.
   * Wrap your wallet adapter (`@solana/web3.js`, `@solana/kit`, wallet-standard, etc.)
   * to match {@link SwapSigner}.
   *
   * @example
   * ```ts
   * import { Keypair, VersionedTransaction } from '@solana/web3.js';
   * const kp = Keypair.fromSecretKey(...);
   *
   * const result = await venum.swap({
   *   inputMint: SOL_MINT,
   *   outputMint: USDC_MINT,
   *   amount: '1000000000',
   *   slippageBps: 50,
   *   signer: {
   *     publicKey: kp.publicKey.toBase58(),
   *     sign: (b64) => {
   *       const tx = VersionedTransaction.deserialize(Buffer.from(b64, 'base64'));
   *       tx.sign([kp]);
   *       return Buffer.from(tx.serialize()).toString('base64');
   *     },
   *   },
   *   waitFor: 'confirmed',
   * });
   * console.log(result.signature, result.landed?.slot);
   * ```
   */
  async swap(opts: SwapOptions, requestOpts: RequestOptions = {}): Promise<SwapResult> {
    const build = await this.buildSwap({
      inputMint: opts.inputMint,
      outputMint: opts.outputMint,
      amount: opts.amount,
      userPublicKey: opts.signer.publicKey,
      slippageBps: opts.slippageBps,
      createAtaIfMissing: opts.createAtaIfMissing,
      excludePools: opts.excludePools,
      simulate: opts.simulate,
    }, requestOpts);

    const signed = await opts.signer.sign(build.transaction);
    const submit = await this.submitSwap({ quoteId: build.quoteId, signedTransaction: signed }, requestOpts);

    const result: SwapResult = {
      signature: submit.signature,
      quoteId: build.quoteId,
      build,
      submit,
    };

    if (opts.waitFor) {
      result.landed = await this.waitForTx(submit.signature, {
        events: [opts.waitFor],
        signal: requestOpts.signal,
      });
    }
    return result;
  }

  /**
   * Wait for a single transaction to reach a terminal status (landed, processed, confirmed,
   * finalized). Resolves at the first matching event or rejects on failure/timeout.
   */
  async waitForTx(signature: string, opts: WaitForTxOptions = {}): Promise<TxEventPayload> {
    const events = opts.events ?? ['landed', 'processed', 'confirmed'];
    const url = this.url(`/v1/stream/tx?${new URLSearchParams({
      signatures: signature,
      events: events.join(','),
    }).toString()}`);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        headers: this.streamHeaders(),
        signal: opts.signal,
      });
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new VenumNetworkError(url, error);
    }

    if (!response.ok || !response.body) {
      throw new VenumApiError(response.status, await response.text().catch(() => ''));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let eventType = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && eventType === 'tx') {
            const payload = JSON.parse(line.slice(6)) as TxEventPayload;
            if (isTerminalTxStatus(payload.status, events)) return payload;
            eventType = '';
          } else if (line === '') {
            eventType = '';
          }
        }
      }
    } finally {
      try { await reader.cancel(); } catch { /* ignore */ }
    }

    throw new VenumStreamClosedError('Transaction confirmation stream closed before terminal event');
  }

  /** Callback-mode live price stream. Resolves when the stream ends (abort or non-reconnecting failure). */
  async streamPrices(tokens: string[], opts: PriceStreamOptions): Promise<void> {
    for await (const msg of this.iteratePrices(tokens, opts)) {
      opts.onEvent(msg);
    }
  }

  /** Iterator-mode live price stream. */
  async *iteratePrices(tokens: string[], opts: PriceIteratorOptions = {}): AsyncGenerator<PriceStreamMessage, void, void> {
    const qs = priceStreamQueryString(tokens, opts);
    for await (const msg of this.iterateSse(`/v1/stream/prices${qs ? `?${qs}` : ''}`, opts)) {
      const typed = toPriceMessage(msg);
      if (typed) yield typed;
    }
  }

  /** Callback-mode new-pool stream. */
  async streamPools(opts: PoolStreamOptions): Promise<void> {
    for await (const msg of this.iteratePools(opts)) {
      opts.onEvent(msg);
    }
  }

  /** Iterator-mode new-pool stream. */
  async *iteratePools(opts: StreamOptions = {}): AsyncGenerator<PoolStreamMessage, void, void> {
    for await (const msg of this.iterateSse('/v1/stream/pools', opts)) {
      const typed = toPoolMessage(msg);
      if (typed) yield typed;
    }
  }

  /** Callback-mode transaction event stream for up to 10 signatures. */
  async streamTx(signatures: string[], opts: TxStreamOptions): Promise<void> {
    for await (const msg of this.iterateTx(signatures, opts)) {
      opts.onEvent(msg);
    }
  }

  /** Iterator-mode transaction event stream. */
  async *iterateTx(signatures: string[], opts: TxIteratorOptions = {}): AsyncGenerator<TxStreamMessage, void, void> {
    if (signatures.length === 0) throw new Error('iterateTx requires at least one signature');
    if (signatures.length > 10) throw new Error('iterateTx supports at most 10 signatures per connection');
    const qs = new URLSearchParams({ signatures: signatures.join(',') });
    if (opts.events?.length) qs.set('events', opts.events.join(','));
    const streamOpts = { ...opts, reconnectDelayMs: opts.reconnectDelayMs ?? 0 };
    for await (const msg of this.iterateSse(`/v1/stream/tx?${qs.toString()}`, streamOpts)) {
      const typed = toTxMessage(msg);
      if (typed) yield typed;
    }
  }

  /** Callback-mode balance-history stream (emits progress → points → complete). */
  async streamBalanceHistory(params: BalanceHistoryParams, opts: BalanceHistoryStreamOptions): Promise<void> {
    for await (const msg of this.iterateBalanceHistory(params, opts)) {
      opts.onEvent(msg);
    }
  }

  /** Iterator-mode balance-history stream. */
  async *iterateBalanceHistory(
    params: BalanceHistoryParams,
    opts: StreamOptions = {},
  ): AsyncGenerator<BalanceHistoryStreamMessage, void, void> {
    const qs = balanceHistoryQueryString(params);
    const streamOpts = { ...opts, reconnectDelayMs: opts.reconnectDelayMs ?? 0 };
    for await (const msg of this.iterateSse(`/v1/stream/balance-history?${qs}`, streamOpts)) {
      const typed = toBalanceHistoryMessage(msg);
      if (typed) yield typed;
    }
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private restHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'User-Agent': this.userAgent };
    if (this.apiKey) headers['X-API-Key'] = this.apiKey;
    return headers;
  }

  private streamHeaders(): Record<string, string> {
    return { Accept: 'text/event-stream', ...this.restHeaders() };
  }

  private async get<T>(path: string, opts: RequestOptions): Promise<T> {
    const url = this.url(path);
    const resp = await this.fetchWithRetry(url, { method: 'GET', headers: this.restHeaders(), signal: opts.signal }, opts.retry);
    return this.readBody<T>(resp);
  }

  private async post<T>(path: string, body: unknown, opts: RequestOptions): Promise<T> {
    const url = this.url(path);
    const resp = await this.fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { ...this.restHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: opts.signal,
      },
      opts.retry,
    );
    return this.readBody<T>(resp);
  }

  private async readBody<T>(resp: Response): Promise<T> {
    if (!resp.ok) {
      throw new VenumApiError(resp.status, await resp.text().catch(() => ''));
    }
    return resp.json() as Promise<T>;
  }

  private async fetchWithRetry(url: string, init: RequestInit, override: RetryOptions | false | undefined): Promise<Response> {
    const retry = resolveRequestRetry(this.defaultRetry, override);
    const attempts = retry ? retry.retries + 1 : 1;

    for (let i = 0; i < attempts; i++) {
      let resp: Response;
      try {
        resp = await this.fetchImpl(url, init);
      } catch (error) {
        if (isAbortError(error)) throw error;
        if (!retry || i === attempts - 1) throw new VenumNetworkError(url, error);
        const slept = await retrySleep(backoff(retry, i, null), init.signal ?? undefined);
        if (!slept) throw abortError();
        continue;
      }

      if (resp.ok) return resp;
      if (!retry || !retry.retryOn.has(resp.status) || i === attempts - 1) return resp;

      const slept = await retrySleep(backoff(retry, i, resp.headers.get('Retry-After')), init.signal ?? undefined);
      if (!slept) throw abortError();
    }

    throw new Error('unreachable: retry loop exited without return');
  }

  private iterateSse(path: string, opts: StreamOptions): AsyncGenerator<SseRawMessage, void, void> {
    const sseOpts: SseIteratorOptions = {
      signal: opts.signal,
      reconnectDelayMs: opts.reconnectDelayMs,
      onError: opts.onError,
    };
    return iterateSseStream(this.url(path), this.streamHeaders(), sseOpts, this.fetchImpl);
  }
}

function readNodeEnv(): { VENUM_API_KEY?: string; VENUM_API_URL?: string } {
  if (typeof process === 'undefined' || !process.env) return {};
  return {
    VENUM_API_KEY: process.env.VENUM_API_KEY,
    VENUM_API_URL: process.env.VENUM_API_URL,
  };
}

function resolveRetry(opts: RetryOptions | undefined): ResolvedRetry {
  return {
    retries: opts?.retries ?? 3,
    baseDelayMs: opts?.baseDelayMs ?? 500,
    maxDelayMs: opts?.maxDelayMs ?? 5000,
    retryOn: new Set(opts?.retryOn ?? DEFAULT_RETRY_STATUSES),
  };
}

function resolveRequestRetry(
  client: ResolvedRetry | false,
  override: RetryOptions | false | undefined,
): ResolvedRetry | false {
  if (override === false) return false;
  if (!client) return false;
  if (!override) return client;
  return {
    retries: override.retries ?? client.retries,
    baseDelayMs: override.baseDelayMs ?? client.baseDelayMs,
    maxDelayMs: override.maxDelayMs ?? client.maxDelayMs,
    retryOn: override.retryOn ? new Set(override.retryOn) : client.retryOn,
  };
}

function backoff(retry: ResolvedRetry, attempt: number, retryAfter: string | null): number {
  if (retryAfter) {
    const parsed = parseRetryAfter(retryAfter);
    if (parsed !== null) return Math.min(parsed, retry.maxDelayMs);
  }
  const base = retry.baseDelayMs * 2 ** attempt;
  const jitter = Math.random() * retry.baseDelayMs;
  return Math.min(base + jitter, retry.maxDelayMs);
}

function parseRetryAfter(value: string): number | null {
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return null;
}

function retrySleep(ms: number, signal: AbortSignal | undefined): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve(true);
    }, ms);
    const onAbort = () => {
      clearTimeout(timeout);
      resolve(false);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function abortError(): Error {
  try {
    return new DOMException('Aborted', 'AbortError');
  } catch {
    const err = new Error('Aborted');
    err.name = 'AbortError';
    return err;
  }
}

function poolsQueryString(params: PoolsQuery): string {
  const qs = new URLSearchParams();
  if (params.token) qs.set('token', params.token);
  if (params.tokens?.length) qs.set('tokens', params.tokens.join(','));
  if (params.pair) qs.set('pair', params.pair.join(','));
  if (params.dex) qs.set('dex', params.dex);
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.offset !== undefined) qs.set('offset', String(params.offset));
  return qs.toString();
}

function balanceHistoryQueryString(params: BalanceHistoryParams): string {
  const qs = new URLSearchParams({
    walletAddress: params.walletAddress,
    heliusRpcUrl: params.heliusRpcUrl,
  });
  if (params.assetMint) qs.set('assetMint', params.assetMint);
  return qs.toString();
}

function priceStreamQueryString(tokens: string[], opts: { includeOptimistic?: boolean; dedupThreshold?: number }): string {
  const qs = new URLSearchParams();
  if (tokens.length > 0) qs.set('tokens', tokens.join(','));
  if ((opts.includeOptimistic ?? true)) qs.set('includeOptimistic', 'true');
  if (opts.dedupThreshold !== undefined) qs.set('dedupThreshold', String(opts.dedupThreshold));
  return qs.toString();
}

function isTerminalTxStatus(status: TxEventPayload['status'], requested: TxEvent[]): boolean {
  if (status === 'failed' || status === 'timeout' || status === 'verify-timeout') return true;
  return (requested as string[]).includes(status);
}

function toPriceMessage(raw: SseRawMessage): PriceStreamMessage | null {
  switch (raw.event) {
    case 'ready':
      return { type: 'ready', ts: extractTs(raw.data) };
    case 'price':
      return { type: 'price', price: raw.data as TokenPrice };
    case 'heartbeat':
      return { type: 'heartbeat', ts: extractTs(raw.data) };
    default:
      return null;
  }
}

function toPoolMessage(raw: SseRawMessage): PoolStreamMessage | null {
  switch (raw.event) {
    case 'ready':
      return { type: 'ready', ts: extractTs(raw.data) };
    case 'new-pool':
      return { type: 'new-pool', pool: raw.data as NewPoolEventPayload };
    case 'heartbeat':
      return { type: 'heartbeat', ts: extractTs(raw.data) };
    default:
      return null;
  }
}

function toTxMessage(raw: SseRawMessage): TxStreamMessage | null {
  switch (raw.event) {
    case 'ready': {
      const d = (raw.data ?? {}) as { ts?: number; signatures?: string[] };
      return { type: 'ready', ts: d.ts ?? 0, signatures: d.signatures ?? [] };
    }
    case 'tx':
      return { type: 'tx', tx: raw.data as TxEventPayload };
    case 'error': {
      const d = (raw.data ?? {}) as { signature?: string; error?: string; reason?: string };
      return { type: 'error', signature: d.signature ?? '', error: d.error ?? '', reason: d.reason ?? '' };
    }
    case 'heartbeat':
      return { type: 'heartbeat', ts: extractTs(raw.data) };
    default:
      return null;
  }
}

function toBalanceHistoryMessage(raw: SseRawMessage): BalanceHistoryStreamMessage | null {
  switch (raw.event) {
    case 'ready': {
      const d = (raw.data ?? {}) as { walletAddress?: string; assetMint?: string; ts?: number };
      return { type: 'ready', walletAddress: d.walletAddress ?? '', assetMint: d.assetMint ?? '', ts: d.ts ?? 0 };
    }
    case 'progress':
      return { type: 'progress', payload: raw.data };
    case 'points': {
      const d = (raw.data ?? {}) as { walletAddress?: string; assetMint?: string; points?: BalanceHistoryResult['points'] };
      return { type: 'points', walletAddress: d.walletAddress ?? '', assetMint: d.assetMint ?? '', points: d.points ?? [] };
    }
    case 'complete':
      return { type: 'complete', result: raw.data as BalanceHistoryResult };
    case 'error': {
      const d = (raw.data ?? {}) as { error?: string; details?: string };
      return { type: 'error', error: d.error ?? '', details: d.details ?? '' };
    }
    case 'heartbeat':
      return { type: 'heartbeat', ts: extractTs(raw.data) };
    default:
      return null;
  }
}

function extractTs(data: unknown): number {
  if (data && typeof data === 'object' && 'ts' in data) {
    const ts = (data as { ts: unknown }).ts;
    if (typeof ts === 'number') return ts;
  }
  return 0;
}
