// src/merchant/merchant-auth.controller.ts
import { Body, Controller, Post } from "@nestjs/common";
import { MerchantService } from "./merchant.service";
import { LoginDto } from "../dto/login.dto";  // ← adjust path to wherever your LoginDto lives

@Controller("merchant")
export class MerchantAuthController {
  constructor(private service: MerchantService) {}   // TODO 1: inject MerchantService

  @Post("/login")   // → POST /merchant/login
  async login(@Body() dto: LoginDto) {
    // TODO 2: call this.service.login(dto.email, dto.password)
    //         it should return { access_token: "..." }
    //         (write the login method in merchant.service.ts if it doesn't exist yet)
    return this.service.merchantLogin(dto.email, dto.password)
    }
}