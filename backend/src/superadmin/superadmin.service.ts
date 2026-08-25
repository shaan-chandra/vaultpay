import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService} from '@nestjs/jwt';
// flow of superadmin login-
// Frontend flow- 
    // 1) user writes email and password in frontend 
    // 2) tkae data from frontend and send it to backend
   // Backend flow- 
    // 3) use backend for validation get the email and password
    // 4) use bcrypt to check if password is correct and email and login 
@Injectable()
export class SuperadminService {
    constructor(private prisma: PrismaService,
                private jwt: JwtService,
    ) {}
    // one method login should validate and check if email and password are correct
    // get email and password, check db, and validate password 
    // if everything is good, login 
    // else unauthorized exception
    async login(email: string, password: string) {
        const admin = await this.prisma.superAdmin.findUnique({ where : {email}});
        if (!admin) {
            throw new Error("Invalid email address")
        }
        const valid = await bcrypt.compare(password, admin.password)
        if (!valid) { 
            throw new Error("Password does not match")
        }
        // if eveyrthing successful sign jwt session token 
        const token = await this.jwt.signAsync({sub:admin.id, email:admin.email, role: 'superadmin'})
        return {message: "jwt session token: ", token}
    }
}
