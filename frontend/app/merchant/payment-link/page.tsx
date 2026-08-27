"use client";

import { useState } from "react";
import QRCode from "qrcode";

const API = "http://localhost:4000";
const LOCALE = "en-IN";
const CURRENCY = "INR";

type LinkType = "OPEN" | "FIXED";

type CreatedLink = {
  id: string;
  type: LinkType;
  title: string;
  amount: number | null;
};

export default function CreatePaymentLinkPage() {
  const [type, setType] = useState<LinkType>("OPEN");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [link, setLink] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  function validate(): string {
    if (!title.trim()) return "Give the link a title so you can recognise it later.";
    if (type === "FIXED") {
      const value = Number(amount);
      if (!amount || Number.isNaN(value) || value <= 0) {
        return "Enter an amount greater than 0 for a fixed link.";
      }
    }
    return "";
  }

  async function handleSubmit(): Promise<void> {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setError("");
    setSaving(true);

    try {
      const res = await fetch(`${API}/merchant/payment-links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("merchant_token")}`,
        },
        body: JSON.stringify({
          type,
          description: title,
          amount: type === "FIXED" ? Number(amount) : null,
        }),
      });

      if (!res.ok) throw new Error("Could not create the link. Try again.");

      const data = (await res.json()) as CreatedLink;
      const url = `${window.location.origin}/pay/${data.id}`;
      setLink(url);

      const dataUrl = await QRCode.toDataURL(url, { width: 320, margin: 2 });
      setQr(dataUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create the link. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReset(): void {
    setLink("");
    setQr("");
    setTitle("");
    setAmount("");
    setType("OPEN");
    setError("");
  }

  if (link) {
    return (
      <div className="min-h-screen bg-stone-50 px-6 py-10">
        <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Your link is ready</h1>
        <p className="mt-1 text-sm text-slate-500">
          Share this link or the QR code with your customer.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Payment link
          </label>
          <div className="mt-2 flex gap-2">
            <input
              readOnly
              value={link}
              className="flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            />
            <button
              onClick={handleCopy}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {qr && (
            <div className="mt-6 flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR code for the payment link" className="h-56 w-56" />
              <a href={qr} download="payment-link-qr.png" className="mt-3 text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900">
                Download QR
              </a>
            </div>
          )}
        </div>

        <button
          onClick={handleReset}
          className="mt-6 text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900"
        >
          Create another link
        </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Create payment link
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Choose whether the customer types the amount or you set it.
      </p>

      <div className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <span className="text-sm font-medium text-slate-700">Amount</span>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <TypeOption
              selected={type === "OPEN"}
              onClick={() => setType("OPEN")}
              title="Open"
              description="Customer enters the amount"
            />
            <TypeOption
              selected={type === "FIXED"}
              onClick={() => setType("FIXED")}
              title="Fixed"
              description="You set the amount"
            />
          </div>
        </div>

        <div>
          <label htmlFor="title" className="text-sm font-medium text-slate-700">
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTitle(e.target.value)
            }
            placeholder="Website design — October"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {type === "FIXED" && (
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
              placeholder="1500"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <p className="mt-1 text-xs text-slate-500">
              Shown to the customer as{" "}
              {new Intl.NumberFormat(LOCALE, {
                style: "currency",
                currency: CURRENCY,
              }).format(Number(amount) || 0)}
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create link"}
        </button>
      </div>
      </div>
    </div>
  );
}

type TypeOptionProps = {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
};

function TypeOption({ selected, onClick, title, description }: TypeOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-4 py-3 text-left transition ${
        selected
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 bg-white text-slate-900 hover:border-slate-400"
      }`}
    >
      <span className="block text-sm font-medium">{title}</span>
      <span
        className={`mt-0.5 block text-xs ${selected ? "text-slate-300" : "text-slate-500"}`}
      >
        {description}
      </span>
    </button>
  );
}