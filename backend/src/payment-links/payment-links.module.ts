import { Module } from '@nestjs/common';
import { PaymentLinksController } from './payment-links.controller';
import { PaymentLinksService } from './payment-links.service';
import {AuthModule} from "../auth/auth.module"
import { PublicPaymentLinksController } from './public-payment-links.controller';
import { MerchantPaymentsController } from './merchant-payments.controller';

@Module({
  imports: [AuthModule],
  controllers: [PaymentLinksController, PublicPaymentLinksController, MerchantPaymentsController],
  providers: [PaymentLinksService]
})
export class PaymentLinksModule {}
