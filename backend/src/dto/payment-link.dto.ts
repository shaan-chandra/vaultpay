import {IsEnum, IsInt, IsOptional, Min, IsString, MaxLength} from "class-validator"
import {PaymentLinkType} from "@prisma/client"
export class CreatePaymentLinkDto{
    @IsEnum(PaymentLinkType)
    type!: PaymentLinkType;

    @IsOptional()
    @IsInt()
    @Min(1)
    amount? : number;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    description? : string

}