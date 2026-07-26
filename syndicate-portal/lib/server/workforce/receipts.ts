import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { SessionMe } from "@/lib/types/portal";
import { workforceReceipts } from "@/lib/server/db/schema";
import { CrmTx, withCrmContext } from "@/lib/server/crm/db-context";
import { type CanonicalEvent, type RedwatchEvidenceRecord, getWorkforceRedwatchClient } from "@/lib/server/workforce/redwatch-client";

type EmitReceiptParams = {
  tx: CrmTx;
  workspaceId: string;
  tenantId: string;
  session: SessionMe | null;
  actorType: "human" | "system" | "service";
  action: string;
  targetType: string;
  targetId?: string | null;
  result?: "success" | "denied" | "pending";
  correlationId?: string;
  causationId?: string;
  payload?: Record<string, unknown>;
  outputRef?: string | null;
  principalId?: string | null;
};

type EmitEvidenceReceiptParams = {
  tx: CrmTx;
  workspaceId: string;
  tenantId: string;
  session: SessionMe | null;
  targetType: string;
  targetId?: string | null;
  evidenceType: string;
  subjectId?: string | null;
  subjectEmail?: string | null;
  subjectHandle?: string | null;
  correlationId?: string;
  causationId?: string;
  outputRef?: string | null;
  payload?: Record<string, unknown>;
};

const producer = {
  service: "bof",
  instance_id: "syndicate-portal",
  version: process.env.VERCEL_GIT_COMMIT_SHA ? `git:${process.env.VERCEL_GIT_COMMIT_SHA}` : "local"
};

const sha256 = (value: string) => `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;

const canonicalJson = (value: unknown) =>
  JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());

export const actorIdentity = (session: SessionMe | null) =>
  session?.user_id ?? session?.subject ?? session?.email ?? "system";

const actorRole = (session: SessionMe | null) => session?.workforce_role ?? session?.role ?? null;

const toResultStatus = (result: "success" | "denied" | "pending") =>
  result === "denied" ? "failure" : result;

const toDidSegment = (value: string) => {
  const normalized = value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (normalized.length >= 3) {
    return normalized.slice(0, 48);
  }

  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 24);
};

const actorSubjectDid = (session: SessionMe | null, actorType: "human" | "system" | "service") => {
  const identity = actorIdentity(session);
  if (actorType === "human") {
    return `did:passport:syndicate:${toDidSegment(identity)}`;
  }

  return `did:passport:syndicate:${actorType === "service" ? "service" : "system"}-${toDidSegment(identity)}`;
};

const buildIdempotencyKey = ({
  correlationId,
  action,
  targetType,
  targetId,
  payload
}: {
  correlationId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  payload: Record<string, unknown>;
}) =>
  `idem_${crypto
    .createHash("sha256")
    .update(JSON.stringify({ correlationId, action, targetType, targetId: targetId ?? null, payload }))
    .digest("hex")}`;

const buildCanonicalEvent = ({
  workspaceId,
  tenantId,
  session,
  actorType,
  action,
  targetType,
  targetId,
  result,
  correlationId,
  causationId,
  payload,
  outputRef,
  principalId
}: Omit<EmitReceiptParams, "tx">): CanonicalEvent => {
  const eventId = `evt_${crypto.randomUUID().replace(/-/g, "")}`;
  const resolvedCorrelationId = correlationId ?? crypto.randomUUID();
  const resolvedPayload = payload ?? {};
  const resolvedResult = result ?? "success";
  return {
    event_id: eventId,
    event_type: action,
    schema_version: "1.0",
    occurred_at: new Date().toISOString(),
    principal_id: principalId ?? tenantId,
    actor: {
      type: actorType,
      subject_did: actorSubjectDid(session, actorType)
    },
    producer,
    idempotency_key: buildIdempotencyKey({
      correlationId: resolvedCorrelationId,
      action,
      targetType,
      targetId,
      payload: resolvedPayload
    }),
    workspace_id: workspaceId,
    correlation_id: resolvedCorrelationId,
    ...(causationId ? { causation_id: causationId } : {}),
    action,
    target: {
      type: targetType,
      id: targetId ?? `${targetType}:none`
    },
    input_hash: sha256(JSON.stringify(resolvedPayload)),
    ...(outputRef ? { output_ref: outputRef } : {}),
    status: toResultStatus(resolvedResult)
  };
};

const buildBridgeMetadata = ({
  event,
  bridgeStatus,
  payload,
  bridgeRecord,
  error
}: {
  event: CanonicalEvent;
  bridgeStatus: "queued" | "emitted" | "failed";
  payload: Record<string, unknown>;
  bridgeRecord?: RedwatchEvidenceRecord;
  error?: string;
}) => ({
  ...payload,
  redwatch: {
    mode: "bridge",
    provider: "redwatch",
    endpoint: "presence-evidence-record",
    canonical_event_id: event.event_id,
    canonical_event_type: event.event_type,
    evidence_id: bridgeRecord?.id ?? null,
    status: bridgeStatus,
    emitted_at: bridgeRecord ? new Date().toISOString() : null,
    error: error ?? null,
    canonical_event_v1: event,
    response:
      bridgeRecord == null
        ? null
        : {
            id: bridgeRecord.id,
            seq: bridgeRecord.seq,
            trace_id: bridgeRecord.traceId ?? null,
            audit_event_id: bridgeRecord.auditEventId ?? null
          }
  }
});

const queueEvidenceEmit = ({
  rowId,
  workspaceId,
  tenantId,
  event,
  payload
}: {
  rowId: string;
  workspaceId: string;
  tenantId: string;
  event: CanonicalEvent;
  payload: Record<string, unknown>;
}) => {
  const client = getWorkforceRedwatchClient();

  void client
    .emitEvidence({
      event,
      metadata: payload
    })
    .then(async (bridgeRecord) => {
      await withCrmContext({ workspace_id: workspaceId, tenant_id: tenantId }, async (tx) => {
        await tx
          .update(workforceReceipts)
          .set({
            payload: buildBridgeMetadata({
              event,
              bridgeStatus: "emitted",
              payload,
              bridgeRecord
            })
          })
          .where(eq(workforceReceipts.id, rowId));
      });
    })
    .catch(async (error: unknown) => {
      const message = error instanceof Error ? error.message : "RedWatch bridge emit failed";
      await withCrmContext({ workspace_id: workspaceId, tenant_id: tenantId }, async (tx) => {
        await tx
          .update(workforceReceipts)
          .set({
            payload: buildBridgeMetadata({
              event,
              bridgeStatus: "failed",
              payload,
              error: message
            })
          })
          .where(eq(workforceReceipts.id, rowId));
      });
    });
};

const persistIndexRow = async ({
  tx,
  workspaceId,
  tenantId,
  session,
  actorType,
  action,
  targetType,
  targetId,
  result,
  correlationId,
  payload,
  event
}: {
  tx: CrmTx;
  workspaceId: string;
  tenantId: string;
  session: SessionMe | null;
  actorType: "human" | "system" | "service";
  action: string;
  targetType: string;
  targetId?: string | null;
  result: "success" | "denied" | "pending";
  correlationId: string;
  payload: Record<string, unknown>;
  event: CanonicalEvent;
}) => {
  const indexedPayload = buildBridgeMetadata({
    event,
    bridgeStatus: "queued",
    payload
  });

  const [indexRow] = await tx
    .insert(workforceReceipts)
    .values({
      workspaceId,
      tenantId,
      actorId: actorIdentity(session),
      actorType,
      actorRole: actorRole(session),
      action,
      targetType,
      targetId: targetId ?? null,
      result,
      correlationId,
      payload: indexedPayload
    })
    .returning();

  queueEvidenceEmit({
    rowId: indexRow.id,
    workspaceId,
    tenantId,
    event,
    payload
  });

  return indexRow;
};

export const emitWorkforceReceipt = async ({
  tx,
  workspaceId,
  tenantId,
  session,
  actorType,
  action,
  targetType,
  targetId,
  result = "success",
  correlationId = crypto.randomUUID(),
  causationId,
  payload = {},
  outputRef,
  principalId
}: EmitReceiptParams) => {
  const client = getWorkforceRedwatchClient();
  const event = client.validateEvent(
    buildCanonicalEvent({
      workspaceId,
      tenantId,
      session,
      actorType,
      action,
      targetType,
      targetId,
      result,
      correlationId,
      causationId,
      payload,
      outputRef,
      principalId
    })
  );

  return persistIndexRow({
    tx,
    workspaceId,
    tenantId,
    session,
    actorType,
    action,
    targetType,
    targetId,
    result,
    correlationId,
    payload,
    event
  });
};

export const emitEvidenceReceipt = async ({
  tx,
  workspaceId,
  tenantId,
  session,
  targetType,
  targetId,
  evidenceType,
  subjectId,
  subjectEmail,
  subjectHandle,
  correlationId = crypto.randomUUID(),
  causationId,
  outputRef,
  payload = {}
}: EmitEvidenceReceiptParams) =>
  emitWorkforceReceipt({
    tx,
    workspaceId,
    tenantId,
    session,
    actorType: "service",
    action: "redwatch.evidence.recorded",
    targetType,
    targetId,
    result: "success",
    correlationId,
    causationId,
    outputRef,
    payload: {
      evidence_type: evidenceType,
      evidence_version: "1.0",
      subject_id: subjectId ?? null,
      subject_email: subjectEmail ?? null,
      subject_handle: subjectHandle ?? null,
      ...payload
    }
  });
