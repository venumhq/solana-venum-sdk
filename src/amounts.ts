/**
 * Convert a human-readable amount to base units as a string.
 *
 * The Venum API expects amounts in base units (e.g. lamports for SOL) as strings
 * because large token balances exceed `Number.MAX_SAFE_INTEGER`.
 *
 * @param ui       Human amount — number (`1.5`) or decimal string (`"1.5"`).
 * @param decimals Token decimals (e.g. 9 for SOL, 6 for USDC).
 * @returns Base-unit integer as a string (never in scientific notation).
 * @throws If the input has more fractional digits than `decimals` (string form only).
 *
 * @example
 * toBaseUnits(1.5, 9)       // => "1500000000"
 * toBaseUnits("0.000001", 9) // => "1000"
 * toBaseUnits(100, 6)        // => "100000000"
 */
export function toBaseUnits(ui: number | string, decimals: number): string {
  if (decimals < 0 || !Number.isInteger(decimals)) {
    throw new Error(`Invalid decimals: ${decimals}`);
  }
  const raw = typeof ui === 'number' ? ui.toFixed(decimals) : String(ui).trim();
  if (!/^-?\d+(\.\d+)?$/.test(raw)) {
    throw new Error(`Invalid amount: ${ui}. Expected a decimal number or string.`);
  }
  const negative = raw.startsWith('-');
  const body = negative ? raw.slice(1) : raw;
  const [intPart, fracRaw = ''] = body.split('.');
  if (fracRaw.length > decimals) {
    throw new Error(`Amount ${ui} exceeds ${decimals} decimals of precision`);
  }
  const frac = fracRaw.padEnd(decimals, '0');
  const combined = `${intPart}${frac}`.replace(/^0+/, '') || '0';
  return negative && combined !== '0' ? `-${combined}` : combined;
}

/**
 * Convert a base-unit amount to a human `number`.
 *
 * Loses precision for balances above ~9 million tokens at 9 decimals
 * (`2^53 / 1e9`). Use {@link fromBaseUnitsString} when exactness matters.
 */
export function fromBaseUnits(raw: string | bigint, decimals: number): number {
  return Number(fromBaseUnitsString(raw, decimals));
}

/**
 * Convert a base-unit amount to a precise decimal string (no precision loss).
 *
 * @example
 * fromBaseUnitsString("1500000000", 9) // => "1.5"
 * fromBaseUnitsString(1_000n, 9)       // => "0.000001"
 */
export function fromBaseUnitsString(raw: string | bigint, decimals: number): string {
  if (decimals < 0 || !Number.isInteger(decimals)) {
    throw new Error(`Invalid decimals: ${decimals}`);
  }
  const bi = typeof raw === 'bigint' ? raw : BigInt(raw);
  const negative = bi < 0n;
  const abs = negative ? -bi : bi;
  if (decimals === 0) {
    return negative ? `-${abs.toString()}` : abs.toString();
  }
  const divisor = 10n ** BigInt(decimals);
  const int = abs / divisor;
  const frac = abs % divisor;
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  const body = fracStr.length > 0 ? `${int}.${fracStr}` : int.toString();
  return negative ? `-${body}` : body;
}

/** Convert lamports (9 decimals) to SOL as a `number`. */
export function lamportsToSol(lamports: string | bigint | number): number {
  return fromBaseUnits(typeof lamports === 'number' ? BigInt(lamports) : lamports, 9);
}

/** Convert SOL (as number or decimal string) to lamports as a base-unit string. */
export function solToLamports(sol: number | string): string {
  return toBaseUnits(sol, 9);
}
