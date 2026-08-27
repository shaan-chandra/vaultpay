import { IsUUID, IsInt, IsString, IsOptional, IsEmail, Min, Max, Matches } from 'class-validator';

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

    @IsString()
    @Matches(/^[0-9 ]{12,25}$/, { message: 'cardNumber must be a card number' })
    cardNumber!: string;
}