'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  ReceiptText,
  Store,
  Search,
  ChevronDown,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { PAYER_NAV } from '@/lib/nav';

/* ---------------------------------------------------------------------------
 * EXPECTED API SHAPE — GET /payer/payments
 *
 * This page groups by merchant, so the backend must include the merchant on
 * each payment. If your payer.service.ts doesn't select it yet, add:
 *
 *   merchant: { select: { name: true, company: true } },
 *   paymentLink: { select: { description: true } },
 *
 * Adjust this type to match whatever your endpoint actually returns.
 * ------------------------------------------------------------------------- */
type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'BLOCKED';

type PayerPayment = {
  id: string;
  amountPaid: number;
  status: PaymentStatus;
  createdAt: string;
  cardLast4: string | null;
  merchant: { name: string; company: string };
  paymentLink: { description: string | null };
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/* Amounts are stored exactly as the payer entered them, so no /100 here.
   This matches app/merchant/payments/page.tsx — both pages must agree. */
const rupees = (amount: number) =>
  amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  });

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

const STATUS_LABEL: Record<PaymentStatus, string> = {
  SUCCEEDED: 'paid',
  FAILED: 'failed',
  BLOCKED: 'blocked',
  PENDING: 'pending',
};

const STATUS_TONE: Record<PaymentStatus, string> = {
  SUCCEEDED: 'text-slate-400',
  FAILED: 'text-rose-500',
  BLOCKED: 'text-rose-600',
  PENDING: 'text-amber-500',
};

type MerchantGroup = {
  key: string;
  name: string;
  total: number;
  payments: PayerPayment[];
};

export default function PayerPaymentsPage() {
  const router = useRouter();

  const [payments, setPayments] = useState<PayerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payerName, setPayerName] = useState('');

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | PaymentStatus>('ALL');
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('payerToken');
    if (!token) {
      router.push('/');
      return;
    }

    setPayerName(localStorage.getItem('payerName') ?? '');

    fetch(`${API}/payer/payments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem('payerToken');
          router.push('/');
          return null;
        }
        if (!res.ok) throw new Error('Could not load your payments.');
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        // Handles both a bare array and a { data: [...] } envelope.
        setPayments(Array.isArray(data) ? data : (data.data ?? []));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments.filter((p) => {
      if (filter !== 'ALL' && p.status !== filter) return false;
      if (!q) return true;
      return (
        p.merchant.name.toLowerCase().includes(q) ||
        p.merchant.company.toLowerCase().includes(q)
      );
    });
  }, [payments, query, filter]);

  const groups = useMemo<MerchantGroup[]>(() => {
    const map = new Map<string, MerchantGroup>();
    for (const p of visible) {
      const key = p.merchant.name;
      const group = map.get(key) ?? { key, name: key, total: 0, payments: [] };
      group.payments.push(p);
      if (p.status === 'SUCCEEDED') group.total += p.amountPaid;
      map.set(key, group);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [visible]);

  const totalPaid = useMemo(
    () =>
      payments
        .filter((p) => p.status === 'SUCCEEDED')
        .reduce((sum, p) => sum + p.amountPaid, 0),
    [payments],
  );

  const merchantCount = useMemo(
    () => new Set(payments.map((p) => p.merchant.name)).size,
    [payments],
  );

  return (
    <AppShell
      role="payer"
      portal="Payer"
      nav={PAYER_NAV}
      title="Your payments"
      description="Receipts for everything you've paid through VaultPay."
    >
      <div>
        {/* Stats */}
        <div className="grid gap-5 sm:grid-cols-3">
          <StatCard
            icon={<Wallet className="h-5 w-5 text-emerald-600" />}
            label="Total paid"
            value={loading ? '—' : rupees(totalPaid)}
          />
          <StatCard
            icon={<ReceiptText className="h-5 w-5 text-emerald-600" />}
            label="Payments"
            value={loading ? '—' : String(payments.length)}
          />
          <StatCard
            icon={<Store className="h-5 w-5 text-emerald-600" />}
            label="Merchants"
            value={loading ? '—' : String(merchantCount)}
          />
        </div>

        {/* Controls */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search merchants"
              className="w-full rounded-full bg-white py-4 pl-14 pr-6 text-[#0B2B2B] shadow-sm outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-600"
            />
          </div>
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="w-full appearance-none rounded-full bg-white py-4 pl-6 pr-14 text-[#0B2B2B] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 sm:w-56"
            >
              <option value="ALL">All</option>
              <option value="SUCCEEDED">Paid</option>
              <option value="FAILED">Failed</option>
              <option value="BLOCKED">Blocked</option>
              <option value="PENDING">Pending</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* List */}
        <div className="mt-8 space-y-4 pb-16">
          {loading && <Message>Loading your payments…</Message>}

          {error && !loading && <Message tone="error">{error}</Message>}

          {!loading && !error && groups.length === 0 && (
            <Message>
              {payments.length === 0
                ? "You haven't made any payments yet."
                : 'No merchants match that search.'}
            </Message>
          )}

          {groups.map((group) => {
            const open = openKey === group.key;
            return (
              <div
                key={group.key}
                className="overflow-hidden rounded-[28px] bg-white shadow-sm"
              >
                <button
                  onClick={() => setOpenKey(open ? null : group.key)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-5 px-7 py-6 text-left transition hover:bg-slate-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
                    {initials(group.name)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xl font-semibold text-[#0B2B2B]">
                      {group.name}
                    </span>
                    <span className="block text-sm text-slate-500">
                      {group.payments.length}{' '}
                      {group.payments.length === 1 ? 'payment' : 'payments'}
                    </span>
                  </span>

                  <span className="text-right">
                    <span className="block text-2xl font-semibold text-[#0B2B2B]">
                      {rupees(group.total)}
                    </span>
                    <span className="block text-sm text-slate-400">paid</span>
                  </span>

                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {open && (
                  <ul className="border-t border-slate-100 px-7 py-2">
                    {group.payments.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-4 border-b border-slate-50 py-4 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#0B2B2B]">
                            {p.paymentLink.description ?? 'Payment'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(p.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                            {p.cardLast4 && ` · •••• ${p.cardLast4}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#0B2B2B]">
                            {rupees(p.amountPaid)}
                          </p>
                          <p className={`text-xs ${STATUS_TONE[p.status]}`}>
                            {STATUS_LABEL[p.status]}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[28px] bg-white px-7 py-7 shadow-sm">
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </span>
      </div>
      <p className="mt-3 text-4xl font-bold tracking-tight text-[#0B2B2B]">
        {value}
      </p>
    </div>
  );
}

function Message({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode;
  tone?: 'muted' | 'error';
}) {
  return (
    <div
      className={`rounded-[28px] bg-white px-7 py-10 text-center shadow-sm ${
        tone === 'error' ? 'text-rose-600' : 'text-slate-500'
      }`}
    >
      {children}
    </div>
  );
}
