"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin/archive-audit";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Login failed");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Internal access</p>
      <h1 className="mt-2 font-serif text-3xl text-foreground">Archive QA login</h1>
      <p className="mt-3 text-sm text-muted-light">
        Protected by <code className="text-muted">ARCHIVE_ADMIN_SECRET</code>. Not public.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4 border border-border bg-surface p-6">
        <div>
          <label htmlFor="password" className="text-sm text-muted">
            Admin secret
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={loading || !password}>
          {loading ? "Signing in…" : "Enter dashboard"}
        </Button>
      </form>
    </div>
  );
}
