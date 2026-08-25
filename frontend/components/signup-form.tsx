'use client'

import type React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Wire this up to your API. Available values: name, email, password
  }

  return (
    <div className="border-border/70 bg-card w-full max-w-md rounded-3xl border p-8 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-10">
      <div className="flex flex-col gap-2">
        <span className="bg-primary/30 border-border/70 text-foreground/90 w-fit rounded-full border px-3 py-1 text-xs font-medium tracking-wide uppercase">
          VaultPay
        </span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Create your account</h1>
        <p className="text-muted-foreground leading-relaxed text-pretty">
          Sign up to keep track of every payment you make.
        </p>
      </div>

      <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name" className="text-foreground/90">
            Name
          </Label>
          <div className="relative">
            <User className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Riya Sharma"
              className="bg-input/60 placeholder:text-muted-foreground/70 h-12 rounded-xl pl-10"
            />
          </div>
        </div>

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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              aria-describedby="password-hint"
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
          <p id="password-hint" className="text-muted-foreground text-xs">
            At least 8 characters.
          </p>
        </div>

        <Button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 group h-12 rounded-xl text-base font-semibold shadow-lg shadow-black/25 cursor-pointer"
        >
          Create account
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </form>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        {'Already have an account? '}
        <Link href="/" className="text-accent font-medium underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
