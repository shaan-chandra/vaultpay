import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PayerController } from './payer.controller';
import { PayerService } from './payer.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [PayerController],
  providers: [PayerService],
})
export class PayerModule {}