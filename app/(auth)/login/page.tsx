"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "code";
type Status = "idle" | "sending" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function sendCode() {
    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // Accounts are admin-invited only — never auto-create one just because
        // someone typed an email into this form.
        shouldCreateUser: false,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setCode("");
    setStatus("idle");
    setStep("code");
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendCode();
  }

  async function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      setStatus("error");
      setErrorMessage("Invalid or expired code. Please try again.");
      return;
    }

    router.push("/groceries/wishlist");
  }

  async function handleResend() {
    setStep("email");
    setStatus("idle");
    setErrorMessage("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-text">CaizenX Supplies</h1>

        {step === "email" ? (
          <>
            <p className="mt-1 text-sm text-text-muted">
              Sign in with the email your admin invited you with.
            </p>

            <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@caizenhomes.com"
                  className="mt-1.5 w-full rounded-md border border-border-strong bg-white px-3 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                />
              </div>

              {status === "error" && <p className="text-sm text-danger">{errorMessage}</p>}

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "sending" ? "Sending…" : "Send login code"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-text-muted">
              Enter the 6-digit code we emailed to <strong>{email}</strong>.
            </p>

            <form onSubmit={handleCodeSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-text">
                  6-digit code
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  autoFocus
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="mt-1.5 w-full rounded-md border border-border-strong bg-white px-3 py-2 text-center text-lg tracking-[0.5em] text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                />
              </div>

              {status === "error" && <p className="text-sm text-danger">{errorMessage}</p>}

              <button
                type="submit"
                disabled={status === "sending" || code.length !== 6}
                className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "sending" ? "Verifying…" : "Verify code"}
              </button>

              <button
                type="button"
                onClick={handleResend}
                className="w-full text-center text-sm text-accent hover:underline"
              >
                Didn&apos;t receive a code? Resend
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
