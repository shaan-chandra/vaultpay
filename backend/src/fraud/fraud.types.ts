import { FraudDecision } from '@prisma/client';

export interface FraudContext {
  merchantId: string;
  paymentLinkId: string;
  amountPaise: number;
  cardFingerprint: string;
  payerEmail?: string | null;
  now: Date;
}

export interface RuleResult {
  rule: string;
  score: number;
  reason: string;
  meta?: Record<string, unknown>;
  degraded?: boolean;
}

export interface FraudRule {
  readonly name: string;
  readonly maxScore: number;
  evaluate(ctx: FraudContext): Promise<RuleResult>;
}

export interface FraudEvaluation {
  score: number;
  decision: FraudDecision;
  reasons: RuleResult[];
}

export const FRAUD_RULES = Symbol('FRAUD_RULES');