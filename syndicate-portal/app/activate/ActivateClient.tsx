"use client";

import { FormEvent, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { portalApi } from "@/lib/client/api";

export default function ActivateClient() {
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
      setError("Missing activation token.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await portalApi.activateInvite({ token, new_password: newPassword });
      setSuccess("Password set successfully. You can now sign in.");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to activate invite");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="content">
      <div className="container" style={{ maxWidth: "520px" }}>
        <section className="panel stack">
          <h1>Activate Account</h1>
          <p className="muted">Set your password to complete first login.</p>
          {error ? <div className="alert alert-error">{error}</div> : null}
          {success ? <div className="alert alert-warning">{success}</div> : null}
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
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Activating..." : "Set Password"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
