import { IsUUID, IsInt, IsOptional, IsEmail, Min, Max } from 'class-validator';

export class CreatePaymentDto {
    @IsUUID()
    paymentLinkId! : string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(10_000_000)
    amount? : number 

    @IsOptional()
    @IsEmail()
    payerEmail? : string
}