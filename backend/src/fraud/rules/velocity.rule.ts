import { Inject, Injectable } from '@nestjs/common';
import { bandScore, VELOCITY } from '../fraud.config';
import { FraudContext, FraudRule, RuleResult } from '../fraud.types';
import { VELOCITY_COUNTER, VelocityCounter } from '../velocity-counter';

@Injectable()
export class VelocityRule implements FraudRule {
  readonly name = 'velocity';
  readonly maxScore = VELOCITY.max;

  // TODO 1: inject by TOKEN
  //   constructor(@Inject(VELOCITY_COUNTER) private readonly counter: VelocityCounter) {}
  //
  //   @Inject because VelocityCounter is an interface — interfaces don't exist
  //   at runtime, so Nest has nothing to look up. The Symbol is the runtime
  //   handle. This is what lets fraud.module.ts hand you the Hybrid without
  //   this file knowing Redis exists.
  constructor(@Inject(VELOCITY_COUNTER) private readonly counter: VelocityCounter) {}

  async evaluate(ctx: FraudContext): Promise<RuleResult> {
    // TODO 2: const attempts = await this.counter.count(
    //           ctx.merchantId, ctx.cardFingerprint, ctx.now, VELOCITY.windowMs);
    const attempts = await this.counter.count(
        ctx.merchantId, ctx.cardFingerprint, ctx.now, VELOCITY.windowMs
    );

    // TODO 3: const score = bandScore(attempts, VELOCITY.bands);
    const score = bandScore(attempts, VELOCITY.bands);

    // TODO 4: return { rule: this.name, score, reason, meta }
    //   reason — ternary on score === 0:
    //     0  → `${attempts} attempt(s) with this card in the last 10 minutes — normal`
    //     >0 → `${attempts} attempts with this card on this merchant in the last 10 minutes`
    //   meta — { attempts, windowMinutes: VELOCITY.windowMs / 60_000 }
    return { rule: this.name, score, reason: score === 0
    ? `${attempts} attempt(s) with this card in the last 10 minutes — normal`
    : `${attempts} attempts with this card on this merchant in the last 10 minutes`,
    meta: { attempts, windowMinutes: VELOCITY.windowMs / 60_000 },}
    //
    //   meta lands in FraudScore.reasons JSON. Debugging a block in three
    //   weeks, "score: 20" tells you nothing; "attempts: 4" tells you everything.
  }
}