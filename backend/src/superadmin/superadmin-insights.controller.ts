import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SuperadminService } from './superadmin.service';
import { MerchantService } from '../merchant/merchant.service';
import { FraudAlertQueryDto, OverviewQueryDto } from '../dto/superadmin-query.dto';
import { UpdateMerchantStatusDto } from '../dto/merchant-status.dto';

@Controller('superadmin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class SuperadminInsightsController {
  constructor(
    private service: SuperadminService,
    private merchants: MerchantService,
  ) {}

  @Get('overview')
  overview(@Query() query: OverviewQueryDto) {
    return this.service.getOverview(query.range ?? 'all');
  }

  @Get('fraud/alerts')
  fraudAlerts(@Query() query: FraudAlertQueryDto) {
    return this.service.listFraudAlerts(query);
  }

  @Get('merchant/:id')
  merchantDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getMerchantDetail(id);
  }

  @Patch('merchant/:id/status')
  updateMerchantStatus(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMerchantStatusDto,
  ) {
    return this.merchants.updateStatus(id, req.user.sub, dto);
  }
}
