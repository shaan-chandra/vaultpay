import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET, // or however you're doing it in MerchantModule now
      signOptions: { expiresIn: '1d' },
    }),
  ],
  exports: [JwtModule],
})
export class AuthModule {}