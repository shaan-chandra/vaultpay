import Link from 'next/link'
import { Activity, FileCheck2, ShieldCheck, Vault } from 'lucide-react'

/* Claims below are literal descriptions of the backend, not marketing copy:
   card PANs are HMAC-fingerprinted and discarded, the fraud engine scores
   before the processor call, and payment + commission + fraud decision are
   written in a single Prisma transaction. */
const highlights = [
  {
    icon: ShieldCheck,
    title: 'Card numbers are never stored',
    body: 'We keep a keyed HMAC fingerprint and the last four digits. The full number never reaches the database.',
  },
  {
    icon: Activity,
    title: 'Screened before it is charged',
    body: 'Velocity, amount and merchant history are scored on every attempt, ahead of the processor.',
  },
  {
    icon: FileCheck2,
    title: 'One atomic ledger write',
    body: 'Payment, commission and fraud decision commit together, or not at all.',
  },
]

export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="bg-primary flex size-9 items-center justify-center rounded-lg shadow-sm">
        <Vault className="size-5 text-white" strokeWidth={2.4} />
      </span>
      <span className="text-[1.0625rem] font-semibold tracking-tight">VaultPay</span>
    </span>
  )
}

export function PortalBadge({ label }: { label: string }) {
  return (
    <span className="border-border bg-muted text-muted-foreground rounded-full border px-2.5 py-1 text-xs font-medium">
      {label}
    </span>
  )
}

export function AuthError({ id, message }: { id: string; message: string }) {
  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      className="border-destructive/25 bg-destructive/5 text-destructive rounded-lg border px-3.5 py-2.5 text-sm"
    >
      {message}
    </div>
  )
}

export const authInputClass =
  'h-11 rounded-lg border-input bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground/70'

export const authSubmitClass =
  'bg-primary text-primary-foreground hover:bg-primary/90 h-11 w-full cursor-pointer gap-2 rounded-lg text-sm font-semibold shadow-sm disabled:cursor-not-allowed'

export function AuthShell({
  portal,
  children,
}: {
  portal: string
  children: React.ReactNode
}) {
  return (
    <main className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Brand panel — hidden on small screens, where the form is the whole job */}
      <aside className="bg-deep relative hidden overflow-hidden px-12 py-14 text-white lg:flex lg:flex-col xl:px-16">
        <div aria-hidden className="auth-grid absolute inset-0 opacity-70" />
        <div
          aria-hidden
          className="bg-primary/25 animate-float absolute -top-40 -left-24 size-[34rem] rounded-full blur-3xl"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/40 to-transparent"
        />

        <div className="relative flex h-full flex-col">
          <Link href="/" className="w-fit rounded-lg text-white outline-none focus-visible:ring-3 focus-visible:ring-white/40">
            <BrandMark />
          </Link>

          <div className="mt-auto max-w-md">
            <h2 className="text-[2rem] leading-[1.15] font-semibold tracking-tight text-balance">
              Payments infrastructure you can hand to an auditor.
            </h2>

            <ul className="mt-10 flex flex-col gap-7">
              {highlights.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-4">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10">
                    <Icon className="size-[1.05rem] text-white" strokeWidth={2} />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-white">{title}</span>
                    <span className="text-sm leading-relaxed text-white/60 text-pretty">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative mt-12 text-xs text-white/40">
            Demo environment — test cards only, no funds move.
          </p>
        </div>
      </aside>

      {/* Form panel */}
      <section className="flex flex-col px-5 py-8 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between lg:justify-end">
          <BrandMark className="text-foreground lg:hidden" />
          <PortalBadge label={portal} />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[26rem]">{children}</div>
        </div>
      </section>
    </main>
  )
}
