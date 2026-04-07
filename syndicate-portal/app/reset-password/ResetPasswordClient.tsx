"use client";

import { FormEvent, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PortalApiError, portalApi } from "@/lib/client/api";

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("This reset link is missing a token. Request a new reset link.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await portalApi.resetPassword({ token, new_password: newPassword });
      setSuccess("Password reset successful. You can now sign in.");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 400) {
        setError("This reset link is invalid or expired. Request a new link.");
      } else {
        setError(err instanceof Error ? err.message : "Unable to reset password");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="content">
      <div className="container" style={{ maxWidth: "520px" }}>
        <section className="panel stack">
          <h1>Reset Password</h1>
          <p className="muted">Create a new password using your reset link.</p>

          {!token ? (
            <div className="alert alert-warning">
              Reset token missing. <a href="/forgot-password">Request a new reset link</a>.
            </div>
          ) : null}

          {error ? <div className="alert alert-error">{error}</div> : null}
          {success ? (
            <div className="alert alert-warning stack">
              <div>{success}</div>
              <div>
                Continue to <a href="/login">login</a>, or <a href="/forgot-password">request a new reset link</a>.
              </div>
            </div>
          ) : null}

          <form className="stack" onSubmit={submit}>
            <div className="form-row">
              <label htmlFor="new-password" className="label">
                New password
              </label>
              <input
                id="new-password"
                className="input"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                required
                disabled={!token || isSubmitting}
              />
            </div>
            <div className="form-row">
              <label htmlFor="confirm-password" className="label">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
                disabled={!token || isSubmitting}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={!token || isSubmitting}>
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <p className="muted">
            Need a fresh link? <a href="/forgot-password">Request password reset</a>
          </p>
        </section>
      </div>
    </main>
  );
}
