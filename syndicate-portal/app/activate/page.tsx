import { Suspense } from "react";
import ActivateClient from "./ActivateClient";

export default function ActivatePage() {
  return (
    <Suspense fallback={<main className="content"><div className="container"><div className="panel">Loading...</div></div></main>}>
      <ActivateClient />
    </Suspense>
  );
}
