import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SuperadminController } from './superadmin.controller';
import { SuperadminInsightsController } from './superadmin-insights.controller';
import { SuperadminService } from './superadmin.service';
import { MerchantModule } from '../merchant/merchant.module';
import {AuthModule} from "../auth/auth.module"

@Module({
  imports: [
    AuthModule,
    MerchantModule,
  ],
  controllers: [SuperadminController, SuperadminInsightsController],
  providers: [SuperadminService],
})
export class SuperadminModule {}