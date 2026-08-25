import { Injectable, BadRequestException, NotFoundException, GoneException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentLinkDto } from '../dto/payment-link.dto';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentLinkType } from '@prisma/client';
import {PaymentListQueryDto } from "../dto/payment-list-query.dto"

@Injectable()
export class PaymentLinksService {
  constructor(private readonly prisma: PrismaService) {}

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
    const {active, ...res} = user;
    return res 
    
  }
  async createPayment(dto: CreatePaymentDto) {
    const findLink = await this.prisma.paymentLink.findUnique({
        where: {id : dto.paymentLinkId},
        include: {merchant: true}
    })
  // TODO 1: fetch the payment link WITH the merchant
  //   const link = await this.prisma.paymentLink.findUnique({
  //     where: { id: dto.paymentLinkId },
  //     include: { merchant: true },
  //   });
  if (!findLink) {
    throw new NotFoundException("Payment Link not found!")
  }

  if (!findLink.active) {
    throw new GoneException("This payment link is no longer active")
  }

  // TODO 2: existence check
  //   if (!link) throw new NotFoundException('Payment link not found');

  // TODO 3: active check
  //   if (!link.active) throw new GoneException('This payment link is no longer active');

  // TODO 4: determine amountPaid based on type
  //   let amountPaid: number;
  //   if (link.type === PaymentLinkType.FIXED) {
  //     amountPaid = link.amount!;  // FIXED links guarantee non-null amount by Day 10's business rule
  //   } else {
  //     if (dto.amount == null) throw new BadRequestException('Amount is required for open payment links');
  //     amountPaid = dto.amount;
  //   }
    let amountPaid : number; 
    if (findLink.type === PaymentLinkType.FIXED) {
        amountPaid = findLink.amount!;
    }
    else {
        if(dto.amount == null) {
            throw new BadRequestException("Amount is required for open payment links")
        }
        amountPaid = dto.amount;
    }

  // TODO 5: compute commission and merchant credit
  //   const commissionPaise = Math.floor((amountPaid * link.merchant.commissionPercent) / 10000);
  //   const merchantCredit = amountPaid - commissionPaise;
  const commissionPaise = Math.floor((amountPaid * findLink.merchant.commissionPercent) / 10000)
  const merchantCredit = amountPaid - commissionPaise;

  // TODO 6: THE TRANSACTION — both writes commit together or neither commits
     return this.prisma.$transaction(async (tx) => {
       const payment = await tx.payment.create({
         data: {
           paymentLinkId: findLink.id,
           merchantId: findLink.merchantId,
           amountPaid,
           commissionPaise,
           merchantCredit,
           payerEmail: dto.payerEmail,
           // status defaults to SUCCEEDED via the schema
         },
       });
       await tx.merchant.update({
         where: { id: findLink.merchantId },
         data: { balance: { increment: merchantCredit } },
       });
  
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
    }
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