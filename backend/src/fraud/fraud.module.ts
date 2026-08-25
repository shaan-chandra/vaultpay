import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { FraudService } from './fraud.service';
import { FRAUD_RULES } from './fraud.types';
import { VelocityRule } from './rules/velocity.rule';
import { HighAmountRule } from './rules/high-amount.rule';
import { NewMerchantRule } from './rules/new-merchant.rule';
import {
  HybridVelocityCounter, PrismaVelocityCounter, RedisVelocityCounter, VELOCITY_COUNTER,
} from './velocity-counter';

@Module({
  imports: [RedisModule],
  providers: [
    RedisVelocityCounter,
    PrismaVelocityCounter,
    {
      provide: VELOCITY_COUNTER,
      useFactory: (redis: RedisVelocityCounter, db: PrismaVelocityCounter) =>
        new HybridVelocityCounter(redis, db),
      inject: [RedisVelocityCounter, PrismaVelocityCounter],
    },
    VelocityRule,
    HighAmountRule,
    NewMerchantRule,
    {
      provide: FRAUD_RULES,
      useFactory: (v: VelocityRule, h: HighAmountRule, n: NewMerchantRule) => [v, h, n],
      inject: [VelocityRule, HighAmountRule, NewMerchantRule],
    },
    FraudService,
  ],
  exports: [FraudService],
})
export class FraudModule {}