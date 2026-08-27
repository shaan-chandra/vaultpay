"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";

const API = "http://localhost:4000";
const LOCALE = "en-IN";
const CURRENCY = "INR";

/* Shape returned by GET /public/payment-links/:id
   (findPublic strips `active` and nests the merchant) */
type PublicPaymentLink = {
  id: string;
  type: "OPEN" | "FIXED";
  amount: number | null;
  description: string | null;
  merchant: { name: string; company: string };
};

/* Shape returned by POST /public/payment-links/pay — the Payment row itself */
type PaymentResult = {
  id: string;
  amountPaid: number;
  commissionPaise: number;
  merchantCredit: number;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "BLOCKED";
  cardLast4: string | null;
  processorRef: string | null;
};

const TEST_CARDS = [
  { label: "Approved", number: "4242 4242 4242 4242" },
  { label: "Declined", number: "4000 0000 0000 0002" },
  { label: "Unknown card", number: "4111 1111 1111 1111" },
];

function money(value: number | string): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
  }).format(Number(value) || 0);
}

/** Groups digits in fours as the user types: 4242424242424242 -> 4242 4242 ... */
function formatCardInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

export default function PayPage() {
  const { linkId } = useParams<{ linkId: string }>();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [linkData, setLinkData] = useState<PublicPaymentLink | null>(null);

  const [payerEmail, setPayerEmail] = useState("");
  const [cardNumber, setCardNumber] = useState("");
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
        // findPublic throws GoneException (410) for deactivated links.
        if (res.status === 410) {
          if (!cancelled) setLoadError("This payment link is no longer active.");
          return;
        }
        if (!res.ok) throw new Error("load failed");

        const data = (await res.json()) as PublicPaymentLink;
        if (cancelled) return;

        setLinkData(data);
        if (data.type === "FIXED" && data.amount !== null) {
          setAmount(String(data.amount));
        }

        /* If a payer is signed in, prefill their email. This is what links the
           payment back to their history — without it the row has no payerEmail
           and never shows up on /payer. Checkout stays open to guests. */
        const savedEmail = localStorage.getItem("payerEmail");
        if (savedEmail) setPayerEmail(savedEmail);
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
    const digits = cardNumber.replace(/\D/g, "");
    if (digits.length < 12) {
      setPayError("Enter a card number.");
      return;
    }

    const isFixed = linkData?.type === "FIXED";
    const value = Number(amount);

    if (!isFixed) {
      if (!amount || !Number.isInteger(value) || value <= 0) {
        setPayError("Enter a whole amount greater than 0.");
        return;
      }
    }

    setPayError("");
    setPaying(true);

    try {
      const res = await fetch(`${API}/public/payment-links/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentLinkId: linkId,
          // FIXED links read the amount from the link; sending one is harmless
          // but pointless, so omit it.
          ...(isFixed ? {} : { amount: value }),
          ...(payerEmail.trim() ? { payerEmail: payerEmail.trim() } : {}),
          cardNumber,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        // class-validator returns message as string | string[]
        const detail = Array.isArray(body?.message)
          ? body.message[0]
          : body?.message;
        throw new Error(detail || "Payment could not be completed.");
      }

      const data = (await res.json()) as PaymentResult;
      setReceipt(data);
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : "Payment could not be completed.",
      );
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

  /* The API returns 200 for declines and blocks — the outcome lives in
     `status`, not the HTTP code. Branch on it. */
  if (receipt) {
    if (receipt.status === "SUCCEEDED") {
      return (
        <Shell>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <span className="text-xl text-emerald-700">✓</span>
          </div>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">
            Payment received
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {money(receipt.amountPaid)} paid to {linkData.merchant.name}.
          </p>
          <dl className="mt-6 space-y-2 border-t border-slate-200 pt-4 text-sm">
            {payerEmail && <Row label="Paid by" value={payerEmail} />}
            <Row label="For" value={linkData.description ?? "Payment"} />
            {receipt.cardLast4 && (
              <Row label="Card" value={`•••• ${receipt.cardLast4}`} />
            )}
            <Row label="Reference" value={receipt.id} />
          </dl>
          <p className="mt-6 text-xs text-slate-400">
            Demo payment — no money actually moved.
          </p>
        </Shell>
      );
    }

    /* FAILED and BLOCKED look the same to the payer on purpose. Telling
       someone "our fraud engine stopped you" hands an attacker a signal
       about which attempts are being detected. */
    return (
      <Shell>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <span className="text-xl text-red-700">✕</span>
        </div>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">
          Payment declined
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          This payment could not be completed. Try a different card, or contact{" "}
          {linkData.merchant.name}.
        </p>
        <button
          onClick={() => {
            setReceipt(null);
            setCardNumber("");
          }}
          className="mt-6 w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
        >
          Try another card
        </button>
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
        {linkData.merchant.name}
      </h1>
      {linkData.description && (
        <p className="mt-1 text-sm text-slate-600">{linkData.description}</p>
      )}

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
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label htmlFor="cardNumber" className="text-sm font-medium text-slate-700">
            Card number
          </label>
          <input
            id="cardNumber"
            inputMode="numeric"
            autoComplete="cc-number"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
            placeholder="4242 4242 4242 4242"
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm tracking-wide focus:border-slate-900 focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {TEST_CARDS.map((card) => (
              <button
                key={card.number}
                type="button"
                onClick={() => setCardNumber(card.number)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-400 hover:text-slate-900"
              >
                {card.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="payerEmail" className="text-sm font-medium text-slate-700">
            Your email{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="payerEmail"
            type="email"
            value={payerEmail}
            onChange={(e) => setPayerEmail(e.target.value)}
            placeholder="riya@example.com"
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
          Demo payment — no real bank is connected. Card numbers are never
          stored.
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
