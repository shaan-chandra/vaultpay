"use client";

import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Vault, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MerchantLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // TODO: integrate backend
    // 1. POST { email, password } to http://localhost:<port>/merchant/login
    // 2. If response is not ok → setError(data.message) and return
    // 3. Extract token from response (data.access_token or data.token)
    // 4. Save to localStorage as "merchant_token"
    // 5. router.push("/merchant/dashboard")
    // 6. Wrap in try/catch for network errors ("Could not reach the server")
    try {
        const res = await fetch("http://localhost:4000/merchant/login", {
            method: "POST",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({email, password})
        });
        if (!res.ok) {
            const data =  await res.json().catch(() => ({}));
            setError(data.message || "Invalid email or password");
            return;
        }
        const data = await res.json()
        const token = data.access_token || data.token 
        if (!token) {
            setError("No token in response — check the backend");
            return;
        }
        localStorage.setItem("merchant_token", token)
        router.push("/merchant/dashboard");
    }
    catch (err) {
        setError("Could not reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(600px circle at 50% 20%, rgba(79, 70, 229, 0.08), transparent 60%)",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Brand header */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-600/30">
            <Vault className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-semibold tracking-tight text-slate-900">
            VaultPay
          </span>
          <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            Merchant Portal
          </span>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 p-8">
          {/* Greeting */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Enter your store credentials to access your dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Business Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  strokeWidth={2}
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@business.com"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  strokeWidth={2}
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" strokeWidth={2} />
                  ) : (
                    <Eye className="w-4 h-4" strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>

            {/* Options row */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-4 h-4 rounded border border-slate-300 bg-white peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M2.5 6l2.5 2.5 4.5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition">
                  Remember this browser
                </span>
              </label>

              <button
                type="button"
                // TODO: wire up forgot password flow (not part of current 14-day plan)
                onClick={() => {}}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition"
              >
                Forgot password?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow-sm shadow-indigo-600/30 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-600/40 active:translate-y-px disabled:opacity-70 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In to Merchant Dashboard"
              )}
            </button>
          </form>
        </div>

        {/* Security footer */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} />
          <span>256-bit encrypted authentication</span>
        </div>
      </div>
    </div>
  );
}