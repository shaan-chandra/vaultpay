import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { PayerSignupDto, PayerLoginDto } from '../dto/payer-auth.dto';

@Injectable()
export class PayerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private sign(payer: { id: string; email: string }) {
    return this.jwt.sign({
      sub: payer.id,
      email: payer.email,
      role: 'payer',
    });
  }

  async signup(dto: PayerSignupDto) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.payer.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    const payer = await this.prisma.payer.create({
      data: { name: dto.name.trim(), email, password: hashed },
      select: { id: true, name: true, email: true },
    });

    return { token: this.sign(payer), payer };
  }

  async login(dto: PayerLoginDto) {
    const email = dto.email.toLowerCase().trim();

    const payer = await this.prisma.payer.findUnique({ where: { email } });
    if (!payer) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    const ok = await bcrypt.compare(dto.password, payer.password);
    if (!ok) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    return {
      token: this.sign(payer),
      payer: { id: payer.id, name: payer.name, email: payer.email },
    };
  }

  async listPayments(payerId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { payerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amountPaid: true,
        status: true,
        createdAt: true,
        merchant: { select: { name: true } },
        paymentLink: { select: { description: true } },
      },
    });

    return payments.map((p) => ({
      id: p.id,
      merchantName: p.merchant.name,
      title: p.paymentLink.description ?? '',
      amount: p.amountPaid,
      date: p.createdAt,
      status: p.status,
    }));
  }
}