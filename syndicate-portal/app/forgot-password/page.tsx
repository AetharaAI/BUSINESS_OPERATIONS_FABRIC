"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { portalApi } from "@/lib/client/api";

const COOLDOWN_SECONDS = 20;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);

  useEffect(() => {
    if (!cooldownUntil) return;
    const timer = window.setInterval(() => {
      if (Date.now() >= cooldownUntil) {
        setCooldownUntil(0);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const cooldownLeft = useMemo(() => {
    if (!cooldownUntil) return 0;
    return Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
  }, [cooldownUntil]);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (isSubmitting || cooldownLeft > 0) return;

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await portalApi.forgotPassword({ email: email.trim().toLowerCase() });
      setSuccess("If an account exists for that email, password reset instructions have been sent.");
    } catch {
      // Keep response neutral to avoid revealing account existence.
      setSuccess("If an account exists for that email, password reset instructions have been sent.");
    } finally {
      setIsSubmitting(false);
      setCooldownUntil(Date.now() + COOLDOWN_SECONDS * 1000);
    }
  };

  return (
    <main className="content">
      <div className="container" style={{ maxWidth: "520px" }}>
        <section className="panel stack">
          <h1>Forgot Password</h1>
          <p className="muted">Enter your email and we will send reset instructions if your account exists.</p>

          {error ? <div className="alert alert-error">{error}</div> : null}
          {success ? <div className="alert alert-warning">{success}</div> : null}

          <form className="stack" onSubmit={submit}>
            <div className="form-row">
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                className="input"
                id="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                required
                disabled={isSubmitting}
              />
            </div>

            <button className="btn btn-primary" type="submit" disabled={isSubmitting || cooldownLeft > 0}>
              {isSubmitting
                ? "Submitting..."
                : cooldownLeft > 0
                  ? `Try again in ${cooldownLeft}s`
                  : "Send Reset Link"}
            </button>
          </form>

          <p className="muted">
            Remembered your password? <a href="/login">Back to login</a>
          </p>
        </section>
      </div>
    </main>
  );
}
