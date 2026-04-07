"use client";

import { FormEvent, useState } from "react";
import { PortalNav } from "@/components/PortalNav";
import { PortalApiError, portalApi } from "@/lib/client/api";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await portalApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      setSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 401) {
        setError("Current password is incorrect.");
      } else if (err instanceof PortalApiError && err.status === 400) {
        setError("Unable to change password. Make sure the new password is valid and different.");
      } else {
        setError(err instanceof Error ? err.message : "Unable to change password");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PortalNav />
      <main className="content">
        <div className="container" style={{ maxWidth: "560px" }}>
          <section className="panel stack">
            <h1>Change Password</h1>
            <p className="muted">Update your current account password.</p>

            {error ? <div className="alert alert-error">{error}</div> : null}
            {success ? <div className="alert alert-warning">{success}</div> : null}

            <form className="stack" onSubmit={submit}>
              <div className="form-row">
                <label htmlFor="current-password" className="label">
                  Current password
                </label>
                <input
                  id="current-password"
                  className="input"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                />
              </div>

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
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={isSubmitting}
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
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Change Password"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
