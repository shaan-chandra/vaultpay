'use client'

import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import {
  MERCHANT_STATUS_LABEL,
  adminFetch,
  type MerchantStatus,
} from '@/lib/superadmin'

const COPY: Record<MerchantStatus, { title: string; blurb: string; cta: string; tone: string }> = {
  ACTIVE: {
    title: 'Reactivate merchant',
    blurb:
      'The merchant will be able to sign in, create payment links, and accept payments again.',
    cta: 'Reactivate',
    tone: 'bg-emerald-600 hover:bg-emerald-700',
  },
  UNDER_REVIEW: {
    title: 'Put merchant under review',
    blurb:
      'The merchant can still sign in and view their data, but every new payment and payment link will be rejected.',
    cta: 'Put under review',
    tone: 'bg-amber-600 hover:bg-amber-700',
  },
  BLOCKED: {
    title: 'Block merchant',
    blurb:
      'The merchant will be signed out of the platform, their existing payment links will stop working, and no further payments will be accepted.',
    cta: 'Block merchant',
    tone: 'bg-rose-600 hover:bg-rose-700',
  },
}

export function MerchantStatusDialog({
  merchantId,
  merchantName,
  currentStatus,
  nextStatus,
  onClose,
  onDone,
}: {
  merchantId: string
  merchantName: string
  currentStatus: MerchantStatus
  nextStatus: MerchantStatus
  onClose: () => void
  onDone: () => void
}) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const copy = COPY[nextStatus]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await adminFetch(`/superadmin/merchant/${merchantId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus, reason: reason.trim() }),
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update merchant status')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{copy.title}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {merchantName} · {MERCHANT_STATUS_LABEL[currentStatus]} →{' '}
              {MERCHANT_STATUS_LABEL[nextStatus]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4">
          <p className="text-sm text-slate-600">{copy.blurb}</p>

          <label className="mt-4 block text-xs font-medium text-slate-700">
            Reason (recorded in the audit trail)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={3}
              maxLength={500}
              rows={3}
              placeholder="e.g. 12 blocked card attempts in 10 minutes"
              className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20"
            />
          </label>

          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || reason.trim().length < 3}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${copy.tone}`}
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {copy.cta}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
