'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, TriangleAlert } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import {
  FraudDecisionBadge,
  MerchantStatusBadge,
  PaymentStatusBadge,
} from '@/components/status-badge'
import { MerchantStatusDialog } from '@/components/merchant-status-dialog'
import { SUPERADMIN_NAV } from '@/lib/nav'
import {
  adminFetch,
  formatDateTime,
  formatMoney,
  formatPercent,
  MERCHANT_STATUS_LABEL,
  UnauthorizedError,
  type MerchantDetail,
  type MerchantStatus,
} from '@/lib/superadmin'

const ACTIONS: { status: MerchantStatus; label: string; className: string }[] = [
  {
    status: 'UNDER_REVIEW',
    label: 'Put under review',
    className: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  {
    status: 'BLOCKED',
    label: 'Block merchant',
    className: 'bg-rose-600 hover:bg-rose-700 text-white',
  },
  {
    status: 'ACTIVE',
    label: 'Reactivate',
    className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
]

export default function MerchantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [detail, setDetail] = useState<MerchantDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingStatus, setPendingStatus] = useState<MerchantStatus | null>(null)
  const router = useRouter()

  const load = useCallback(async () => {
    try {
      setDetail(await adminFetch<MerchantDetail>(`/superadmin/merchant/${id}`))
      setError(null)
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        router.replace('/superadmin/login')
        return
      }
      setError(err instanceof Error ? err.message : 'Could not load this merchant.')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    void load()
  }, [load])

  const merchant = detail?.merchant

  return (
    <AppShell
      role="superadmin"
      portal="Administrator"
      nav={SUPERADMIN_NAV}
      title={merchant?.name ?? 'Merchant'}
      description={merchant ? `${merchant.company} · ${merchant.email}` : undefined}
      actions={
        detail && (
          <div className="flex flex-wrap items-center gap-2">
            {ACTIONS.filter((a) => a.status !== detail.merchant.status).map((a) => (
              <button
                key={a.status}
                onClick={() => setPendingStatus(a.status)}
                className={`cursor-pointer rounded-lg px-3.5 py-2 text-sm shadow-sm whitespace-nowrap ${a.className}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )
      }
    >
      <>
        <Link
          href="/superadmin/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={14} />
          All merchants
        </Link>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
            <Loader2 size={15} className="animate-spin" />
            Loading merchant…
          </div>
        ) : error || !detail ? (
          <div className="flex flex-col items-center rounded-lg border border-slate-200 bg-white px-6 py-14 text-center">
            <TriangleAlert size={20} className="text-amber-600" />
            <p className="mt-3 text-sm text-slate-700">{error ?? 'Merchant not found.'}</p>
            <button
              onClick={() => {
                setLoading(true)
                void load()
              }}
              className="mt-4 cursor-pointer rounded-md border border-slate-300 px-3.5 py-2 text-sm hover:bg-slate-50"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <StatusBanner detail={detail} />
            <MoneyPanel detail={detail} />
            <FraudPanel detail={detail} />
            <RecentPayments detail={detail} />
            <StatusHistory detail={detail} />
          </div>
        )}

        {pendingStatus && detail && (
          <MerchantStatusDialog
            merchantId={detail.merchant.id}
            merchantName={detail.merchant.name}
            currentStatus={detail.merchant.status}
            nextStatus={pendingStatus}
            onClose={() => setPendingStatus(null)}
            onDone={() => {
              setPendingStatus(null)
              setLoading(true)
              void load()
            }}
          />
        )}
      </>
    </AppShell>
  )
}

function StatusBanner({ detail }: { detail: MerchantDetail }) {
  const { merchant } = detail
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-white px-5 py-4">
      <MerchantStatusBadge status={merchant.status} />
      {merchant.statusReason && (
        <span className="text-sm text-slate-700">{merchant.statusReason}</span>
      )}
      {merchant.statusUpdatedAt && (
        <span className="text-xs text-slate-500">
          Changed {formatDateTime(merchant.statusUpdatedAt)}
        </span>
      )}
      <span className="ml-auto text-xs text-slate-500 tabular-nums">
        Commission rate {formatPercent(merchant.commissionPercent)} · onboarded{' '}
        {formatDateTime(merchant.createdAt)}
      </span>
    </div>
  )
}

function MoneyPanel({ detail }: { detail: MerchantDetail }) {
  const { money, activity } = detail
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Money split</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Gross processed" value={formatMoney(money.grossVolume)} />
        <Metric
          label="Platform commission"
          value={formatMoney(money.platformCommission)}
          className="text-indigo-700"
        />
        <Metric
          label="Merchant net"
          value={formatMoney(money.merchantNet)}
          className="text-emerald-700"
        />
        <Metric label="Current balance" value={formatMoney(money.balance)} />
      </div>
      <p className="mt-3 text-xs text-slate-500 tabular-nums">
        {activity.succeededCount} succeeded · {activity.failedCount} failed ·{' '}
        {activity.blockedCount} blocked by fraud engine
      </p>
    </section>
  )
}

function FraudPanel({ detail }: { detail: MerchantDetail }) {
  const { fraud, activity } = detail
  const risky = activity.attemptCount >= 5 && activity.blockedRate >= 0.2

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Fraud signal</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Allowed" value={fraud.allow.toString()} />
        <Metric label="Flagged for review" value={fraud.review.toString()} className="text-amber-700" />
        <Metric label="Blocked" value={fraud.block.toString()} className="text-rose-700" />
        <Metric
          label="Blocked rate"
          value={`${Math.round(activity.blockedRate * 100)}%`}
          className={risky ? 'text-rose-700' : undefined}
        />
      </div>
      {risky && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-rose-600">
          <TriangleAlert size={13} />
          Elevated block rate across {activity.attemptCount} attempts — consider putting this
          merchant under review.
        </p>
      )}
      <Link
        href={`/superadmin/fraud`}
        className="mt-3 inline-block text-xs text-indigo-600 hover:text-indigo-800"
      >
        View all fraud alerts →
      </Link>
    </section>
  )
}

function RecentPayments({ detail }: { detail: MerchantDetail }) {
  if (detail.recentPayments.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent payments</h2>
        <p className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
          No payments yet.
        </p>
      </section>
    )
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent payments</h2>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Payer</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Fraud</th>
              <th className="px-4 py-3 text-right font-medium">Gross</th>
              <th className="px-4 py-3 text-right font-medium">Platform</th>
              <th className="px-4 py-3 text-right font-medium">Merchant net</th>
            </tr>
          </thead>
          <tbody>
            {detail.recentPayments.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-b-0">
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                  {formatDateTime(p.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="text-slate-800">{p.payerEmail ?? '—'}</div>
                  {p.cardLast4 && (
                    <div className="font-mono text-xs text-slate-400">****{p.cardLast4}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <PaymentStatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3">
                  {p.fraudScore ? (
                    <div className="flex items-center gap-1.5">
                      <FraudDecisionBadge decision={p.fraudScore.decision} />
                      <span className="text-xs text-slate-500 tabular-nums">
                        {p.fraudScore.score}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                  {formatMoney(p.amountPaid)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-indigo-700">
                  {formatMoney(p.commissionPaise)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                  {formatMoney(p.merchantCredit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function StatusHistory({ detail }: { detail: MerchantDetail }) {
  if (detail.statusEvents.length === 0) return null

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Status history</h2>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {detail.statusEvents.map((e) => (
          <li key={e.id} className="px-5 py-3">
            <p className="text-sm text-slate-800">
              {MERCHANT_STATUS_LABEL[e.fromStatus]} → {MERCHANT_STATUS_LABEL[e.toStatus]}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {e.reason} · {formatDateTime(e.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Metric({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">{label}</p>
      <p
        className={`text-2xl font-semibold tracking-tight tabular-nums ${
          className ?? 'text-slate-900'
        }`}
      >
        {value}
      </p>
    </div>
  )
}
