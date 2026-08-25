import { Controller , Get, Post, Param, Query, Body} from '@nestjs/common';
import {LoginDto} from "../dto/login.dto"
import {SuperadminService} from "./superadmin.service"

@Controller('superadmin')
export class SuperadminController {
    // superadmin post controller login api
    constructor (private service: SuperadminService) {}
    @Post('/login')
    create(@Body() dto: LoginDto) {
        return this.service.login(dto.email, dto.password)
    }
}
