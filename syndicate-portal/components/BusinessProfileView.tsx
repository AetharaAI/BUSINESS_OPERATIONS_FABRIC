import { PortalBusinessProfile } from "@/lib/types/portal";

const row = (label: string, value: string | null | undefined) => (
  <div className="form-row" key={label}>
    <span className="label">{label}</span>
    <span>{value || "Not provided"}</span>
  </div>
);

export const BusinessProfileView = ({ profile }: { profile: PortalBusinessProfile }) => (
  <section className="panel stack">
    <h1>Business Profile</h1>
    {row("Legal business name", profile.legal_business_name)}
    {row("Public business name", profile.public_business_name)}
    {row("Website", profile.website)}
    {row("Timezone", profile.timezone)}
    {row("Service area", profile.service_area_summary)}
    {row("Primary contact", profile.primary_contact_name)}
    {row("Primary contact email", profile.primary_contact_email)}
    {row("Primary contact phone", profile.primary_contact_phone)}
    {row("After-hours instructions", profile.after_hours_instructions)}
  </section>
);
