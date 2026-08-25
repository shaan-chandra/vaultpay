import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SuperadminController } from './superadmin.controller';
import { SuperadminService } from './superadmin.service';
import {AuthModule} from "../auth/auth.module"

@Module({
  imports: [
    AuthModule
  ],
  controllers: [SuperadminController],
  providers: [SuperadminService],
})
export class SuperadminModule {}