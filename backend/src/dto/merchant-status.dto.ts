import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { MerchantStatus } from '@prisma/client';

export class UpdateMerchantStatusDto {
  @IsEnum(MerchantStatus)
  status: MerchantStatus;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
