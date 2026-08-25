import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { PaymentLinksService } from './payment-links.service';
import { PaymentListQueryDto } from '../dto/payment-list-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('merchant/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('merchant')
export class MerchantPaymentsController {
  constructor(private readonly paymentLinksService: PaymentLinksService) {}

  @Get()
  list(@Req() req: any, @Query() query: PaymentListQueryDto) {
    const merchantId = req.user.sub;
    return this.paymentLinksService.listForMerchant(merchantId, query);
  }
}