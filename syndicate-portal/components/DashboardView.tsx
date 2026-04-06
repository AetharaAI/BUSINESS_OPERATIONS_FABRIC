import { PortalDashboard } from "@/lib/types/portal";

export const DashboardView = ({ data }: { data: PortalDashboard }) => (
  <div className="stack">
    <section className="panel stack">
      <h1>Dashboard</h1>
      <p className="muted">
        Tenant: <strong>{data.tenant_name ?? data.tenant_id ?? "Unknown tenant"}</strong>
      </p>
      <div className="grid-2">
        <div>
          <div className="label">Current mode</div>
          <div className="value">{data.mode}</div>
        </div>
        <div>
          <div className="label">Today calls</div>
          <div className="value">{data.today_calls ?? 0}</div>
        </div>
        <div>
          <div className="label">7 day calls</div>
          <div className="value">{data.seven_day_calls ?? 0}</div>
        </div>
        <div>
          <div className="label">Routing enforcement</div>
          <div className="value">{data.effective_in_live_routing ? "Active" : "Pending"}</div>
        </div>
      </div>
    </section>

    <section className="panel">
      <h2>Coming Soon</h2>
      <p className="muted">These controls are intentionally hidden in v1 until dedicated endpoints are finalized.</p>
      <ul>
        <li>TODO(team): `/api/v1/portal/team`</li>
        <li>TODO(summaries): `/api/v1/portal/summaries`</li>
        <li>TODO(escalation contacts): `/api/v1/portal/escalation-contacts`</li>
        <li>TODO(call settings): `/api/v1/portal/call-settings`</li>
      </ul>
    </section>
  </div>
);
