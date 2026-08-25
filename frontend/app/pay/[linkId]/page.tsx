"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";

const API = "http://localhost:4000";
const LOCALE = "en-IN";
const CURRENCY = "INR";

type LinkType = "OPEN" | "FIXED";

type PublicPaymentLink = {
  merchantName: string;
  title: string;
  type: LinkType;
  amount: number | null;
  active: boolean;
};

type PaymentResult = {
  id: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
};

function money(value: number | string): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
  }).format(Number(value) || 0);
}

export default function PayPage() {
  const { linkId } = useParams<{ linkId: string }>();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [linkData, setLinkData] = useState<PublicPaymentLink | null>(null);

  const [payerName, setPayerName] = useState("");
  const [amount, setAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [receipt, setReceipt] = useState<PaymentResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const res = await fetch(`${API}/public/payment-links/${linkId}`);

        if (res.status === 404) {
          if (!cancelled) setLoadError("This payment link does not exist.");
          return;
        }
        if (!res.ok) throw new Error("load failed");

        const data = (await res.json()) as PublicPaymentLink;

        if (!data.active) {
          if (!cancelled) setLoadError("This payment link is no longer active.");
          return;
        }

        if (cancelled) return;
        setLinkData(data);
        if (data.type === "FIXED" && data.amount !== null) {
          setAmount(String(data.amount));
        }
      } catch {
        if (!cancelled) setLoadError("Could not load this payment link.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [linkId]);

  async function handlePay(): Promise<void> {
    if (!payerName.trim()) {
      setPayError("Enter your name.");
      return;
    }
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value <= 0) {
      setPayError("Enter an amount greater than 0.");
      return;
    }

    setPayError("");
    setPaying(true);

    try {
      const res = await fetch(`${API}/public/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentLinkId: linkId,
          payerName,
          amount: value,
        }),
      });

      if (!res.ok) throw new Error("payment failed");

      const data = (await res.json()) as PaymentResult;
      setReceipt(data);
    } catch {
      setPayError("Payment could not be completed. Try again.");
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <Shell>
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-8 w-48 animate-pulse rounded bg-slate-200" />
      </Shell>
    );
  }

  if (loadError || !linkData) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold text-slate-900">Link unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">
          {loadError || "Could not load this payment link."}
        </p>
        <p className="mt-4 text-sm text-slate-500">Ask the sender for a new link.</p>
      </Shell>
    );
  }

  if (receipt) {
    return (
      <Shell>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <span className="text-xl text-emerald-700">✓</span>
        </div>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Payment received</h1>
        <p className="mt-1 text-sm text-slate-600">
          {money(receipt.grossAmount)} paid to {linkData.merchantName}.
        </p>
        <dl className="mt-6 space-y-2 border-t border-slate-200 pt-4 text-sm">
          <Row label="Paid by" value={payerName} />
          <Row label="For" value={linkData.title} />
          <Row label="Reference" value={receipt.id} />
        </dl>
        <p className="mt-6 text-xs text-slate-400">
          Demo payment — no money actually moved.
        </p>
      </Shell>
    );
  }

  const isFixed = linkData.type === "FIXED";

  return (
    <Shell>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Payment to
      </p>
      <h1 className="mt-1 text-xl font-semibold text-slate-900">
        {linkData.merchantName}
      </h1>
      <p className="mt-1 text-sm text-slate-600">{linkData.title}</p>

      <div className="mt-6 space-y-4">
        {isFixed ? (
          <div className="rounded-md bg-slate-50 px-4 py-3">
            <span className="text-xs uppercase tracking-wide text-slate-500">
              Amount
            </span>
            <p className="mt-0.5 text-2xl font-semibold text-slate-900">
              {money(linkData.amount ?? 0)}
            </p>
          </div>
        ) : (
          <div>
            <label htmlFor="amount" className="text-sm font-medium text-slate-700">
              Amount
            </label>
            <input
              id="amount"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAmount(e.target.value)
              }
              placeholder="0.00"
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label htmlFor="payerName" className="text-sm font-medium text-slate-700">
            Your name
          </label>
          <input
            id="payerName"
            value={payerName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPayerName(e.target.value)
            }
            placeholder="Riya Sharma"
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
          />
        </div>

        {payError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {payError}
          </p>
        )}

        <button
          onClick={handlePay}
          disabled={paying}
          className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {paying ? "Processing…" : `Pay ${amount ? money(amount) : ""}`}
        </button>

        <p className="text-center text-xs text-slate-400">
          Demo payment — no real bank is connected.
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}