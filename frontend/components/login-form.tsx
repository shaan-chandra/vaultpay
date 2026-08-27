'use client'

import type React from 'react'
import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export function LoginForm() {
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API}/payer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.message ?? 'Invalid email or password.')
        setLoading(false)
        return
      }

      const token = data.access_token ?? data.token
      if (!token) {
        setError('No token in the response — check the backend.')
        setLoading(false)
        return
      }

      localStorage.setItem('payerToken', token)

      const name = data.payer?.name ?? data.name
      if (name) localStorage.setItem('payerName', name)

      // Checkout prefills this so the payment is attributable to the payer.
      localStorage.setItem('payerEmail', data.payer?.email ?? email)

      // Deliberately leaving `loading` true: the button stays disabled while
      // the route transition runs, and this component unmounts on the way out.
      router.push('/payer')
    } catch {
      setError('Could not reach the server. Is the backend running?')
      setLoading(false)
    }
  }

  return (
    <div className="border-border/70 bg-card w-full max-w-md rounded-3xl border p-8 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-10">
      <div className="flex flex-col gap-2">
        <span className="bg-primary/30 border-border/70 text-foreground/90 w-fit rounded-full border px-3 py-1 text-xs font-medium tracking-wide uppercase">
          Vaultpay
        </span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Welcome back</h1>
        <p className="text-muted-foreground leading-relaxed text-pretty">
          Sign in to pick up right where you left off.
        </p>
      </div>

      <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
        {error && (
          <p
            role="alert"
            className="border-destructive/40 bg-destructive/10 text-destructive rounded-xl border px-4 py-3 text-sm"
          >
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-foreground/90">
            Email
          </Label>
          <div className="relative">
            <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="bg-input/60 placeholder:text-muted-foreground/70 h-12 rounded-xl pl-10"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-foreground/90">
            Password
          </Label>
          <div className="relative">
            <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="bg-input/60 placeholder:text-muted-foreground/70 h-12 rounded-xl pr-11 pl-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Checkbox id="remember" className="border-border/80 data-checked:bg-primary" />
            <Label htmlFor="remember" className="text-muted-foreground text-sm font-normal">
              Remember me
            </Label>
          </div>
          <a href="#" className="text-accent text-sm font-medium underline-offset-4 hover:underline">
            Forgot password?
          </a>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="bg-primary text-primary-foreground hover:bg-primary/90 group h-12 rounded-xl text-base font-semibold shadow-lg shadow-black/25 cursor-pointer"
        >
          {loading ? (
            <>
              Signing in
              <Loader2 className="size-4 animate-spin" />
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </form>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        {"Don't have an account? "}
        <Link href="/signup" className="text-foreground font-medium underline-offset-4 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  )
}
