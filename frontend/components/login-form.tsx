'use client'

import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from "next/link"

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)

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

      <form
        className="mt-8 flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-foreground/90">
            Email
          </Label>
          <div className="relative">
            <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
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
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
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
          className="bg-primary text-primary-foreground hover:bg-primary/90 group h-12 rounded-xl text-base font-semibold shadow-lg shadow-black/25 cursor-pointer"
        >
          Sign in
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
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
