import { VenumApiError, isAbortError } from './errors.js';

export interface SseRawMessage {
  event: string;
  data: unknown;
}

export interface SseIteratorOptions {
  signal?: AbortSignal;
  reconnectDelayMs?: number;
  onError?: (error: string) => void;
}

export type SseEventHandler = (event: string, data: unknown) => void;

export interface SseStreamOptions extends SseIteratorOptions {
  onEvent: SseEventHandler;
}

export async function* iterateSseStream(
  url: string,
  headers: Record<string, string>,
  options: SseIteratorOptions,
  fetchImpl: typeof globalThis.fetch,
): AsyncGenerator<SseRawMessage, void, void> {
  const reconnectDelay = options.reconnectDelayMs ?? 3000;
  const shouldReconnect = reconnectDelay > 0;

  while (!options.signal?.aborted) {
    try {
      const resp = await fetchImpl(url, {
        headers,
        signal: options.signal,
      });
      if (!resp.ok || !resp.body) {
        throw new VenumApiError(resp.status, await resp.text().catch(() => ''));
      }
      yield* readSseBody(resp.body, options.signal);
    } catch (error) {
      if (isAbortError(error) || options.signal?.aborted) return;
      options.onError?.(formatError(url, error));
    }

    if (!shouldReconnect) return;
    const slept = await sleep(reconnectDelay, options.signal);
    if (!slept) return;
  }
}

export async function consumeSseStream(
  url: string,
  headers: Record<string, string>,
  options: SseStreamOptions,
  fetchImpl: typeof globalThis.fetch,
): Promise<void> {
  for await (const msg of iterateSseStream(url, headers, options, fetchImpl)) {
    options.onEvent(msg.event, msg.data);
  }
}

async function* readSseBody(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<SseRawMessage, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventType = '';

  try {
    while (!signal?.aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ') && eventType) {
          const payload = line.slice(6);
          let data: unknown;
          try {
            data = JSON.parse(payload);
          } catch {
            data = payload;
          }
          yield { event: eventType, data };
          eventType = '';
        } else if (line === '') {
          eventType = '';
        }
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<boolean> {
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

function formatError(url: string, error: unknown): string {
  if (error instanceof VenumApiError) {
    return `Venum API ${error.status} on ${url}: ${error.body.slice(0, 300)}`;
  }
  if (error instanceof Error) {
    return `Network error on ${url}: ${error.message}`;
  }
  return `Network error on ${url}: ${String(error)}`;
}
