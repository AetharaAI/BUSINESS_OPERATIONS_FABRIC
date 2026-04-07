import { PortalBusinessProfile } from "@/lib/types/portal";

const hasValue = (value: string | null | undefined): value is string => typeof value === "string" && value.trim().length > 0;

const row = (label: string, value: string) => (
  <div className="form-row" key={label}>
    <span className="label">{label}</span>
    <span>{value}</span>
  </div>
);

export const BusinessProfileView = ({
  profile,
  fallbackPrimaryContactEmail
}: {
  profile: PortalBusinessProfile;
  fallbackPrimaryContactEmail?: string | null;
}) => {
  const primaryContactEmail = hasValue(profile.primary_contact_email)
    ? profile.primary_contact_email
    : hasValue(fallbackPrimaryContactEmail)
      ? fallbackPrimaryContactEmail
      : null;

  const fields: Array<{ label: string; value: string | null | undefined }> = [
    { label: "Legal business name", value: profile.legal_business_name },
    { label: "Public business name", value: profile.public_business_name },
    { label: "Timezone", value: profile.timezone },
    { label: "Primary contact email", value: primaryContactEmail },
    { label: "Primary contact phone", value: profile.primary_contact_phone },
    { label: "Website", value: profile.website },
    { label: "Service area", value: profile.service_area_summary },
    { label: "After-hours instructions", value: profile.after_hours_instructions },
    { label: "Primary contact", value: profile.primary_contact_name }
  ];

  const visibleFields = fields.filter((field) => hasValue(field.value));
  const isIncomplete = visibleFields.length < fields.length;

  return (
    <section className="panel stack">
      <h1>Business Profile</h1>
      <p className="muted">Your company details used for onboarding, service setup, and support coordination.</p>
      {isIncomplete ? (
        <div className="alert alert-warning">Some profile details are still being completed during onboarding.</div>
      ) : null}
      {visibleFields.length === 0 ? (
        <p className="muted">No business profile details are available yet.</p>
      ) : (
        visibleFields.map((field) => row(field.label, field.value!))
      )}
    </section>
  );
};
