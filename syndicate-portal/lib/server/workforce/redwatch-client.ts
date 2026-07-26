import crypto from "node:crypto";
import {
  createMemoryRedwatchTransport,
  createRedwatchClient,
  type CanonicalEvent
} from "apis-verify/redwatch-client";
import { serverEnv } from "@/lib/server/env";

type BridgeDecision = "allow" | "deny" | "approval_required";
type BridgeRiskTier = "read" | "low" | "medium" | "high" | "critical";
type BridgeOutcome = "ok" | "error" | "pending";

export type { CanonicalEvent };

export type RedwatchEvidenceIngestRequest = {
  capturedAt?: string;
  node?: string | null;
  circuit: string;
  toolId: string;
  actor: {
    kind: "human" | "agent";
    principal: string;
  };
  mandate?: string | null;
  decision: BridgeDecision;
  riskTier: BridgeRiskTier;
  reversible: boolean;
  inputDigest?: string | null;
  outcome?: BridgeOutcome | null;
  detail?: string | null;
};

export type RedwatchEvidenceRecord = RedwatchEvidenceIngestRequest & {
  id: string;
  seq: number;
  hash: string;
  prevHash: string;
  traceId?: string | null;
  auditEventId?: string | null;
  artifactStorageRef?: string | null;
  artifactHash?: string | null;
  artifactHashAlgorithm?: string | null;
};

type EmitEvidenceParams = {
  event: CanonicalEvent;
  metadata?: Record<string, unknown>;
};

type WorkforceRedwatchClient = {
  validateEvent: (event: CanonicalEvent) => CanonicalEvent;
  emitEvidence: (params: EmitEvidenceParams) => Promise<RedwatchEvidenceRecord>;
};

declare global {
  // eslint-disable-next-line no-var
  var __bofRedwatchClient: WorkforceRedwatchClient | undefined;
}

const validator = createRedwatchClient({
  transport: createMemoryRedwatchTransport()
});

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => stableValue(entry));
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        const next = (value as Record<string, unknown>)[key];
        if (next !== undefined) {
          acc[key] = stableValue(next);
        }
        return acc;
      }, {});
  }

  return value;
};

const canonicalJson = (value: unknown) => JSON.stringify(stableValue(value));
const sha256 = (value: string) => `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const ensureLeadingSlash = (value: string) => (value.startsWith("/") ? value : `/${value}`);

const toDecision = (event: CanonicalEvent): BridgeDecision => {
  if (event.status === "failure") {
    return "deny";
  }

  if (event.status === "pending") {
    return "approval_required";
  }

  return "allow";
};

const toOutcome = (event: CanonicalEvent): BridgeOutcome => {
  if (event.status === "failure") {
    return "error";
  }

  if (event.status === "pending") {
    return "pending";
  }

  return "ok";
};

const toRiskTier = (event: CanonicalEvent): BridgeRiskTier => {
  const action = `${event.action} ${event.event_type}`.toLowerCase();
  if (action.includes("payment") || action.includes("contract")) {
    return "high";
  }

  if (action.includes("invite") || action.includes("billing") || action.includes("tenant")) {
    return "medium";
  }

  return "low";
};

const isReversible = (event: CanonicalEvent): boolean => {
  const action = `${event.action} ${event.event_type}`.toLowerCase();
  return !(action.includes("payment") || action.includes("completed") || action.includes("accepted"));
};

const toCircuit = (event: CanonicalEvent): string => {
  const area = event.target?.type ?? "event";
  return `bof.crm.${area}`;
};

const toNode = (event: CanonicalEvent): string =>
  [event.producer.service, event.producer.instance_id].filter(Boolean).join("/") || "bof";

const toEvidenceRequest = ({ event, metadata = {} }: EmitEvidenceParams): RedwatchEvidenceIngestRequest => ({
  capturedAt: event.occurred_at,
  node: toNode(event),
  circuit: toCircuit(event),
  toolId: event.action,
  actor: {
    kind: event.actor.type === "human" ? "human" : "agent",
    principal: event.actor.passport_id ?? event.actor.subject_did
  },
  mandate: event.actor.mandate_id ?? null,
  decision: toDecision(event),
  riskTier: toRiskTier(event),
  reversible: isReversible(event),
  inputDigest: event.input_hash ?? null,
  outcome: toOutcome(event),
  detail: canonicalJson({
    bridge: {
      mode: "presence-evidence-record",
      source: "bof",
      emitted_at: new Date().toISOString()
    },
    canonical_event_v1: event,
    metadata
  })
});

const createMemoryBridgeRecord = (request: RedwatchEvidenceIngestRequest): RedwatchEvidenceRecord => {
  const digest = canonicalJson(request);
  return {
    ...request,
    id: `evidence_${crypto.randomUUID().replace(/-/g, "")}`,
    seq: 0,
    hash: sha256(digest),
    prevHash: "GENESIS",
    traceId: null,
    auditEventId: null,
    artifactStorageRef: null,
    artifactHash: null,
    artifactHashAlgorithm: null
  };
};

const buildClient = (): WorkforceRedwatchClient => {
  if (serverEnv.redwatchClientMode === "http") {
    const endpointPath = ensureLeadingSlash(serverEnv.redwatchEmitReceiptSyncPath ?? "/v1/evidence");
    const endpoint = `${trimTrailingSlash(serverEnv.redwatchServiceBaseUrl)}${endpointPath}`;
    const headers: Record<string, string> = {
      "content-type": "application/json"
    };

    if (serverEnv.redwatchApiKeyHeaderName && serverEnv.redwatchApiKey) {
      headers[serverEnv.redwatchApiKeyHeaderName] = serverEnv.redwatchApiKey;
    }

    return {
      validateEvent: validator.validateEvent,
      emitEvidence: async ({ event, metadata }) => {
        const requestBody = toEvidenceRequest({ event, metadata });
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const detail = await response.text();
          throw new Error(`RedWatch evidence emit failed (${response.status}): ${detail}`);
        }

        return (await response.json()) as RedwatchEvidenceRecord;
      }
    };
  }

  if (serverEnv.redwatchClientMode === "memory") {
    return {
      validateEvent: validator.validateEvent,
      emitEvidence: async ({ event, metadata }) => createMemoryBridgeRecord(toEvidenceRequest({ event, metadata }))
    };
  }

  throw new Error("REDWATCH_CLIENT_MODE is disabled; evidence emission is not configured");
};

export const getWorkforceRedwatchClient = (): WorkforceRedwatchClient => {
  if (global.__bofRedwatchClient) {
    return global.__bofRedwatchClient;
  }

  const client = buildClient();
  if (process.env.NODE_ENV !== "production") {
    global.__bofRedwatchClient = client;
  }

  return client;
};
