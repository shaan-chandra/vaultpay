'use client'

import type React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthError, authInputClass, authSubmitClass } from '@/components/auth-shell'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export function SuperadminLoginForm() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API}/superadmin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(
          Array.isArray(data.message)
            ? data.message.join(' ')
            : (data.message ?? 'Invalid email or password.'),
        )
        setLoading(false)
        return
      }

      const token = data.access_token ?? data.token
      if (!token) {
        console.error('Login succeeded but no token was returned', data)
        setError('Something went wrong on our end. Please try again.')
        setLoading(false)
        return
      }

      localStorage.setItem('superadmin_token', token)
      router.push('/superadmin/dashboard')
    } catch {
      setError('Could not reach the server. Please check your connection and try again.')
      setLoading(false)
    }
  }

  const describedBy = error ? 'superadmin-login-error' : undefined

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Administrator sign in</h1>
      <p className="text-muted-foreground mt-1.5 text-sm">
        Restricted access. Onboard merchants and review platform balances.
      </p>

      <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        {error && <AuthError id="superadmin-login-error" message={error} />}

        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-foreground text-sm font-medium">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@vaultpay.com"
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={authInputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-foreground text-sm font-medium">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              aria-invalid={Boolean(error)}
              aria-describedby={describedBy}
              className={`${authInputClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-md p-1.5 transition-colors focus-visible:ring-3 focus-visible:outline-none"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
            </button>
          </div>
        </div>

        <Button type="submit" disabled={loading} className={authSubmitClass}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <p className="text-muted-foreground/80 border-border mt-10 border-t pt-6 text-center text-xs">
        All administrator activity is attributable to your account.
      </p>
    </div>
  )
}
