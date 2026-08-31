import { Injectable, BadRequestException, NotFoundException, GoneException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentLinkDto } from '../dto/payment-link.dto';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentLinkType, PaymentStatus, FraudDecision, MerchantStatus, Prisma } from '@prisma/client';
import {PaymentListQueryDto } from "../dto/payment-list-query.dto"
import { FraudService } from '../fraud/fraud.service';
import { MockProcessorService } from '../processor/mock-processor.service';
import { fingerprintPan, last4, normalizePan } from '../processor/card.util';

function suspendedMessage(status: MerchantStatus, reason: string | null): string {
  const base =
    status === MerchantStatus.BLOCKED
      ? 'This merchant account is blocked'
      : 'This merchant account is under review and cannot accept new payments';
  return reason ? `${base}: ${reason}` : base;
}

@Injectable()
export class PaymentLinksService {
  constructor(private readonly prisma: PrismaService,
              private readonly fraud: FraudService,
              private readonly processor: MockProcessorService,
  ) {}

  async create(merchantId: string, dto: CreatePaymentLinkDto) {
    // TODO 1: FIXED without amount → BadRequestException
    // Hint: if (dto.type === PaymentLinkType.FIXED && dto.amount == null)

    // TODO 2: OPEN with amount → BadRequestException
    // Hint: if (dto.type === PaymentLinkType.OPEN && dto.amount != null)

    // TODO 3: create and return the row
    // return this.prisma.paymentLink.create({
    //   data: {
    //     type: dto.type,
    //     amount: dto.amount,
    //     description: dto.description,
    //     merchantId,
    //   },
    // });
    if (dto.type === PaymentLinkType.FIXED && dto.amount == null) {
        throw new BadRequestException("Amount is required for fixed payment links")
    }
    if (dto.type === PaymentLinkType.OPEN && dto.amount != null) {
        throw new BadRequestException("Amount must not be set for open payment links")
    }
    const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { status: true, statusReason: true },
    })
    if (!merchant) {
        throw new NotFoundException("Merchant not found")
    }
    if (merchant.status !== MerchantStatus.ACTIVE) {
        throw new ForbiddenException(suspendedMessage(merchant.status, merchant.statusReason))
    }
    return this.prisma.paymentLink.create({
        data: {
            type: dto.type, 
            amount: dto.amount, 
            description: dto.description, 
            merchantId
        }
    })
  }
  async findPublic(id: string) {
    const user = await this.prisma.paymentLink.findUnique({
        where: {id},
        select: {
            id: true,
            type: true,
            amount: true,
            description: true, 
            active: true,
            merchant: {
                select: {
                    name: true,
                    company: true,
                    status: true,
                },
            },
        },
    })
    if (user == null) {
        throw new NotFoundException("user not found!")
    }
    if (user.active === false) {
        throw new GoneException("payment link is no more active")
    }
    // Suspended merchants must not be able to collect through links created earlier.
    if (user.merchant.status !== MerchantStatus.ACTIVE) {
        throw new GoneException("This payment link is no longer accepting payments")
    }
    const {active, merchant, ...res} = user;
    return { ...res, merchant: { name: merchant.name, company: merchant.company } }
    
  }
  async createPayment(dto: CreatePaymentDto) {
  const now = new Date();

  const findLink = await this.prisma.paymentLink.findUnique({
    where: { id: dto.paymentLinkId },
    include: { merchant: true },
  });

  if (!findLink) throw new NotFoundException('Payment Link not found!');
  if (!findLink.active) throw new GoneException('This payment link is no longer active');
  if (findLink.merchant.status !== MerchantStatus.ACTIVE) {
    throw new ForbiddenException('This merchant is not currently able to accept payments');
  }

  let amountPaid: number;
  if (findLink.type === PaymentLinkType.FIXED) {
    amountPaid = findLink.amount!;
  } else {
    if (dto.amount == null) {
      throw new BadRequestException('Amount is required for open payment links');
    }
    amountPaid = dto.amount;
  }

  // card intake — `pan` never leaves this function
  const pan = normalizePan(dto.cardNumber);
  const cardFingerprint = fingerprintPan(pan);
  const cardLast4 = last4(pan);

  // 1. score (reads only, before the transaction)
  const verdict = await this.fraud.evaluate({
    merchantId: findLink.merchantId,
    paymentLinkId: findLink.id,
    amountPaise: amountPaid,
    cardFingerprint,
    payerEmail: dto.payerEmail,
    now,
  });

  // 2. processor — skipped entirely on BLOCK
  let status: PaymentStatus;
  let processorRef: string | null = null;

  if (verdict.decision === FraudDecision.BLOCK) {
    status = PaymentStatus.BLOCKED;
  } else {
    const auth = await this.processor.authorize({ pan, amountPaise: amountPaid });
    status = auth.approved ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;
    if (auth.approved) processorRef = auth.processorRef;
  }

  const succeeded = status === PaymentStatus.SUCCEEDED;

  const commissionPaise = succeeded
    ? Math.floor((amountPaid * findLink.merchant.commissionPercent) / 10000)
    : 0;
  const merchantCredit = succeeded ? amountPaid - commissionPaise : 0;

  // 3. every write in one transaction
  return this.prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        paymentLinkId: findLink.id,
        merchantId: findLink.merchantId,
        amountPaid,
        commissionPaise,
        merchantCredit,
        status,
        payerEmail: dto.payerEmail,
        cardFingerprint,
        cardLast4,
        processorRef,
        createdAt: now,
      },
    });

    await tx.fraudScore.create({
      data: {
        paymentId: payment.id,
        score: verdict.score,
        decision: verdict.decision,
        reasons: verdict.reasons as unknown as Prisma.InputJsonValue,
        createdAt: now,
      },
    });

    if (succeeded) {
      await tx.merchant.update({
        where: { id: findLink.merchantId },
        data: { balance: { increment: merchantCredit } },
      });
    }

    return payment;
  });
}
async listForMerchant(merchantId: string, query: PaymentListQueryDto) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const payments = await this.prisma.payment.findMany({
    where: { merchantId },
    orderBy: {createdAt: 'desc'},
    skip,
    take: limit, 
    select: {
      id: true,
    amountPaid: true,
    commissionPaise: true,
    merchantCredit: true,
    status: true,
    payerEmail: true,
    createdAt: true,
    paymentLink: {
      select: {
        id: true,
        description: true,
        type: true,
      },
    },
    fraudScore: { select: { score: true, decision: true, reasons: true } },
    }
  })

  const total = await this.prisma.payment.count({where: {merchantId}})

  return {
    data: payments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}
}