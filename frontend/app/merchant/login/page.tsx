import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { MerchantLoginForm } from "@/components/merchant-login-form";

export const metadata: Metadata = { title: "Merchant sign in" };

export default function MerchantLoginPage() {
  return (
    <AuthShell portal="Merchant portal">
      <MerchantLoginForm />
    </AuthShell>
  );
}