'use client'

import type React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthError, authInputClass, authSubmitClass } from '@/components/auth-shell'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export function SignupForm() {
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API}/payer/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        // NestJS ValidationPipe returns `message` as an array of strings.
        setError(
          Array.isArray(data.message)
            ? data.message.join(' ')
            : (data.message ?? 'Could not create your account.'),
        )
        setLoading(false)
        return
      }

      const token = data.access_token ?? data.token

      // If signup doesn't return a token, send them to the login page instead
      // of dropping them on /payer with no credentials.
      if (!token) {
        router.push('/')
        return
      }

      localStorage.setItem('payerToken', token)
      localStorage.setItem('payerName', data.payer?.name ?? data.name ?? name)
      localStorage.setItem('payerEmail', data.payer?.email ?? email)

      router.push('/payer')
    } catch {
      setError('Could not reach the server. Please check your connection and try again.')
      setLoading(false)
    }
  }

  const describedBy = error ? 'signup-error' : undefined

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="text-muted-foreground mt-1.5 text-sm">
        Keep every payment you make in one place.
      </p>

      <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        {error && <AuthError id="signup-error" message={error} />}

        <div className="flex flex-col gap-2">
          <Label htmlFor="name" className="text-foreground text-sm font-medium">
            Full name
          </Label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Riya Sharma"
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={authInputClass}
          />
        </div>

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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              aria-invalid={Boolean(error)}
              aria-describedby={`password-hint${describedBy ? ` ${describedBy}` : ''}`}
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
          <p id="password-hint" className="text-muted-foreground text-xs">
            Use at least 8 characters.
          </p>
        </div>

        <Button type="submit" disabled={loading} className={authSubmitClass}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating account
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        {'Already have an account? '}
        <Link
          href="/"
          className="text-primary focus-visible:ring-ring rounded font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:outline-none"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
