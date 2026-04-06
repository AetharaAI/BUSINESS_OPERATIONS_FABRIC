import { PortalAuditLogEntry } from "@/lib/types/portal";

export const AuditLogTable = ({ items }: { items: PortalAuditLogEntry[] }) => (
  <section className="panel stack">
    <h1>Audit Log</h1>
    {items.length === 0 ? (
      <p className="muted">No entries available.</p>
    ) : (
      <table className="table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Event</th>
            <th>Actor</th>
            <th>Previous</th>
            <th>Next</th>
          </tr>
        </thead>
        <tbody>
          {items.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.timestamp}</td>
              <td>{entry.event_type}</td>
              <td>{entry.actor || "Unknown"}</td>
              <td>
                <pre>{JSON.stringify(entry.previous_value ?? {}, null, 2)}</pre>
              </td>
              <td>
                <pre>{JSON.stringify(entry.next_value ?? {}, null, 2)}</pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </section>
);
