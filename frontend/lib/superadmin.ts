export const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type MerchantStatus = 'ACTIVE' | 'UNDER_REVIEW' | 'BLOCKED'
export type FraudDecision = 'ALLOW' | 'REVIEW' | 'BLOCK'
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'BLOCKED'
export type OverviewRange = '7d' | '30d' | 'all'

export type MerchantRow = {
  id: string
  name: string
  email: string
  company: string
  contact: string
  balance: number
  commissionPercent: number
  status: MerchantStatus
  statusReason: string | null
  statusUpdatedAt: string | null
  createdAt: string
  grossVolume: number
  platformCommission: number
  merchantNet: number
  succeededCount: number
  failedCount: number
  blockedCount: number
  attemptCount: number
  blockedRate: number
}

export type Overview = {
  range: OverviewRange
  totals: {
    merchantCount: number
    activeMerchants: number
    underReviewMerchants: number
    blockedMerchants: number
    grossVolume: number
    platformCommission: number
    merchantNet: number
    merchantBalance: number
    succeededCount: number
    failedCount: number
    blockedCount: number
    attemptCount: number
  }
  merchants: MerchantRow[]
}

export type FraudReason = {
  rule: string
  score: number
  reason: string
  meta?: Record<string, unknown>
  degraded?: boolean
}

export type FraudAlert = {
  id: string
  score: number
  decision: FraudDecision
  reasons: FraudReason[]
  createdAt: string
  payment: {
    id: string
    amountPaid: number
    status: PaymentStatus
    payerEmail: string | null
    cardLast4: string | null
    createdAt: string
    merchant: { id: string; name: string; company: string; status: MerchantStatus }
  }
}

export type FraudAlertPage = {
  data: FraudAlert[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export type MerchantDetail = {
  merchant: {
    id: string
    name: string
    email: string
    company: string
    contact: string
    balance: number
    commissionPercent: number
    status: MerchantStatus
    statusReason: string | null
    statusUpdatedAt: string | null
    createdAt: string
  }
  money: {
    grossVolume: number
    platformCommission: number
    merchantNet: number
    balance: number
  }
  activity: {
    succeededCount: number
    failedCount: number
    blockedCount: number
    attemptCount: number
    blockedRate: number
  }
  fraud: { allow: number; review: number; block: number }
  recentPayments: {
    id: string
    amountPaid: number
    commissionPaise: number
    merchantCredit: number
    status: PaymentStatus
    payerEmail: string | null
    cardLast4: string | null
    createdAt: string
    fraudScore: { score: number; decision: FraudDecision; reasons: FraudReason[] } | null
  }[]
  statusEvents: {
    id: string
    fromStatus: MerchantStatus
    toStatus: MerchantStatus
    reason: string
    actorId: string
    createdAt: string
  }[]
}

/** Thrown when the admin's token is rejected, so callers can bounce to the login page. */
export class UnauthorizedError extends Error {}

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('superadmin_token')
  if (!token) throw new UnauthorizedError('No session')

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  })

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('superadmin_token')
    throw new UnauthorizedError('Session expired')
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] }
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message
    throw new Error(message || `Request failed with status ${res.status}`)
  }

  return (await res.json()) as T
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatPercent(pct: number): string {
  return `${pct.toFixed(2)}%`
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const MERCHANT_STATUS_LABEL: Record<MerchantStatus, string> = {
  ACTIVE: 'Active',
  UNDER_REVIEW: 'Under review',
  BLOCKED: 'Blocked',
}

export const MERCHANT_STATUS_CLASS: Record<MerchantStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  UNDER_REVIEW: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  BLOCKED: 'bg-rose-50 text-rose-700 ring-rose-600/20',
}

export const FRAUD_DECISION_CLASS: Record<FraudDecision, string> = {
  ALLOW: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  REVIEW: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  BLOCK: 'bg-rose-50 text-rose-700 ring-rose-600/20',
}

export const PAYMENT_STATUS_CLASS: Record<PaymentStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  SUCCEEDED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  FAILED: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  BLOCKED: 'bg-rose-50 text-rose-700 ring-rose-600/20',
}
