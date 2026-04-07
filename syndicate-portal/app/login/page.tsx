"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { portalApi } from "@/lib/client/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await portalApi.login(email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="content">
      <div className="container" style={{ maxWidth: "460px" }}>
        <section className="panel stack">
          <h1>Syndicate Portal Login</h1>
          <p className="muted">Sign in with your tenant user account.</p>
          {error ? <div className="alert alert-error">{error}</div> : null}
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
              />
            </div>
            <div className="form-row">
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                className="input"
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p className="muted">
            Forgot your password? <a href="/forgot-password">Reset it here</a>
          </p>
        </section>
      </div>
    </main>
  );
}
