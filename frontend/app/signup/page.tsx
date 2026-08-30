import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth-shell'
import { SignupForm } from '@/components/signup-form'

export const metadata: Metadata = { title: 'Create your account' }

export default function SignupPage() {
  return (
    <AuthShell portal="Payer">
      <SignupForm />
    </AuthShell>
  )
}