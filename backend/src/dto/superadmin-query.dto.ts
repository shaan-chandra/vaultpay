import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FraudDecision } from '@prisma/client';

export class FraudAlertQueryDto {
  @IsOptional()
  @IsEnum(FraudDecision)
  decision?: FraudDecision;

  @IsOptional()
  @IsUUID()
  merchantId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export type OverviewRange = '7d' | '30d' | 'all';

export class OverviewQueryDto {
  @IsOptional()
  @IsEnum(['7d', '30d', 'all'])
  range?: OverviewRange = 'all';
}
