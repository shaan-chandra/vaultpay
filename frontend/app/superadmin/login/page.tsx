import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { SuperadminLoginForm } from "@/components/superadmin-login-form";

export const metadata: Metadata = { title: "Administrator sign in" };

export default function SuperAdminLoginPage() {
  return (
    <AuthShell portal="Administrator">
      <SuperadminLoginForm />
    </AuthShell>
  );
}