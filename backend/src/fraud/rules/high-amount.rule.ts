import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { bandScore, HIGH_AMOUNT } from '../fraud.config';
import { FraudContext, FraudRule, RuleResult } from '../fraud.types';

@Injectable()
export class HighAmountRule implements FraudRule {
  readonly name = 'high_amount';
  readonly maxScore = HIGH_AMOUNT.max;

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(ctx: FraudContext): Promise<RuleResult> {
    // TODO 1: window start
    //   const since = new Date(ctx.now.getTime() - HIGH_AMOUNT.lookbackDays * 24 * 60 * 60 * 1000);
    //   ctx.now, never new Date() — same determinism reason as the counter.
    const since = new Date(ctx.now.getTime() - HIGH_AMOUNT.lookbackDays * 24 * 60 * 60 * 1000);

    // TODO 2: aggregate
    //   const agg = await this.prisma.payment.aggregate({
    //     where: { merchantId: ctx.merchantId,
    //              status: PaymentStatus.SUCCEEDED,
    //              createdAt: { gte: since, lte: ctx.now } },
    //     _avg: { amountPaid: true },
    //     _count: { _all: true },
    //   });
    const aggregate = await this.prisma.payment.aggregate({
        where: { merchantId: ctx.merchantId, 
            status: PaymentStatus.SUCCEEDED, 
            createdAt: { gte: since, lte: ctx.now } },
            _avg: { amountPaid: true },
            _count: { _all: true}, 
        }
    );
    //
    //   SUCCEEDED only. If declines counted toward the baseline, a fraudster
    //   could pad it with failed attempts, then walk a large charge through.

    // TODO 3: unpack
    //   const priorCount = agg._count._all;
    //   const average = agg._avg.amountPaid ?? 0;   // avg over zero rows is null
    const priorCount = aggregate._count._all; 
    const average = aggregate._avg.amountPaid ?? 0;

    // TODO 4: cold-start guard, return early
    //   if (priorCount < HIGH_AMOUNT.minHistory || average <= 0) {
    //     return { rule: this.name, score: 0,
    //              reason: `Only ${priorCount} successful payment(s) in 30 days — not enough history`,
    //              meta: { priorCount, average, ratio: null } };
    //   }
    //   A mean over 2 payments is noise. Also guards division by zero.
    if (priorCount < HIGH_AMOUNT.minHistory || average <= 0) {
        return { rule: this.name, score: 0, 
            reason: `Only ${priorCount} successful payment(s) in 30 days — not enough history`,
          meta: { priorCount, average, ratio: null } };
        }

    // TODO 5: const ratio = ctx.amountPaise / average;
    //         const score = bandScore(ratio, HIGH_AMOUNT.bands)
    const ratio = ctx.amountPaise / average;
    const score = bandScore(ratio, HIGH_AMOUNT.bands)

    // TODO 6: return
    //   reason — ternary on score === 0, mention ratio.toFixed(2)
    //   meta — { priorCount, averagePaise: Math.round(average),
    //            amountPaise: ctx.amountPaise, ratio: Number(ratio.toFixed(4)) }
    return {
        rule: this.name,
        score,
        reason: score === 0
            ? `Amount is ${ratio.toFixed(2)}x the merchant's 30-day average — normal`
            : `Amount is ${ratio.toFixed(2)}x the merchant's 30-day average of ${Math.round(average)} paise`,
        meta: {
            priorCount,
            averagePaise: Math.round(average),
            amountPaise: ctx.amountPaise,
            ratio: Number(ratio.toFixed(4)),
        },
    };
  }
}