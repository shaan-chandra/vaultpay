import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { PaymentLinksService } from './payment-links.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';


@Controller('public/payment-links')
export class PublicPaymentLinksController {
    constructor(private readonly paymentLinksService: PaymentLinksService) {}

    @Get(":id")
    findPublic(@Param("id") id: string) {
        return this.paymentLinksService.findPublic(id)
    }
    @Post('pay')
    createPayment(@Body() dto: CreatePaymentDto) {
        return this.paymentLinksService.createPayment(dto)
    }
}
