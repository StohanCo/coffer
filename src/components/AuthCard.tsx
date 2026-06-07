"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth/client";

type Mode = "sign-in" | "register";

export default function AuthCard({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "register") {
        const { error: err } = await signUp.email({ name, email, password });
        if (err) throw new Error(err.message ?? "Registration failed");
        // Auto sign-in after register
        const { error: signInErr } = await signIn.email({ email, password });
        if (signInErr) throw new Error(signInErr.message ?? "Sign in failed");
      } else {
        const { error: err } = await signIn.email({ email, password });
        if (err) throw new Error(err.message ?? "Sign in failed");
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "register" && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your name"
            className="input"
          />
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-400">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="input"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-400">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          placeholder="••••••••"
          className="input"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-rose-800/40 bg-rose-900/20 px-3 py-2 text-xs text-rose-400">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? (mode === "register" ? "Creating account…" : "Signing in…") : mode === "register" ? "Create account" : "Sign in"}
      </button>

      <p className="text-center text-xs text-slate-600">
        {mode === "sign-in" ? (
          <>
            No account?{" "}
            <Link href="/register" className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
              Register
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
