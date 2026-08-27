"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = "http://localhost:4000";
const LOCALE = "en-IN";
const CURRENCY = "INR";

type FraudDecision = "ALLOW" | "REVIEW" | "BLOCK";

/* Matches RuleResult in backend src/fraud/fraud.types.ts. `reasons` is a Json
   column holding the array the engine returned, one entry per rule. */
type RuleResult = {
  rule: string;
  score: number;
  reason: string;
  meta?: Record<string, unknown>;
  degraded?: boolean;
};

type FraudScore = {
  score: number;
  decision: FraudDecision;
  reasons: RuleResult[];
};

const DECISION_STYLE: Record<FraudDecision, string> = {
  ALLOW: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  REVIEW: "bg-amber-50 text-amber-800 ring-amber-600/20",
  BLOCK: "bg-red-50 text-red-700 ring-red-600/20",
};

type Payment = {
  id: string;
  amountPaid: number;
  commissionPaise: number;
  merchantCredit: number;
  status: string;
  payerEmail: string | null;
  createdAt: string;

  paymentLink: {
    id: string;
    description: string | null;
    type: string;
  };

  /* Optional so the table still renders before listForMerchant adds the
     select. Null is legitimate too — rows written before the fraud engine
     existed have no FraudScore. */
  fraudScore?: FraudScore | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type PaymentsResponse = {
  data: Payment[];
  pagination: Pagination;
};

function money(value: number | string): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
  }).format(Number(value) || 0);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function commissionPercent(payment: Payment): string {
  if (!payment.amountPaid) {
    return "—";
  }

  return `${(
    (payment.commissionPaise / payment.amountPaid) *
    100
  ).toFixed(1)}%`;
}

export default function PaymentsPage() {
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        setError("");

        const token = localStorage.getItem("merchant_token");

        console.log("Loading merchant payments:", {
          url: `${API}/merchant/payments`,
          tokenPresent: Boolean(token),
        });

        const res = await fetch(`${API}/merchant/payments`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("Payments response status:", res.status);

        if (res.status === 401) {
          localStorage.removeItem("merchant_token");
          router.push("/merchant/login");
          return;
        }

        if (!res.ok) {
          throw new Error(`Could not load payments. HTTP ${res.status}`);
        }

        const response = (await res.json()) as PaymentsResponse;

        console.log("Payments response:", response);

        if (!cancelled) {
          setPayments(response.data);
          setPagination(response.pagination);
        }
      } catch (err) {
        console.error("Failed to load payments:", err);

        if (!cancelled) {
          setError("Could not load payments. Refresh to try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const totalReceived = payments.reduce(
    (sum, payment) => sum + payment.merchantCredit,
    0,
  );

  const totalCommission = payments.reduce(
    (sum, payment) => sum + payment.commissionPaise,
    0,
  );

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold text-slate-900">
          Payments
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Every payment made through your links.
        </p>

        {!loading && !error && payments.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat
              label="Payments"
              value={pagination?.total ?? payments.length}
            />

            <Stat
              label="You received"
              value={money(totalReceived)}
            />

            <Stat
              label="Commission"
              value={money(totalCommission)}
            />
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {loading && (
            <p className="p-6 text-sm text-slate-500">
              Loading payments…
            </p>
          )}

          {error && (
            <p className="p-6 text-sm text-red-700">
              {error}
            </p>
          )}

          {!loading && !error && payments.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-slate-900">
                No payments yet
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Create a payment link and share it to receive your first
                payment.
              </p>

              <Link
                href="/merchant/payment-links/new"
                className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Create payment link
              </Link>
            </div>
          )}

          {!loading && !error && payments.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">
                    Date
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Paid by
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Payment link
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Fraud
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Amount paid
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Commission
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    You received
                  </th>
                </tr>
              </thead>

              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatDate(payment.createdAt)}
                    </td>

                    <td className="px-4 py-3 text-slate-900">
                      {payment.payerEmail ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {payment.paymentLink.description ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      <FraudBadge fraudScore={payment.fraudScore} />
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                      {money(payment.amountPaid)}
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                      {money(payment.commissionPaise)}{" "}
                      <span className="text-xs">
                        ({commissionPercent(payment)})
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">
                      {money(payment.merchantCredit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading &&
          !error &&
          pagination &&
          pagination.totalPages > 1 && (
            <p className="mt-4 text-sm text-slate-500">
              Page {pagination.page} of {pagination.totalPages} ·{" "}
              {pagination.total} payments
            </p>
          )}
      </div>
    </div>
  );
}

function FraudBadge({ fraudScore }: { fraudScore?: FraudScore | null }) {
  const [open, setOpen] = useState(false);

  if (!fraudScore) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  const reasons = Array.isArray(fraudScore.reasons) ? fraudScore.reasons : [];
  const degraded = reasons.some((r) => r.degraded);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${DECISION_STYLE[fraudScore.decision]}`}
      >
        {fraudScore.decision}
        <span className="tabular-nums opacity-70">{fraudScore.score}</span>
        {degraded && (
          <span title="A rule timed out; scored fail-open">*</span>
        )}
      </button>

      {open && reasons.length > 0 && (
        <div className="absolute left-0 top-full z-10 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <ul className="space-y-2">
            {reasons.map((r) => (
              <li key={r.rule} className="flex gap-2 text-xs">
                <span className="shrink-0 tabular-nums font-medium text-slate-900">
                  +{r.score}
                </span>
                <span className="text-slate-600">{r.reason}</span>
              </li>
            ))}
          </ul>

          {degraded && (
            <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-amber-700">
              A rule timed out and was scored 0 (fail-open).
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}