import { cn } from '@/lib/utils'
import {
  FRAUD_DECISION_CLASS,
  MERCHANT_STATUS_CLASS,
  MERCHANT_STATUS_LABEL,
  PAYMENT_STATUS_CLASS,
  type FraudDecision,
  type MerchantStatus,
  type PaymentStatus,
} from '@/lib/superadmin'

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function MerchantStatusBadge({ status }: { status: MerchantStatus }) {
  return <Pill className={MERCHANT_STATUS_CLASS[status]}>{MERCHANT_STATUS_LABEL[status]}</Pill>
}

export function FraudDecisionBadge({ decision }: { decision: FraudDecision }) {
  return <Pill className={FRAUD_DECISION_CLASS[decision]}>{decision}</Pill>
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Pill className={PAYMENT_STATUS_CLASS[status]}>{status}</Pill>
}
