import { BubbleField } from '@/components/bubble-field'
import { SignupForm } from '@/components/signup-form'

export default function SignupPage() {
  return (
    <main className="Vaultpay from-deep via-background to-primary/70 relative flex min-h-svh items-center justify-center overflow-hidden bg-linear-to-b px-4 py-12">
      <BubbleField />
      <div className="relative z-10 flex w-full justify-center">
        <SignupForm />
      </div>
    </main>
  )
}