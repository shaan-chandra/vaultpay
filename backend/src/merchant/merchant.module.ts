import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MerchantController } from './merchant.controller';
import { MerchantAuthController } from "./merchant-auth.controller"
import { MerchantService } from './merchant.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import {AuthModule} from "../auth/auth.module"

@Module({
  imports: [
    AuthModule
  ],
  controllers: [MerchantController, MerchantAuthController],
  providers: [MerchantService, JwtAuthGuard, RolesGuard],
})
export class MerchantModule {}