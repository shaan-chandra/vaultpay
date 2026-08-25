export interface Band {
  readonly upTo: number | null;
  readonly score: number;
}

export function bandScore(value: number, bands: readonly Band[]): number {
  for (const band of bands) {
    if (band.upTo === null || value <= band.upTo) return band.score;
  }
  return 0;
}

export const FRAUD_THRESHOLDS = { review: 30, block: 50 } as const;
export const RULE_TIMEOUT_MS = 200;

export const VELOCITY = {
  max: 30,
  windowMs: 10 * 60 * 1000,
  bands: [
    { upTo: 2, score: 0 },
    { upTo: 3, score: 10 },
    { upTo: 5, score: 20 },
    { upTo: null, score: 30 },
  ] as const satisfies readonly Band[],
} as const;

export const HIGH_AMOUNT = {
  max: 25,
  lookbackDays: 30,
  minHistory: 5,
  bands: [
    { upTo: 2, score: 0 },
    { upTo: 3, score: 10 },
    { upTo: 5, score: 18 },
    { upTo: null, score: 25 },
  ] as const satisfies readonly Band[],
} as const;

export const NEW_MERCHANT = {
  max: 15,
  bands: [
    { upTo: 2, score: 15 },
    { upTo: 7, score: 10 },
    { upTo: 30, score: 5 },
    { upTo: null, score: 0 },
  ] as const satisfies readonly Band[],
} as const;

export const MAX_TOTAL_SCORE = VELOCITY.max + HIGH_AMOUNT.max + NEW_MERCHANT.max;

export function assertFraudConfigInvariants(): void {
  const maxSingle = Math.max(VELOCITY.max, HIGH_AMOUNT.max, NEW_MERCHANT.max);
  if (maxSingle >= FRAUD_THRESHOLDS.block) {
    throw new Error(`A single rule can reach ${maxSingle}, which alone triggers BLOCK.`);
  }
  if (FRAUD_THRESHOLDS.review >= FRAUD_THRESHOLDS.block) {
    throw new Error('review threshold >= block threshold');
  }
}