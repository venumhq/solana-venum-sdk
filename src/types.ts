export interface HealthResponse {
  status: string;
  pools?: number;
  [key: string]: unknown;
}

export interface TokenPrice {
  token: string;
  priceUsd: number;
  bestBid: number;
  bestAsk: number;
  bestBidPool: string;
  bestAskPool: string;
  bestBidDex: string;
  bestAskDex: string;
  bestBidFeeBps: number;
  bestAskFeeBps: number;
  poolCacheAgeMs: number;
  confidence?: 'confirmed' | 'optimistic';
  optimisticAgeMs?: number;
  poolCount: number;
  timestamp: number;
  route?: string;
  change24h?: number;
}

export interface PriceUnavailable {
  token: string;
  status: 'unavailable';
  reason: string;
}

export interface PricesBatchResponse {
  prices: Record<string, TokenPrice | { status: string; reason: string }>;
  timestamp: number;
}

export interface PoolResponse {
  address: string;
  dex: string;
  mintA: string;
  mintB: string;
  symbolA: string | null;
  symbolB: string | null;
  decimalsA: number;
  decimalsB: number;
  feeBps: number;
  price: number | null;
  baseSymbol: string | null;
  quoteSymbol: string | null;
  reserveA?: string | null;
  reserveB?: string | null;
  sqrtPrice?: string | null;
  tickCurrent?: number | null;
  cacheAgeMs: number;
  tvlUsd: number | null;
  volume24hUsd: number | null;
  discoveredAt?: number;
}

export interface PoolListResponse {
  pools: PoolResponse[];
  count: number;
  total?: number;
  offset?: number;
  limit?: number;
  mint?: string;
  pair?: { mintA: string; mintB: string };
}

export interface NewPoolListResponse {
  pools: Array<PoolResponse & { discoveredAt: number }>;
  count: number;
}

export interface PoolsQuery {
  token?: string;
  tokens?: string[];
  pair?: [string, string];
  dex?: string;
  limit?: number;
  offset?: number;
}

export interface PairEntry {
  mint: string;
  symbol: string;
  decimals: number;
  poolCount: number;
}

export interface PairsResponse {
  inputMint: string;
  pairs: PairEntry[];
  count: number;
}

export interface TokenInfo {
  symbol: string;
  mint: string;
  decimals: number;
  category: string;
  aliases?: string[];
}

export interface TokenListResponse {
  tokens: TokenInfo[];
  count: number;
  categories: string[];
}

export interface TokenSummary {
  priceUsd: number | null;
  bestBid: number | null;
  bestAsk: number | null;
  change24h?: number;
  live: boolean;
  tradeable: boolean;
  confidence: string | null;
  cacheAgeMs: number;
  poolCount: number;
  route: string | null;
}

export interface TokenBestVenue {
  bestBidPool: string;
  bestAskPool: string;
  bestBidDex: string;
  bestAskDex: string;
  bestBidFeeBps: number;
  bestAskFeeBps: number;
}

export interface TokenDetailResponse {
  token: TokenInfo;
  summary: TokenSummary;
  bestVenue: TokenBestVenue | null;
  topPools: PoolResponse[];
  links: { pulse: string; swap: string };
  meta: { servedAt: number; include: string[] };
}

export type SearchResultType = 'token' | 'pool';

export interface TokenSearchResult {
  type: 'token';
  id: string;
  href: string;
  symbol: string;
  mint: string;
  name: string;
  category: string;
  live: boolean;
  tradeable: boolean;
  poolCount: number;
  priceUsd: number | null;
  change24h?: number;
}

export interface PoolSearchResult {
  type: 'pool';
  id: string;
  href: string;
  address: string;
  dex: string;
  symbolA: string | null;
  symbolB: string | null;
  cacheAgeMs: number;
}

export type SearchResult = TokenSearchResult | PoolSearchResult;

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  count: number;
  limit: number;
}

export interface TrendingMover {
  symbol: string;
  mint: string;
  name: string;
  category: string;
  priceUsd: number | null;
  change24h?: number;
  poolCount: number;
  href: string;
  cacheAgeMs?: number;
}

export interface TrendingResponse {
  updatedAt: number;
  movers: TrendingMover[];
  active: TrendingMover[];
  trackedTokenCount: number;
  indexedPoolCount: number;
  newPools: Array<PoolResponse & { discoveredAt?: number }>;
}

export type ChartRange = '1d' | '7d' | '30d';
export type ChartInterval = '5m' | '15m' | '1h' | '4h' | '1d';

export interface ChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartResponse {
  token: { symbol: string; mint: string; name: string };
  range: ChartRange;
  interval: ChartInterval;
  source: 'geckoterminal';
  pool: {
    address: string;
    dex: string;
    symbolA: string | null;
    symbolB: string | null;
  };
  candles: ChartCandle[];
}

export interface BalanceEntry {
  mint: string;
  symbol: string;
  decimals: number;
  amount: string | null;
  uiAmount: number | null;
}

export interface BalancesResponse {
  wallet: string;
  balances: BalanceEntry[];
  fetchedAt: number;
}

export interface BalanceHistoryPoint {
  signature: string;
  slot: number;
  transactionIndex: number;
  blockTime: number;
  lamports: number;
  sol: number;
  failed: boolean;
}

export interface BalanceHistoryStats {
  rpcPosts: number;
  enumeratedSignatures: number;
  points: number;
  elapsedMs: number;
}

export interface BalanceHistoryResult {
  walletAddress: string;
  points: BalanceHistoryPoint[];
  stats: BalanceHistoryStats;
}

export interface BalanceHistoryParams {
  walletAddress: string;
  heliusRpcUrl: string;
  assetMint?: string;
}

export interface UsageEndpointRow {
  endpoint: string;
  totalRequests: number;
  totalRateLimited: number;
  lastUsedAt: string | null;
}

export interface UsageResponse {
  summary: {
    totalRequests: number;
    totalRateLimited: number;
    endpointCount: number;
    hasUsage: boolean;
    lastUsedAt: string | null;
    lastUsedPath: string | null;
    lastUsedIp: string | null;
    lastRateLimitedAt: string | null;
    lastRateLimitedPath: string | null;
    lastRateLimitedIp: string | null;
  };
  endpoints: UsageEndpointRow[];
}

export interface VolumeStatsResponse {
  from: number;
  to: number;
  volumeUsd: number;
  swapCount: number;
}

export interface QuoteHop {
  dex: string;
  poolAddress: string;
  outputAmount: string;
  feeBps: number;
}

export interface QuoteRoute {
  dex: string;
  poolAddress: string;
  outputAmount: string;
  priceImpactPct?: number;
  feeBps: number;
  confidence: 'observed' | 'optimistic';
  poolCacheAgeMs: number;
  hops?: QuoteHop[];
}

export interface QuoteRequest {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
}

export interface QuoteResponse {
  topRoutes: QuoteRoute[];
  timestamp: number;
  inputMint: string;
  outputMint: string;
}

export interface SwapBuildRequest {
  inputMint: string;
  outputMint: string;
  amount: string;
  userPublicKey: string;
  slippageBps?: number;
  createAtaIfMissing?: boolean;
  excludePools?: string[];
  simulate?: boolean;
}

export interface SwapBuildResponse {
  transaction: string;
  quoteId: string;
  route: QuoteRoute;
  estimatedOutput: string;
  simulatedOutput: string | null;
  minOutput: string;
  feeLamports: string;
  feeBps: number;
  computeUnits: number;
  simulated: boolean;
}

export interface SwapSubmitRequest {
  quoteId: string;
  signedTransaction: string;
}

export interface SwapSubmitResponse {
  signature: string;
  status: string;
  quoteId: string;
  jito: boolean;
  rpc: boolean;
  submittedAt: number;
}

export interface SendResponse {
  signature: string;
  status: string;
  jito: boolean;
  rpc: boolean;
}

export interface TxStatusResponse {
  signature: string;
  status: 'not_found' | 'failed' | 'confirmed' | 'finalized' | 'error';
  confirmationStatus?: 'processed' | 'confirmed' | 'finalized' | 'unknown';
  slot?: number;
  confirmations?: number | null;
  error?: string | null;
  reason?: string;
  fee?: number | null;
  computeUnits?: number | null;
}

export interface TraceNode {
  programId: string;
  depth: number;
  cuConsumed: number;
  cuBudget: number;
  status: 'success' | 'failed';
  error?: string;
  children: TraceNode[];
}

export interface ProgramSummary {
  programId: string;
  totalCu: number;
  invocations: number;
}

export interface TraceResponse {
  signature: string;
  slot: number | null;
  blockTime: number | null;
  err: unknown | null;
  cu: { consumed: number; budget: number };
  tree: TraceNode[];
  programs: ProgramSummary[];
  cached: boolean;
  fetchedAt: number;
}

export type TxEvent = 'landed' | 'processed' | 'confirmed' | 'finalized';

export interface TxEventPayload {
  signature: string;
  status: 'landed' | 'processed' | 'confirmed' | 'finalized' | 'failed' | 'timeout' | 'verify-timeout';
  slot: number;
  err?: string;
  ts: number;
}

export interface NewPoolEventPayload {
  address: string;
  dex: string;
  mintA: string;
  mintB: string;
  discoveredAt: number;
}

export type PriceStreamMessage =
  | { type: 'ready'; ts: number }
  | { type: 'price'; price: TokenPrice }
  | { type: 'heartbeat'; ts: number };

export interface QuoteStreamRequest {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
  /** Server tick rate in Hz. Default 2, clamped to [1, 5]. */
  tickHz?: number;
  /** Minimum change in bestRoute.outputAmount (basis points) required to emit a new quote event. Default 1. */
  minMoveBps?: number;
}

export interface QuoteStreamErrorPayload {
  error: string;
  status: number;
  inputMint: string;
  outputMint: string;
}

export type QuoteStreamMessage =
  | { type: 'quote'; quote: QuoteResponse }
  | { type: 'error'; payload: QuoteStreamErrorPayload }
  | { type: 'heartbeat'; ts: number };

export type PoolStreamMessage =
  | { type: 'ready'; ts: number }
  | { type: 'new-pool'; pool: NewPoolEventPayload }
  | { type: 'heartbeat'; ts: number };

export type TxStreamMessage =
  | { type: 'ready'; ts: number; signatures: string[] }
  | { type: 'tx'; tx: TxEventPayload }
  | { type: 'error'; signature: string; error: string; reason: string }
  | { type: 'heartbeat'; ts: number };

export type BalanceHistoryStreamMessage =
  | { type: 'ready'; walletAddress: string; assetMint: string; ts: number }
  | { type: 'progress'; payload: unknown }
  | { type: 'points'; walletAddress: string; assetMint: string; points: BalanceHistoryPoint[] }
  | { type: 'complete'; result: BalanceHistoryResult }
  | { type: 'error'; error: string; details: string }
  | { type: 'heartbeat'; ts: number };

export interface SwapSigner {
  publicKey: string;
  sign(unsignedTransactionBase64: string): string | Promise<string>;
}

export interface SwapOptions {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
  signer: SwapSigner;
  createAtaIfMissing?: boolean;
  excludePools?: string[];
  simulate?: boolean;
  waitFor?: TxEvent;
}

export interface SwapResult {
  signature: string;
  quoteId: string;
  build: SwapBuildResponse;
  submit: SwapSubmitResponse;
  landed?: TxEventPayload;
}

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOn?: number[];
}
