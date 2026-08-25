import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { PayerService } from './payer.service';
import { PayerSignupDto, PayerLoginDto } from '../dto/payer-auth.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('payer')
export class PayerController {
  constructor(private readonly payerService: PayerService) {}

  @Post('signup')
  signup(@Body() dto: PayerSignupDto) {
    return this.payerService.signup(dto);
  }

  @Post('login')
  login(@Body() dto: PayerLoginDto) {
    return this.payerService.login(dto);
  }

  @Get('payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('payer')
  listPayments(@Req() req: any) {
    return this.payerService.listPayments(req.user.sub);
  }
}