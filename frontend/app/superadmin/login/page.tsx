"use client"; // needed because we use useState + localStorage (browser stuff)

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // stop the browser from reloading the page
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:4000/superadmin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        // backend returned 4xx or 5xx (e.g. wrong password)
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Invalid email or password");
        return;
      }

      const data = await res.json();

      // NestJS convention is usually { access_token: "..." }
      // Adjust this line to match whatever key YOUR backend actually returns.
      const token = data.access_token || data.token;

      if (!token) {
        setError("No token in response — check the backend");
        return;
      }

      // Save token so other pages can send it in the Authorization header
      localStorage.setItem("superadmin_token", token);

      // Go to the dashboard
      router.push("/superadmin/dashboard");
    } catch (err) {
      // fetch itself failed — usually means backend isn't running or CORS blocked it
      setError("Could not reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: 24 }}>SuperAdmin Login</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
          />
        </div>

        {error && (
          <div style={{ color: "red", marginBottom: 16 }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 10,
            background: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
    </div>
  );
}