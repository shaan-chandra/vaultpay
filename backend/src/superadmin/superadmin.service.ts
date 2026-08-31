import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService} from '@nestjs/jwt';
import { FraudDecision, MerchantStatus, PaymentStatus } from '@prisma/client';
import { FraudAlertQueryDto, OverviewRange } from '../dto/superadmin-query.dto';

function rangeStart(range: OverviewRange): Date | null {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
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
            throw new UnauthorizedException("Email or password is incorrect")
        }
        const valid = await bcrypt.compare(password, admin.password)
        if (!valid) { 
            throw new UnauthorizedException("Email or password is incorrect")
        }
        // if eveyrthing successful sign jwt session token 
        const token = await this.jwt.signAsync({sub:admin.id, email:admin.email, role: 'superadmin'})
        return {message: "jwt session token: ", token}
    }

    /**
     * Platform-wide money split. Gross is what payers paid; it reconciles exactly as
     * grossVolume = platformCommission + merchantNet across SUCCEEDED payments only.
     */
    async getOverview(range: OverviewRange = 'all') {
        const since = rangeStart(range);
        const dateFilter = since ? { createdAt: { gte: since } } : {};

        const [merchants, succeededByMerchant, countsByStatus] = await Promise.all([
            this.prisma.merchant.findMany({
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
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.payment.groupBy({
                by: ['merchantId'],
                where: { status: PaymentStatus.SUCCEEDED, ...dateFilter },
                _sum: { amountPaid: true, commissionPaise: true, merchantCredit: true },
                _count: { _all: true },
            }),
            this.prisma.payment.groupBy({
                by: ['merchantId', 'status'],
                where: dateFilter,
                _count: { _all: true },
            }),
        ]);

        const moneyByMerchant = new Map(succeededByMerchant.map((r) => [r.merchantId, r]));
        const statusCounts = new Map<string, Record<PaymentStatus, number>>();
        for (const row of countsByStatus) {
            const entry = statusCounts.get(row.merchantId) ?? {
                [PaymentStatus.PENDING]: 0,
                [PaymentStatus.SUCCEEDED]: 0,
                [PaymentStatus.FAILED]: 0,
                [PaymentStatus.BLOCKED]: 0,
            };
            entry[row.status] = row._count._all;
            statusCounts.set(row.merchantId, entry);
        }

        const rows = merchants.map((m) => {
            const money = moneyByMerchant.get(m.id);
            const counts = statusCounts.get(m.id);
            const grossVolume = money?._sum.amountPaid ?? 0;
            const platformCommission = money?._sum.commissionPaise ?? 0;
            const merchantNet = money?._sum.merchantCredit ?? 0;
            const succeededCount = counts?.[PaymentStatus.SUCCEEDED] ?? 0;
            const failedCount = counts?.[PaymentStatus.FAILED] ?? 0;
            const blockedCount = counts?.[PaymentStatus.BLOCKED] ?? 0;
            const attemptCount = succeededCount + failedCount + blockedCount;

            return {
                ...m,
                commissionPercent: m.commissionPercent / 100,
                grossVolume,
                platformCommission,
                merchantNet,
                succeededCount,
                failedCount,
                blockedCount,
                attemptCount,
                blockedRate: attemptCount === 0 ? 0 : blockedCount / attemptCount,
            };
        });

        const sum = (pick: (r: (typeof rows)[number]) => number) =>
            rows.reduce((acc, r) => acc + pick(r), 0);

        return {
            range,
            totals: {
                merchantCount: rows.length,
                activeMerchants: rows.filter((r) => r.status === MerchantStatus.ACTIVE).length,
                underReviewMerchants: rows.filter((r) => r.status === MerchantStatus.UNDER_REVIEW).length,
                blockedMerchants: rows.filter((r) => r.status === MerchantStatus.BLOCKED).length,
                grossVolume: sum((r) => r.grossVolume),
                platformCommission: sum((r) => r.platformCommission),
                merchantNet: sum((r) => r.merchantNet),
                merchantBalance: sum((r) => r.balance),
                succeededCount: sum((r) => r.succeededCount),
                failedCount: sum((r) => r.failedCount),
                blockedCount: sum((r) => r.blockedCount),
                attemptCount: sum((r) => r.attemptCount),
            },
            merchants: rows,
        };
    }

    async getMerchantDetail(merchantId: string) {
        const merchant = await this.prisma.merchant.findUnique({
            where: { id: merchantId },
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
            },
        });
        if (!merchant) throw new NotFoundException('Merchant not found');

        const [money, countsByStatus, fraudByDecision, recentPayments, statusEvents] =
            await Promise.all([
                this.prisma.payment.aggregate({
                    where: { merchantId, status: PaymentStatus.SUCCEEDED },
                    _sum: { amountPaid: true, commissionPaise: true, merchantCredit: true },
                }),
                this.prisma.payment.groupBy({
                    by: ['status'],
                    where: { merchantId },
                    _count: { _all: true },
                }),
                this.prisma.fraudScore.groupBy({
                    by: ['decision'],
                    where: { payment: { merchantId } },
                    _count: { _all: true },
                }),
                this.prisma.payment.findMany({
                    where: { merchantId },
                    orderBy: { createdAt: 'desc' },
                    take: 15,
                    select: {
                        id: true,
                        amountPaid: true,
                        commissionPaise: true,
                        merchantCredit: true,
                        status: true,
                        payerEmail: true,
                        cardLast4: true,
                        createdAt: true,
                        fraudScore: { select: { score: true, decision: true, reasons: true } },
                    },
                }),
                this.prisma.merchantStatusEvent.findMany({
                    where: { merchantId },
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                }),
            ]);

        const counts = Object.fromEntries(
            countsByStatus.map((r) => [r.status, r._count._all]),
        ) as Partial<Record<PaymentStatus, number>>;
        const fraudCounts = Object.fromEntries(
            fraudByDecision.map((r) => [r.decision, r._count._all]),
        ) as Partial<Record<FraudDecision, number>>;

        const succeededCount = counts[PaymentStatus.SUCCEEDED] ?? 0;
        const failedCount = counts[PaymentStatus.FAILED] ?? 0;
        const blockedCount = counts[PaymentStatus.BLOCKED] ?? 0;
        const attemptCount = succeededCount + failedCount + blockedCount;

        return {
            merchant: { ...merchant, commissionPercent: merchant.commissionPercent / 100 },
            money: {
                grossVolume: money._sum.amountPaid ?? 0,
                platformCommission: money._sum.commissionPaise ?? 0,
                merchantNet: money._sum.merchantCredit ?? 0,
                balance: merchant.balance,
            },
            activity: {
                succeededCount,
                failedCount,
                blockedCount,
                attemptCount,
                blockedRate: attemptCount === 0 ? 0 : blockedCount / attemptCount,
            },
            fraud: {
                allow: fraudCounts[FraudDecision.ALLOW] ?? 0,
                review: fraudCounts[FraudDecision.REVIEW] ?? 0,
                block: fraudCounts[FraudDecision.BLOCK] ?? 0,
            },
            recentPayments,
            statusEvents,
        };
    }

    async listFraudAlerts(query: FraudAlertQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        const where = {
            decision: query.decision ?? { in: [FraudDecision.REVIEW, FraudDecision.BLOCK] },
            ...(query.merchantId ? { payment: { merchantId: query.merchantId } } : {}),
        };

        const [alerts, total] = await Promise.all([
            this.prisma.fraudScore.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    score: true,
                    decision: true,
                    reasons: true,
                    createdAt: true,
                    payment: {
                        select: {
                            id: true,
                            amountPaid: true,
                            status: true,
                            payerEmail: true,
                            cardLast4: true,
                            createdAt: true,
                            merchant: {
                                select: { id: true, name: true, company: true, status: true },
                            },
                        },
                    },
                },
            }),
            this.prisma.fraudScore.count({ where }),
        ]);

        return {
            data: alerts,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
}
