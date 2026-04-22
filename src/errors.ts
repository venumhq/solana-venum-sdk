/**
 * Thrown when the API returns a non-2xx response.
 *
 * Inspect `status` to decide how to react:
 * - `401`: invalid / missing API key — prompt the user to authenticate.
 * - `403`: API key lacks access to this endpoint — prompt to upgrade plan.
 * - `429`: rate-limited; `body` may contain retry guidance, and the `Retry-After`
 *          header is honored automatically when retry is enabled.
 */
export class VenumApiError extends Error {
  constructor(public readonly status: number, public readonly body: string) {
    super(`Venum API ${status}: ${body.slice(0, 300)}`);
    this.name = 'VenumApiError';
  }
}

/** Thrown when the HTTP request never reached the API (DNS, TLS, socket, timeout). */
export class VenumNetworkError extends Error {
  constructor(public readonly url: string, public readonly cause: unknown) {
    super(describeNetworkError(url, cause));
    this.name = 'VenumNetworkError';
  }
}

/** Thrown when `waitForTx` exits its SSE connection without seeing a terminal event. */
export class VenumStreamClosedError extends Error {
  constructor(message = 'SSE stream closed before terminal event') {
    super(message);
    this.name = 'VenumStreamClosedError';
  }
}

function describeNetworkError(url: string, error: unknown): string {
  const detail = extractDetail(error);
  return `Network error: could not reach ${url}.${detail ? ` ${detail}` : ''}`;
}

function extractDetail(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const rec = error as { code?: unknown; message?: unknown };
  const code = typeof rec.code === 'string' ? rec.code : undefined;
  const message = typeof rec.message === 'string' ? rec.message : undefined;
  if (code && message) return `(${code}: ${message})`;
  if (code) return `(${code})`;
  if (message) return `(${message})`;
  return undefined;
}

/** Returns true if the given value is an `AbortError` (from `AbortSignal` / `AbortController`). */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = (error as { name?: unknown }).name;
  return name === 'AbortError';
}
