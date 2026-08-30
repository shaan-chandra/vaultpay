"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Search, TriangleAlert, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SUPERADMIN_NAV } from "@/lib/nav";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type Merchant = {
  id: string;
  name: string;
  company: string;
  email: string;
  contact: string;
  balance: number;           // whole rupees, same unit the payment pages use
  commissionPercent: number; // decimal percent, e.g. 2.5
};

type NewMerchantForm = {
  name: string;
  company: string;
  email: string;
  contact: string;
  password: string;
  commissionPercent: string; // string because it comes from an <input>
};

// ─────────────────────────────────────────────────────────────
// Starts empty — populated by your fetch on mount (see TODO below).
// ─────────────────────────────────────────────────────────────
const initialMerchants: Merchant[] = [];

// ─────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────
function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatPercent(pct: number): string {
  return `${pct.toFixed(2)}%`;
}

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
  const [merchants, setMerchants] = useState<Merchant[]>(initialMerchants);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadMerchants() {
      const token = localStorage.getItem("superadmin_token");
      if (!token) {
        router.replace("/superadmin/login");
        return;
      }

      try {
        const res = await fetch(`${API}/superadmin/merchant`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // An expired or rotated-secret token lands here; don't leave the admin
        // staring at an empty table wondering where their merchants went.
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("superadmin_token");
          router.replace("/superadmin/login");
          return;
        }

        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);

        setMerchants((await res.json()) as Merchant[]);
        setError(null);
      } catch {
        setError("Could not load merchants. Check that the server is running, then retry.");
      } finally {
        setLoading(false);
      }
    }

    void loadMerchants();
  }, [router]);

  const filtered = merchants.filter((m) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.company.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
    );
  });

  const totalBalance = merchants.reduce((s, m) => s + m.balance, 0);
  const avgCommission =
    merchants.length === 0
      ? 0
      : merchants.reduce((s, m) => s + m.commissionPercent, 0) / merchants.length;

  function handleCreated(newMerchant: Merchant) {
    setMerchants((prev) => [newMerchant, ...prev]);
    setModalOpen(false);
  }

  return (
    <AppShell
      role="superadmin"
      portal="Administrator"
      nav={SUPERADMIN_NAV}
      title="Merchants"
      description="Onboard merchants and review platform balances."
      actions={
        <button
          onClick={() => setModalOpen(true)}
          className="bg-indigo-600 cursor-pointer hover:bg-indigo-700 text-white text-sm px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm whitespace-nowrap"
        >
          <Plus size={16} />
          Add merchant
        </button>
      }
    >
      <>
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <StatCard label="Total merchants" value={merchants.length.toString()} />
          <StatCard
            label="Total balance held"
            value={formatMoney(totalBalance)}
            tabular
            accent="emerald"
          />
          <StatCard
            label="Avg. commission"
            value={formatPercent(avgCommission)}
            tabular
          />
        </div>

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
                onClick={() => window.location.reload()}
                className="mt-4 text-sm px-3.5 py-2 rounded-md border border-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState hasMerchants={merchants.length > 0} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4 font-medium">Merchant</th>
                  <th className="py-3 px-4 font-medium">Contact</th>
                  <th className="py-3 px-4 font-medium text-right">Commission</th>
                  <th className="py-3 px-4 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-stone-50"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${avatarTint(
                            m.name
                          )}`}
                        >
                          {initials(m.name)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{m.name}</div>
                          <div className="text-slate-500 text-xs">{m.company}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-slate-900">{m.email}</div>
                      <div className="text-slate-500 text-xs font-mono">{m.contact}</div>
                    </td>
                    <td className="py-4 px-4 text-right tabular-nums text-slate-700">
                      {formatPercent(m.commissionPercent)}
                    </td>
                    <td className="py-4 px-4 text-right tabular-nums font-medium">
                      <span
                        className={m.balance > 0 ? "text-emerald-700" : "text-slate-400"}
                      >
                        {formatMoney(m.balance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {modalOpen && (
          <AddMerchantModal
            onClose={() => setModalOpen(false)}
            onCreated={handleCreated}
          />
        )}
      </>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────
type StatCardProps = {
  label: string;
  value: string;
  tabular?: boolean;
  accent?: "emerald";
};

function StatCard({ label, value, tabular, accent }: StatCardProps) {
  const accentClass = accent === "emerald" ? "text-emerald-700" : "text-slate-900";
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
  onCreated: (merchant: Merchant) => void;
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

    // ───────────────────────────────────────────────────
    // NOTE: the commented block below is stale. Send commissionPercent as a plain
    // percent (2.5) — the backend converts it to basis points itself.
    //
    // const token = localStorage.getItem("token");
    // const res = await fetch("http://localhost:3000/superadmin/merchants", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${token}`,
    //   },
    //   body: JSON.stringify({
    //     name: form.name,
    //     company: form.company,
    //     email: form.email,
    //     contact: form.contact,
    //     password: form.password,
    //     // Backend expects basis points — convert here:
    //     commissionPercent: Math.round(parseFloat(form.commissionPercent) * 100),
    //   }),
    // });
    //
    // if (!res.ok) {
    //   const body = await res.json().catch(() => ({}));
    //   setError(body.message || "Failed to add merchant");
    //   setSubmitting(false);
    //   return;
    // }
    //
    // const created: Merchant = await res.json();
    // onCreated(created);
    // ───────────────────────────────────────────────────
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

      // POST echoes commissionPercent in basis points while GET returns a plain
      // percent, so normalise before it reaches the table.
      onCreated({ ...body, commissionPercent: body.commissionPercent / 100 } as Merchant)
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
