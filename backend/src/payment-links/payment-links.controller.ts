import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param
} from '@nestjs/common';
import { PaymentLinksService } from './payment-links.service';
import { CreatePaymentLinkDto } from '../dto/payment-link.dto'; // adjust to your path
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('merchant/payment-links')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('merchant')
export class PaymentLinksController {
  constructor(private readonly paymentLinksService: PaymentLinksService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreatePaymentLinkDto){
    const merchantId = req.user.sub;
    return this.paymentLinksService.create(merchantId, dto)
  }
  
}