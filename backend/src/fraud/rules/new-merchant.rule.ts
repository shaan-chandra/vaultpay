import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { bandScore, NEW_MERCHANT } from '../fraud.config';
import { FraudContext, FraudRule, RuleResult } from '../fraud.types';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class NewMerchantRule implements FraudRule {
  readonly name = 'new_merchant';
  readonly maxScore = NEW_MERCHANT.max;

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(ctx: FraudContext): Promise<RuleResult> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: ctx.merchantId },
      select: { createdAt: true },
    });
    if (!merchant) throw new Error(`Merchant ${ctx.merchantId} not found`);

    const ageDays = Math.floor((ctx.now.getTime() - merchant.createdAt.getTime()) / DAY_MS);
    const score = bandScore(ageDays, NEW_MERCHANT.bands);

    return {
      rule: this.name,
      score,
      reason: score === 0
        ? `Merchant account is ${ageDays} days old — established`
        : `Merchant account is only ${ageDays} day(s) old`,
      meta: { ageDays, createdAt: merchant.createdAt.toISOString() },
    };
  }
}