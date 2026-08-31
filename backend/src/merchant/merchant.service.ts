import { Injectable, ConflictException, NotFoundException, UnauthorizedException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";  // adjust path
import * as bcrypt from "bcrypt";
import { JwtService} from '@nestjs/jwt';
import { MerchantStatus } from "@prisma/client";

@Injectable()
export class MerchantService {
  constructor(private prisma: PrismaService,
              private jwt: JwtService,
  ) {}

  async create(data: {
    name: string;
    email: string;
    password: string;
    company: string;
    contact: string;
    commissionPercent: number;
  }) {
    // YOUR CODE HERE
    // 1. Check if a merchant with this email already exists → throw ConflictException if yes
    // 2. Hash the password with bcrypt (10 salt rounds)
    // 3. Convert commissionPercent to basis points (× 100, use Math.round)
    // 4. Create the merchant in DB with prisma.merchant.create
    // 5. Strip the password field before returning
    const check_email = await this.prisma.merchant.findUnique({where: {email: data.email}})
    if (check_email) {
      throw new ConflictException("Merchant with this email already exists")
    }
    const hash_password = await bcrypt.hash(data.password, 10)
    const commission = Math.round(data.commissionPercent * 100)
    const newRecord = await this.prisma.merchant.create({
      data : {
        name: data.name,
        email: data.email,
        password: hash_password,
        company: data.company,
        contact: data.contact,
        commissionPercent: commission
      }
    })
    const {password, ...res} = newRecord
    return res
  }
  async getMerchants() {
    const merchants = await this.prisma.merchant.findMany({
      select: {
        id: true, 
        name: true, 
        email: true, 
        company: true,
        contact: true,
        balance: true, 
        commissionPercent: true, 
        status: true,
        statusReason: true,
        statusUpdatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {createdAt: "desc"}
    }
    )
    return merchants.map(m => ({...m, commissionPercent : m.commissionPercent / 100}));
  }
  async merchantLogin(email, password) {
    const merchant = await this.prisma.merchant.findUnique({where: {email }})
    if (!merchant) {
      throw new UnauthorizedException("Email or password is incorrect")
    }
    const valid_password = await bcrypt.compare(password, merchant.password)
    if (!valid_password) {
      throw new UnauthorizedException("Email or password is incorrect")
    }
    if (merchant.status === MerchantStatus.BLOCKED) {
      throw new ForbiddenException(
        merchant.statusReason
          ? `Account blocked: ${merchant.statusReason}`
          : 'This merchant account has been blocked. Contact support.',
      )
    }
    // create jwt session token for merchant
    const token = await this.jwt.signAsync({sub: merchant.id, email: merchant.email, role: 'merchant'})
    return {message: "token: ", token, status: merchant.status}
  }

  async updateStatus(
    merchantId: string,
    actorId: string,
    data: { status: MerchantStatus; reason: string },
  ) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, status: true },
    });
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }
    if (merchant.status === data.status) {
      throw new BadRequestException(`Merchant is already ${data.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.merchant.update({
        where: { id: merchantId },
        data: {
          status: data.status,
          // A reactivation should not leave the old block reason lingering on the record.
          statusReason: data.status === MerchantStatus.ACTIVE ? null : data.reason,
          statusUpdatedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          status: true,
          statusReason: true,
          statusUpdatedAt: true,
        },
      });

      await tx.merchantStatusEvent.create({
        data: {
          merchantId,
          fromStatus: merchant.status,
          toStatus: data.status,
          reason: data.reason,
          actorId,
        },
      });

      return updated;
    });
  }
}