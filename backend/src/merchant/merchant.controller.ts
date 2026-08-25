// src/merchant/merchant.controller.ts
import { Body, Controller, Post, Get, UseGuards } from "@nestjs/common";
import { MerchantService } from "./merchant.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("superadmin/merchant")   // ← what URL prefix goes here?
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("superadmin")
export class MerchantController {
  constructor(private service : MerchantService) {}   // ← inject the service (Nest cheatsheet section 5)

  @Post()
  create(@Body() body: any) {
    // ← one line: call the service and return the result
    return this.service.create(body)
  }
  @Get()
  GetMerchant() {
    return this.service.getMerchants()
  }
}