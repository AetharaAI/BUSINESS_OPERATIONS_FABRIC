import Link from "next/link";
import { PortalDashboard, TenantBillingState } from "@/lib/types/portal";

type DashboardViewProps = {
  dashboard: PortalDashboard;
  billing: (TenantBillingState & { signed_documents: Array<{ id: string; name: string; url: string }>; invoices: Array<unknown> }) | null;
};

const statusValue = (value: string | undefined): string => value ?? "Pending";

export const DashboardView = ({ dashboard, billing }: DashboardViewProps) => (
  <div className="stack">
    <section className="panel stack">
      <h1>Account Overview</h1>
      <p className="muted">View your onboarding status, billing progress, and current service state.</p>
      <div className="grid-2">
        <div>
          <div className="label">Business Name</div>
          <div className="value">{billing?.tenant_name ?? dashboard.tenant_name ?? dashboard.tenant_id ?? "Unknown tenant"}</div>
        </div>
        <div>
          <div className="label">Plan</div>
          <div className="value">{statusValue(billing?.selected_plan)}</div>
        </div>
        <div>
          <div className="label">Agreement</div>
          <div className="value">{statusValue(billing?.agreement_status)}</div>
        </div>
        <div>
          <div className="label">Deposit</div>
          <div className="value">{statusValue(billing?.deposit_status)}</div>
        </div>
        <div>
          <div className="label">Final Setup</div>
          <div className="value">{statusValue(billing?.final_setup_status)}</div>
        </div>
        <div>
          <div className="label">Monthly Service</div>
          <div className="value">{statusValue(billing?.monthly_status)}</div>
        </div>
        <div>
          <div className="label">Routing Status</div>
          <div className="value">{dashboard.effective_in_live_routing ? "Active" : "Pending"}</div>
        </div>
      </div>
      <div className="grid-2">
        <div>
          <div className="label">Today calls</div>
          <div className="value">{dashboard.today_calls ?? 0}</div>
        </div>
        <div>
          <div className="label">7 day calls</div>
          <div className="value">{dashboard.seven_day_calls ?? 0}</div>
        </div>
      </div>
    </section>

    <section className="panel stack">
      <h2>Quick Actions</h2>
      <div className="grid-2">
        <Link href="/billing" className="btn btn-secondary">
          View Billing
        </Link>
        <Link href="/business-profile" className="btn btn-secondary">
          View Business Profile
        </Link>
        <Link href="/change-password" className="btn btn-secondary">
          Update Password
        </Link>
        <Link href="/billing#signed-documents" className="btn btn-secondary">
          Review Signed Documents
        </Link>
      </div>
    </section>
  </div>
);
