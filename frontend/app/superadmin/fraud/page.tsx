'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Loader2, ShieldAlert, TriangleAlert } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { FraudDecisionBadge, MerchantStatusBadge } from '@/components/status-badge'
import { SUPERADMIN_NAV } from '@/lib/nav'
import {
  adminFetch,
  formatDateTime,
  formatMoney,
  UnauthorizedError,
  type FraudAlert,
  type FraudAlertPage,
  type FraudDecision,
} from '@/lib/superadmin'

const FILTERS: { value: FraudDecision | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Review + blocked' },
  { value: 'REVIEW', label: 'Review only' },
  { value: 'BLOCK', label: 'Blocked only' },
]

export default function FraudAlertsPage() {
  const [decision, setDecision] = useState<FraudDecision | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<FraudAlertPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (decision !== 'ALL') params.set('decision', decision)
      setResult(await adminFetch<FraudAlertPage>(`/superadmin/fraud/alerts?${params}`))
      setError(null)
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        router.replace('/superadmin/login')
        return
      }
      setError('Could not load fraud alerts. Check that the server is running, then retry.')
    } finally {
      setLoading(false)
    }
  }, [decision, page, router])

  useEffect(() => {
    void load()
  }, [load])

  const alerts = result?.data ?? []
  const pagination = result?.pagination

  return (
    <AppShell
      role="superadmin"
      portal="Administrator"
      nav={SUPERADMIN_NAV}
      title="Fraud alerts"
      description="Payments the fraud engine flagged for review or blocked outright. Open a merchant to act on it."
      actions={
        <select
          value={decision}
          onChange={(e) => {
            setLoading(true)
            setPage(1)
            setDecision(e.target.value as FraudDecision | 'ALL')
          }}
          className="cursor-pointer rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      }
    >
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 size={15} className="animate-spin" />
            Loading alerts…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <TriangleAlert size={20} className="text-amber-600" />
            <p className="mt-3 text-sm text-slate-700">{error}</p>
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
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <ShieldAlert size={20} className="text-slate-400" />
            <p className="mt-3 text-sm text-slate-600">No alerts in this view.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </ul>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            <span className="tabular-nums">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} alerts
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => {
                  setLoading(true)
                  setPage((p) => p - 1)
                }}
                className="cursor-pointer rounded-md border border-slate-300 px-2.5 py-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => {
                  setLoading(true)
                  setPage((p) => p + 1)
                }}
                className="cursor-pointer rounded-md border border-slate-300 px-2.5 py-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

function AlertRow({ alert }: { alert: FraudAlert }) {
  const { payment } = alert
  const reasons = Array.isArray(alert.reasons) ? alert.reasons : []

  return (
    <li className="px-4 py-4 hover:bg-stone-50">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <FraudDecisionBadge decision={alert.decision} />
            <span className="text-sm font-medium text-slate-900">
              {formatMoney(payment.amountPaid)}
            </span>
            <span className="text-xs text-slate-500 tabular-nums">score {alert.score}/70</span>
          </div>
          <p className="mt-1 text-sm text-slate-700">
            {payment.merchant.name}
            <span className="text-slate-400"> · </span>
            <span className="text-slate-500">{payment.merchant.company}</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {payment.payerEmail ?? 'no payer email'}
            {payment.cardLast4 && <span className="font-mono"> · ****{payment.cardLast4}</span>}
            <span> · {formatDateTime(alert.createdAt)}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <MerchantStatusBadge status={payment.merchant.status} />
          <Link
            href={`/superadmin/merchants/${payment.merchant.id}`}
            className="inline-flex items-center gap-0.5 text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
          >
            Take action
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      {reasons.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {reasons.map((r, i) => (
            <li
              key={`${r.rule}-${i}`}
              className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
              title={r.reason}
            >
              {r.rule} +{r.score}
              {r.degraded && <span className="text-amber-600"> (degraded)</span>}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
