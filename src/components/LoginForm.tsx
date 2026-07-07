"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity: String(form.get("identity") ?? ""),
        password: String(form.get("password") ?? "")
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.error ?? "Unable to sign in.");
      setLoading(false);
      return;
    }

    const role = payload.user?.role as string | undefined;
    router.replace(role === "EMPLOYEE" ? "/employee" : "/admin");
    router.refresh();
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="identity">Email or employee ID</label>
        <input id="identity" name="identity" placeholder="EMP-1001" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" placeholder="••••••••••" required />
      </div>
      <button className="btn primary" type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign in securely"}
      </button>
      {error ? <p className="fine" style={{ color: "var(--red)" }}>{error}</p> : null}
    </form>
  );
}
