import { Module } from '@nestjs/common';
import { PaymentLinksController } from './payment-links.controller';
import { PaymentLinksService } from './payment-links.service';
import {AuthModule} from "../auth/auth.module"
import { PublicPaymentLinksController } from './public-payment-links.controller';
import { MerchantPaymentsController } from './merchant-payments.controller';
import { FraudModule } from '../fraud/fraud.module';
import { ProcessorModule } from '../processor/processor.module';

@Module({
  imports: [AuthModule, FraudModule, ProcessorModule],
  controllers: [PaymentLinksController, PublicPaymentLinksController, MerchantPaymentsController],
  providers: [PaymentLinksService]
})
export class PaymentLinksModule {}