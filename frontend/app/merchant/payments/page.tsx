"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
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

const STATUS_STYLE: Record<string, string> = {
  SUCCEEDED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  FAILED: "bg-slate-100 text-slate-600 ring-slate-500/20",
  BLOCKED: "bg-red-50 text-red-700 ring-red-600/20",
  PENDING: "bg-amber-50 text-amber-800 ring-amber-600/20",
};

/* FAILED and BLOCKED both leave the merchant with nothing, but for different
   reasons: FAILED reached the processor and was declined, BLOCKED never got
   there. Without this column the two are indistinguishable in the table. */
const STATUS_LABEL: Record<string, string> = {
  SUCCEEDED: "Paid",
  FAILED: "Declined",
  BLOCKED: "Blocked",
  PENDING: "Pending",
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

/* Two lines rather than one long string — the single-line form was the widest
   cell in the table and forced horizontal scroll on smaller screens. */
function formatDate(value: string): { date: string; time: string } {
  const d = new Date(value);
  return {
    date: d.toLocaleDateString(LOCALE, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: d.toLocaleTimeString(LOCALE, {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
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
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        setError("");

        const token = localStorage.getItem("merchant_token");


        const res = await fetch(`${API}/merchant/payments`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });


        if (res.status === 401) {
          localStorage.removeItem("merchant_token");
          router.push("/merchant/login");
          return;
        }

        if (!res.ok) {
          throw new Error(`Could not load payments. HTTP ${res.status}`);
        }

        const response = (await res.json()) as PaymentsResponse;


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
    <div className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Payments
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Every payment made through your links, with the fraud score behind it.
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

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
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
                href="/merchant/payment-link"
                className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                Create payment link
              </Link>
            </div>
          )}

          {!loading && !error && payments.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
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
                    Status
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
                  <Fragment key={payment.id}>
                  <tr className="border-b border-slate-100">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      <div>{formatDate(payment.createdAt).date}</div>
                      <div className="text-xs text-slate-400">
                        {formatDate(payment.createdAt).time}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-900">
                      {payment.payerEmail ?? "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {payment.paymentLink.description ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          STATUS_STYLE[payment.status] ?? STATUS_STYLE.PENDING
                        }`}
                      >
                        {STATUS_LABEL[payment.status] ?? payment.status}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <FraudBadge
                        fraudScore={payment.fraudScore}
                        open={openId === payment.id}
                        onToggle={() =>
                          setOpenId(openId === payment.id ? null : payment.id)
                        }
                      />
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

                  {openId === payment.id && payment.fraudScore && (
                    <ReasonRow fraudScore={payment.fraudScore} />
                  )}
                  </Fragment>
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

function FraudBadge({
  fraudScore,
  open,
  onToggle,
}: {
  fraudScore?: FraudScore | null;
  open: boolean;
  onToggle: () => void;
}) {
  if (!fraudScore) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  const reasons = Array.isArray(fraudScore.reasons) ? fraudScore.reasons : [];
  const degraded = reasons.some((r) => r.degraded);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${DECISION_STYLE[fraudScore.decision]}`}
    >
      {fraudScore.decision}
      <span className="tabular-nums opacity-70">{fraudScore.score}</span>
      {degraded && <span title="A rule timed out; scored fail-open">*</span>}
    </button>
  );
}

/* Reasons render as a full-width row beneath the payment rather than a floating
   panel. An absolutely-positioned dropdown gets clipped by the table's scroll
   container; a table row cannot be clipped. */
function ReasonRow({ fraudScore }: { fraudScore: FraudScore }) {
  const reasons = Array.isArray(fraudScore.reasons) ? fraudScore.reasons : [];
  const degraded = reasons.some((r) => r.degraded);

  return (
    <tr className="border-b border-slate-100 bg-slate-50/60">
      <td colSpan={8} className="px-4 py-3">
        <ul className="space-y-1.5">
          {reasons.map((r) => (
            <li key={r.rule} className="flex gap-3 text-xs">
              <span className="w-8 shrink-0 tabular-nums font-medium text-slate-900">
                +{r.score}
              </span>
              <span className="text-slate-600">{r.reason}</span>
            </li>
          ))}
        </ul>

        {degraded && (
          <p className="mt-2 text-xs text-amber-700">
            A rule timed out and was scored 0 (fail-open).
          </p>
        )}
      </td>
    </tr>
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
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>

      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}