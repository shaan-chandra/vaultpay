import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SuperadminModule } from './superadmin/superadmin.module';
import {PrismaModule} from "./prisma/prisma.module";
import { ConfigModule } from '@nestjs/config';
import { MerchantModule } from './merchant/merchant.module';
import { PaymentLinksModule } from './payment-links/payment-links.module';
import { PayerModule } from './payer/payer.module';
import { FraudModule } from './fraud/fraud.module';
import { ProcessorModule } from './processor/processor.module';

@Module({
  imports: [ConfigModule.forRoot({isGlobal:true}), SuperadminModule, PrismaModule, MerchantModule, PaymentLinksModule, PayerModule, FraudModule, ProcessorModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
