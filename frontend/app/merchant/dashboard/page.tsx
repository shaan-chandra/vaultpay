"use client"

import { useState, useEffect } from "react"
import {useRouter} from "next/navigation"
import {
  Home,
  Link2,
  Receipt,
  Settings,
  LogOut,
  TrendingUp,
  ArrowUpRight,
  Lightbulb,
  Menu,
  X,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types + placeholder data
// ---------------------------------------------------------------------------

type Payment = {
  id: string
  payer: string
  amount: number
  date: string // ISO
  status: "Received" | "Pending"
}

type MerchantData = {
  businessName: string
  balance: number
  paymentsToday: number
  paymentsTodayDelta: number
  paymentsThisMonth: number
  activeLinks: number
  recentPayments: Payment[]
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

const EMPTY: MerchantData = {
  businessName: "",
  balance: 0,
  paymentsToday: 0,
  paymentsTodayDelta: 0,
  paymentsThisMonth: 0,
  activeLinks: 0,
  recentPayments: [],
}

/* One row from GET /merchant/payments. Only the fields this page reads. */
type ApiPayment = {
  id: string
  amountPaid: number
  merchantCredit: number
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "BLOCKED"
  payerEmail: string | null
  createdAt: string
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString()
}

/* Everything on this dashboard is derived from the payments list. There is no
   GET /merchant/me — the only merchant-scoped endpoint is /merchant/payments,
   so balance is recomputed here rather than read from Merchant.balance. */
function derive(rows: ApiPayment[]): MerchantData {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  const succeeded = rows.filter((p) => p.status === "SUCCEEDED")

  const balance = succeeded.reduce((sum, p) => sum + p.merchantCredit, 0)

  const today = succeeded.filter((p) => isSameDay(new Date(p.createdAt), now))
  const yday = succeeded.filter((p) => isSameDay(new Date(p.createdAt), yesterday))

  const thisMonth = succeeded.filter((p) => {
    const d = new Date(p.createdAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  return {
    businessName: "",
    balance,
    paymentsToday: today.length,
    paymentsTodayDelta: today.length - yday.length,
    paymentsThisMonth: thisMonth.length,
    /* No endpoint exposes the merchant's own link count, so this stays 0.
       Total payments is the closest honest stand-in. */
    activeLinks: 0,
    recentPayments: rows.slice(0, 5).map((p) => ({
      id: p.id,
      payer: p.payerEmail ?? "Guest",
      amount: p.amountPaid,
      date: p.createdAt,
      status: p.status === "SUCCEEDED" ? "Received" : "Pending",
    })),
  }
}
function daysAgo(days: number, hours: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(d.getHours() - hours)
  return d.toISOString()
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

/* Amounts are stored exactly as entered — same convention as
   app/merchant/payments/page.tsx. No /100 here or the two pages disagree. */
function formatAmount(amount: number): string {
  return inr.format(amount)
}

function formatRelativeDate(iso: string): string {
  const then = new Date(iso)
  const now = new Date()
  const sameDay = then.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = then.toDateString() === yesterday.toDateString()

  const time = then.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })

  if (sameDay) return `Today, ${time}`
  if (isYesterday) return `Yesterday, ${time}`
  return then.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + `, ${time}`
}

function greetingForNow(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function todayLong(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: Home, href: "/merchant/dashboard" },
  { key: "links", label: "Payment Links", icon: Link2, href: "/merchant/payment-link" },
  { key: "payments", label: "Payments", icon: Receipt, href: "/merchant/payments" },
]

function Sidebar({
  businessName,
  active,
  mobileOpen,
  onCloseMobile,
}: {
  businessName: string
  active: string
  mobileOpen: boolean
  onCloseMobile: () => void
}) {
    const router = useRouter()
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Close menu"
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-slate-900/20 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <span className="text-sm font-bold text-white">V</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-slate-900">VaultPay</span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                Merchant
              </span>
            </div>
          </div>
          <button
            aria-label="Close menu"
            onClick={onCloseMobile}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === active
            const Icon = item.icon
            return (
              <a
                key={item.key}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] ${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}`} />
                <span>{item.label}</span>
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600" />}
              </a>
            )
          })}
        </nav>

        {/* Settings pinned near bottom */}
        <div className="px-3 pb-2">
          <a
            href="/merchant/settings"
            className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900"
          >
            <Settings className="h-[18px] w-[18px] text-slate-400 group-hover:text-slate-600" />
            <span>Settings</span>
          </a>
        </div>

        {/* Merchant profile card */}
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {initials(businessName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{businessName}</p>
              <p className="truncate text-xs text-slate-400">Merchant account</p>
            </div>
            <button
              aria-label="Log out"
              onClick = {() => {
                localStorage.removeItem("merchant_token")
                router.push("/merchant/login")
              }}
              className="rounded-md p-1.5 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

// ---------------------------------------------------------------------------
// Balance card (hero)
// ---------------------------------------------------------------------------

function BalanceCard({ balance }: { balance: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="absolute inset-y-0 left-0 w-1 bg-indigo-600" />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Available balance</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
            {formatAmount(balance)}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Last payout</p>
          <p className="mt-1 text-sm text-slate-500">&mdash;</p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stats row
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  iconColor,
}: {
  label: string
  value: string
  helper: string
  icon: typeof TrendingUp
  iconColor: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className={`h-[18px] w-[18px] ${iconColor}`} />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{helper}</p>
    </div>
  )
}

function StatsRow({ data }: { data: MerchantData }) {
  const deltaText =
    data.paymentsTodayDelta > 0
      ? `${data.paymentsTodayDelta} more than yesterday`
      : data.paymentsTodayDelta < 0
        ? `${Math.abs(data.paymentsTodayDelta)} fewer than yesterday`
        : "Same as yesterday"

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label="Payments received today"
        value={String(data.paymentsToday)}
        helper={deltaText}
        icon={TrendingUp}
        iconColor="text-emerald-500"
      />
      <StatCard
        label="Total payments this month"
        value={String(data.paymentsThisMonth)}
        helper="Across all payment links"
        icon={Receipt}
        iconColor="text-indigo-500"
      />
      <StatCard
        label="Active payment links"
        value={String(data.activeLinks)}
        helper="Currently accepting payments"
        icon={Link2}
        iconColor="text-slate-400"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recent payments
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: Payment["status"] }) {
  if (status === "Received") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Received
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Pending
    </span>
  )
}

function EmptyPayments() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <Receipt className="h-6 w-6 text-slate-400" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-900">No payments yet</p>
      <p className="mt-1 text-sm text-slate-500">Create a payment link to start receiving</p>
      <a
        href="/merchant/payment-link"
        className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-indigo-700"
      >
        Create payment link
      </a>
    </div>
  )
}

function RecentPayments({ payments }: { payments: Payment[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Recent payments</h2>
        <a
          href="/merchant/payments"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition-colors duration-150 hover:text-indigo-700"
        >
          View all
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {payments.length === 0 ? (
        <EmptyPayments />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-medium">Payer</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                        {initials(p.payer)}
                      </div>
                      <span className="font-medium text-slate-900">{p.payer}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 font-medium text-slate-900">{formatAmount(p.amount)}</td>
                  <td className="px-6 py-3.5 text-slate-500">{formatRelativeDate(p.date)}</td>
                  <td className="px-6 py-3.5 text-right">
                    <StatusPill status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

function QuickActions() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Quick actions</h2>

      <div className="mt-4 space-y-3">
        <a
          href="/merchant/payment-links/new"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-indigo-700 active:translate-y-px"
        >
          <span className="text-base leading-none">+</span>
          Create payment link
        </a>
        <a
          href="/merchant/payments"
          className="flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 active:translate-y-px"
        >
          View all payments
        </a>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex items-start gap-2.5">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed text-slate-500">
            Tip: Share links via WhatsApp for faster payments &mdash; most customers pay within minutes.
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MerchantDashboardPage() {
  // Top-level state so real data can be plugged in later.
  const [data, setData] = useState<MerchantData>(EMPTY)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [greeting, setGreeting] = useState("Welcome back")
  const [dateLabel, setDateLabel] = useState("")
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("merchant_token")
    if (!token) {
        router.replace("/merchant/login")
        return
    }
    setReady(true)

    let cancelled = false

    async function load(): Promise<void> {
      try {
        /* limit=100 so the today/month counts and the balance cover a useful
           window. The default page size is 20, which would undercount. */
        const res = await fetch(`${API}/merchant/payments?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.status === 401) {
          localStorage.removeItem("merchant_token")
          router.replace("/merchant/login")
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const body = await res.json()
        if (cancelled) return

        setData(derive(body.data ?? []))
      } catch {
        if (!cancelled) setLoadError("Could not load your dashboard. Refresh to try again.")
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [router])

  // Time-of-day greeting + date are client-only to avoid SSR mismatch.
  useEffect(() => {
    setGreeting(greetingForNow())
    setDateLabel(todayLong())
    // TODO: read merchant name from token in localStorage, then fetch /merchant/me
  }, [])

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <Sidebar
        businessName={data.businessName}
        active="dashboard"
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="lg:pl-60">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-50"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-slate-900">VaultPay</span>
        </div>

        <main className="mx-auto max-w-5xl p-4 lg:p-8">
          {/* Greeting */}
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {greeting}, {data.businessName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{dateLabel}</p>
          </header>

          <div className="space-y-6">
            {loadError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {loadError}
              </p>
            )}

            <BalanceCard balance={data.balance} />

            <StatsRow data={data} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <RecentPayments payments={data.recentPayments} />
              </div>
              <div className="lg:col-span-2">
                <QuickActions />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
