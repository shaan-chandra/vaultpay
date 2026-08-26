import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FraudDecision } from '@prisma/client';
import {
  assertFraudConfigInvariants, FRAUD_THRESHOLDS, MAX_TOTAL_SCORE, RULE_TIMEOUT_MS,
} from './fraud.config';
import { FRAUD_RULES, FraudContext, FraudEvaluation, FraudRule, RuleResult } from './fraud.types';
import { VELOCITY_COUNTER, VelocityCounter } from './velocity-counter';

// TODO 1: module-level helper — a plain function, ABOVE the class, not a method
//   function withTimeout<T>(promise: Promise<T>, ms: number, rule: string): Promise<T> {
//     let timer: NodeJS.Timeout;
//     const timeout = new Promise<never>((_, reject) => {
//       timer = setTimeout(() => reject(new Error(`Rule "${rule}" exceeded ${ms}ms`)), ms);
//     });
//     return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
//   }
function withTimeout<T>(promise: Promise<T>, ms: number, rule: string): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Rule "${rule}" exceeded ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
//
//   Promise.race settles with whichever finishes first — the rule or the timer.
//   .finally(clearTimeout) is NOT optional: without it a rule finishing in 5ms
//   still leaves a live timer holding the event loop open for the full 200ms,
//   so every request takes 200ms minimum.

@Injectable()
export class FraudService implements OnModuleInit {
  private readonly logger = new Logger(FraudService.name);

  constructor(
    @Inject(FRAUD_RULES) private readonly rules: FraudRule[],
    @Inject(VELOCITY_COUNTER) private readonly velocityCounter: VelocityCounter,
  ) {}

  // TODO 2: onModuleInit(): void { assertFraudConfigInvariants(); }
  //   Runs once at boot. If someone bumps a weight past the block threshold
  //   later, the app refuses to start rather than silently changing character.
  onModuleInit(): void { assertFraudConfigInvariants(); }

  async evaluate(ctx: FraudContext): Promise<FraudEvaluation> {
    // TODO 3: record FIRST
    //   await this.velocityCounter.record(ctx.merchantId, ctx.cardFingerprint, ctx.now);
    //   Before scoring, deliberately: the current attempt counts toward its own
    //   velocity score, and blocked attempts still accrue — otherwise a blocked
    //   attacker gets unlimited free retries.
    await this.velocityCounter.record(ctx.merchantId, ctx.cardFingerprint, ctx.now);

    // TODO 4: run all rules in parallel
    //   const reasons = await Promise.all(this.rules.map((r) => this.runRule(r, ctx)));
    //   Parallel because three sequential queries blow the latency budget.
    //   Safe ONLY because runRule never rejects — Promise.all rejects on the
    //   first failure, so one bad rule would poison the whole batch.
    const reasons = await Promise.all(this.rules.map((r) => this.runRule(r,ctx)));

    // TODO 5: total, clamp, decide
    //   const score = Math.min(reasons.reduce((sum, r) => sum + r.score, 0), MAX_TOTAL_SCORE);
    //   const decision = this.decide(score);
    const score = Math.min(reasons.reduce((sum, r) => sum + r.score, 0), MAX_TOTAL_SCORE);
    const decision = this.decide(score);

    // TODO 6: log non-ALLOW, then return
    //   if (decision !== FraudDecision.ALLOW) {
    //     this.logger.warn(`Fraud ${decision} score=${score} merchant=${ctx.merchantId} ` +
    //       `reasons=${reasons.filter((r) => r.score > 0).map((r) => r.rule).join(',')}`);
    //   }
    //   return { score, decision, reasons };
    if (decision !== FraudDecision.ALLOW) {
      this.logger.warn(
      `Fraud ${decision} score=${score} merchant=${ctx.merchantId} ` +
      `reasons=${reasons.filter((r) => r.score > 0).map((r) => r.rule).join(',')}`,
  );
}
return { score, decision, reasons };
  }

  private decide(score: number): FraudDecision {
    // TODO 7: BLOCK first, then REVIEW, then ALLOW
    //   if (score >= FRAUD_THRESHOLDS.block) return FraudDecision.BLOCK;
    //   ...
    //   Order matters: check the highest first, or a 60 matches REVIEW and
    //   never reaches BLOCK.
    if (score >= FRAUD_THRESHOLDS.block) return FraudDecision.BLOCK;
    if (score >= FRAUD_THRESHOLDS.review) return FraudDecision.REVIEW;
    return FraudDecision.ALLOW;
  }

  private async runRule(rule: FraudRule, ctx: FraudContext): Promise<RuleResult> {
    // TODO 8: try/catch that NEVER rejects
    //   try {
    //     const result = await withTimeout(rule.evaluate(ctx), RULE_TIMEOUT_MS, rule.name);
    //     return { ...result, score: Math.max(0, Math.min(result.score, rule.maxScore)) };
    //   } catch (err) {
    //     this.logger.error(`Rule "${rule.name}" failed: ${err}`);
    //     return { rule: rule.name, score: 0,
    //              reason: 'Rule unavailable — not evaluated', degraded: true };
    //   }
    //
    //   This is the fail-OPEN decision — a deliberate exception to the
    //   fail-closed rule you used in the processor. One flaky query shouldn't
    //   take the whole gateway offline.
    //   degraded: true keeps it honest — the stored JSON distinguishes "clean"
    //   from "we couldn't check".
    //   The clamp means a mis-tuned band can't exceed a rule's budget.
    try {
    const result = await withTimeout(rule.evaluate(ctx), RULE_TIMEOUT_MS, rule.name);
    return { ...result, score: Math.max(0, Math.min(result.score, rule.maxScore)) };
  } catch (err) {
    this.logger.error(`Rule "${rule.name}" failed: ${err}`);
    return {
      rule: rule.name,
      score: 0,
      reason: 'Rule unavailable — not evaluated',
      degraded: true,
    };
  }
  }
}