"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, X, Search, TriangleAlert, Loader2, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MerchantStatusBadge } from "@/components/status-badge";
import { SUPERADMIN_NAV } from "@/lib/nav";
import {
  API,
  adminFetch,
  formatMoney,
  formatPercent,
  UnauthorizedError,
  type MerchantRow,
  type Overview,
  type OverviewRange,
} from "@/lib/superadmin";

type NewMerchantForm = {
  name: string;
  company: string;
  email: string;
  contact: string;
  password: string;
  commissionPercent: string; // string because it comes from an <input>
};

const RANGES: { value: OverviewRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Deterministic muted color per merchant for the avatar tint
function avatarTint(name: string): string {
  const tints = [
    "bg-amber-100 text-amber-900",
    "bg-emerald-100 text-emerald-900",
    "bg-sky-100 text-sky-900",
    "bg-violet-100 text-violet-900",
    "bg-rose-100 text-rose-900",
    "bg-teal-100 text-teal-900",
  ];
  const sum = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return tints[sum % tints.length];
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [range, setRange] = useState<OverviewRange>("all");
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(
    async (nextRange: OverviewRange) => {
      try {
        setOverview(await adminFetch<Overview>(`/superadmin/overview?range=${nextRange}`));
        setError(null);
      } catch (err) {
        // An expired or rotated-secret token lands here; don't leave the admin
        // staring at an empty table wondering where their merchants went.
        if (err instanceof UnauthorizedError) {
          router.replace("/superadmin/login");
          return;
        }
        setError("Could not load platform data. Check that the server is running, then retry.");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    void load(range);
  }, [load, range]);

  const merchants = overview?.merchants ?? [];
  const totals = overview?.totals;

  const filtered = merchants.filter((m) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.company.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell
      role="superadmin"
      portal="Administrator"
      nav={SUPERADMIN_NAV}
      title="Merchants"
      description="Onboard merchants and see how processed volume splits between the platform and each merchant."
      actions={
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => {
              setLoading(true);
              setRange(e.target.value as OverviewRange);
            }}
            className="cursor-pointer rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500"
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-indigo-600 cursor-pointer hover:bg-indigo-700 text-white text-sm px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <Plus size={16} />
            Add merchant
          </button>
        </div>
      }
    >
      <>
        {/* Money split */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-3">
          <StatCard
            label="Gross processed"
            value={formatMoney(totals?.grossVolume ?? 0)}
            hint={`${totals?.succeededCount ?? 0} successful payments`}
            tabular
          />
          <StatCard
            label="Platform commission"
            value={formatMoney(totals?.platformCommission ?? 0)}
            hint="Kept by the platform"
            tabular
            accent="indigo"
          />
          <StatCard
            label="Merchant net"
            value={formatMoney(totals?.merchantNet ?? 0)}
            hint="Credited to merchants"
            tabular
            accent="emerald"
          />
          <StatCard
            label="Merchants"
            value={(totals?.merchantCount ?? 0).toString()}
            hint={`${totals?.activeMerchants ?? 0} active · ${
              totals?.underReviewMerchants ?? 0
            } under review · ${totals?.blockedMerchants ?? 0} blocked`}
          />
        </div>

        {/* Reconciliation line — makes the split unambiguous at a glance */}
        <p className="mb-8 text-xs text-slate-500 tabular-nums">
          {formatMoney(totals?.grossVolume ?? 0)} gross ={" "}
          <span className="text-indigo-700">
            {formatMoney(totals?.platformCommission ?? 0)} platform
          </span>{" "}
          +{" "}
          <span className="text-emerald-700">
            {formatMoney(totals?.merchantNet ?? 0)} merchants
          </span>
          {" · "}
          {totals?.blockedCount ?? 0} blocked and {totals?.failedCount ?? 0} failed attempts
          excluded
        </p>

        {/* Search + table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3 flex items-center gap-2">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, company, or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 text-sm outline-none placeholder:text-slate-400 bg-transparent"
            />
            <span className="text-xs text-slate-500 tabular-nums">
              {filtered.length} of {merchants.length}
            </span>
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 size={15} className="animate-spin" />
              Loading merchants…
            </div>
          ) : error ? (
            <div className="py-14 px-6 flex flex-col items-center text-center">
              <TriangleAlert size={20} className="text-amber-600" />
              <p className="mt-3 text-sm text-slate-700">{error}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  void load(range);
                }}
                className="mt-4 text-sm px-3.5 py-2 rounded-md border border-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState hasMerchants={merchants.length > 0} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="py-3 px-4 font-medium">Merchant</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Rate</th>
                    <th className="py-3 px-4 font-medium text-right">Gross</th>
                    <th className="py-3 px-4 font-medium text-right">Platform</th>
                    <th className="py-3 px-4 font-medium text-right">Merchant net</th>
                    <th className="py-3 px-4 font-medium text-right">Balance</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <MerchantTableRow key={m.id} merchant={m} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {modalOpen && (
          <AddMerchantModal
            onClose={() => setModalOpen(false)}
            onCreated={() => {
              setModalOpen(false);
              void load(range);
            }}
          />
        )}
      </>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Table row
// ─────────────────────────────────────────────────────────────
function MerchantTableRow({ merchant: m }: { merchant: MerchantRow }) {
  const risky = m.attemptCount >= 5 && m.blockedRate >= 0.2;

  return (
    <tr className="border-b border-slate-100 last:border-b-0 hover:bg-stone-50">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${avatarTint(
              m.name,
            )}`}
          >
            {initials(m.name)}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-slate-900">{m.name}</div>
            <div className="text-slate-500 text-xs">{m.company}</div>
            <div className="text-slate-400 text-xs">{m.email}</div>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex flex-col items-start gap-1">
          <MerchantStatusBadge status={m.status} />
          {risky && (
            <span className="inline-flex items-center gap-1 text-xs text-rose-600">
              <TriangleAlert size={12} />
              {Math.round(m.blockedRate * 100)}% blocked
            </span>
          )}
        </div>
      </td>
      <td className="py-4 px-4 text-right tabular-nums text-slate-700">
        {formatPercent(m.commissionPercent)}
      </td>
      <td className="py-4 px-4 text-right tabular-nums text-slate-900">
        {formatMoney(m.grossVolume)}
      </td>
      <td className="py-4 px-4 text-right tabular-nums text-indigo-700">
        {formatMoney(m.platformCommission)}
      </td>
      <td className="py-4 px-4 text-right tabular-nums text-emerald-700">
        {formatMoney(m.merchantNet)}
      </td>
      <td className="py-4 px-4 text-right tabular-nums font-medium">
        <span className={m.balance > 0 ? "text-slate-900" : "text-slate-400"}>
          {formatMoney(m.balance)}
        </span>
      </td>
      <td className="py-4 px-4 text-right">
        <Link
          href={`/superadmin/merchants/${m.id}`}
          className="inline-flex items-center gap-0.5 text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
        >
          Review
          <ChevronRight size={13} />
        </Link>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────
type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  tabular?: boolean;
  accent?: "emerald" | "indigo";
};

function StatCard({ label, value, hint, tabular, accent }: StatCardProps) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-700"
      : accent === "indigo"
        ? "text-indigo-700"
        : "text-slate-900";
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">{label}</p>
      <p
        className={`text-2xl font-semibold tracking-tight ${accentClass} ${
          tabular ? "tabular-nums" : ""
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────
type EmptyStateProps = {
  hasMerchants: boolean;
};

function EmptyState({ hasMerchants }: EmptyStateProps) {
  if (hasMerchants) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-slate-500">No merchants match your search.</p>
      </div>
    );
  }
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-slate-600">No merchants yet.</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Add merchant modal
// ─────────────────────────────────────────────────────────────
type AddMerchantModalProps = {
  onClose: () => void;
  onCreated: () => void;
};

function AddMerchantModal({ onClose, onCreated }: AddMerchantModalProps) {
  const [form, setForm] = useState<NewMerchantForm>({
    name: "",
    company: "",
    email: "",
    contact: "",
    password: "",
    commissionPercent: "2.0",
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof NewMerchantForm>(field: K, value: NewMerchantForm[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Send commissionPercent as a plain percent (2.5) — the backend converts it
    // to basis points itself.
    try {
      const token = localStorage.getItem("superadmin_token")
      const res = await fetch(`${API}/superadmin/merchant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: form.name, 
          company: form.company,
          email: form.email,
          contact: form.contact,
          password: form.password, 
          commissionPercent: parseFloat(form.commissionPercent)
        })
      })

      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(
          Array.isArray(body.message)
            ? body.message.join(" ")
            : (body.message ?? "Failed to add merchant."),
        )
        setSubmitting(false)
        return
      }

      onCreated()
    } catch {
      setError("Could not reach the server. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-slate-200">
        <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold tracking-tight">Add merchant</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              They&apos;ll use these credentials to log in.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field
            label="Full name"
            value={form.name}
            onChange={(v) => update("name", v)}
            placeholder="Kiran Patel"
            required
          />
          <Field
            label="Company"
            value={form.company}
            onChange={(v) => update("company", v)}
            placeholder="Aurora Textiles"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => update("email", v)}
              placeholder="kiran@company.in"
              required
            />
            <Field
              label="Contact"
              value={form.contact}
              onChange={(v) => update("contact", v)}
              placeholder="9876543210"
              required
              mono
              maxLength={10}
              pattern="[0-9]{10}"
              title="10 digits, no spaces or country code"
            />
          </div>
          <Field
            label="Initial password"
            type="password"
            value={form.password}
            onChange={(v) => update("password", v)}
            placeholder="At least 8 characters"
            required
            mono
          />
          <Field
            label="Commission (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={form.commissionPercent}
            onChange={(v) => update("commissionPercent", v)}
            required
            mono
            hint="Stored as basis points internally. 2.5 → 250."
          />

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-md text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="text-sm px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50"
            >
              {submitting ? "Adding…" : "Add merchant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Field
// ─────────────────────────────────────────────────────────────
type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  mono?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">;

function Field({ label, value, onChange, hint, mono, ...inputProps }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        {...inputProps}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 ${
          mono ? "font-mono" : ""
        }`}
      />
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}
