import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="content"><div className="container"><div className="panel">Loading...</div></div></main>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
