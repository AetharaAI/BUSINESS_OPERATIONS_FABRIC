import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/server/env";

export type PandaDocCreatePayload = {
  contractId: string;
  title: string;
  approvedTemplateId: string | null;
  recipients: Array<{ name: string; email: string; role: string; routingOrder: number }>;
};

export type PandaDocSendPayload = {
  externalContractId: string;
  contractId: string;
};

export type PandaDocContractSnapshot = {
  externalContractId: string;
  status: "generated" | "sent" | "viewed" | "completed";
  documentUrl: string | null;
};

const normalizeHex = (value: string): Buffer => Buffer.from(value.trim(), "hex");

export const verifyPandadocWebhookSignature = (body: string, signature: string): boolean => {
  if (!serverEnv.pandadocWebhookSecret) {
    throw new Error("PANDADOC_WEBHOOK_SECRET is not configured");
  }

  const expected = createHmac("sha256", serverEnv.pandadocWebhookSecret).update(body).digest("hex");
  const expectedBuffer = normalizeHex(expected);
  const actualBuffer = normalizeHex(signature);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
};

export const signPandadocWebhookPayload = (body: string): string => {
  if (!serverEnv.pandadocWebhookSecret) {
    throw new Error("PANDADOC_WEBHOOK_SECRET is not configured");
  }

  return createHmac("sha256", serverEnv.pandadocWebhookSecret).update(body).digest("hex");
};

export const pandadocAdapter = {
  async createContract(payload: PandaDocCreatePayload): Promise<PandaDocContractSnapshot> {
    if (serverEnv.pandadocMode !== "stub") {
      throw new Error("Live PandaDoc calls are out of scope for this slice");
    }

    return {
      externalContractId: `pd_${randomUUID()}`,
      status: "generated",
      documentUrl: `https://stub.pandadoc.local/contracts/${payload.contractId}`
    };
  },

  async sendContract(payload: PandaDocSendPayload): Promise<PandaDocContractSnapshot> {
    if (serverEnv.pandadocMode !== "stub") {
      throw new Error("Live PandaDoc calls are out of scope for this slice");
    }

    return {
      externalContractId: payload.externalContractId,
      status: "sent",
      documentUrl: `https://stub.pandadoc.local/contracts/${payload.contractId}`
    };
  },

  async getContract(externalContractId: string): Promise<PandaDocContractSnapshot> {
    if (serverEnv.pandadocMode !== "stub") {
      throw new Error("Live PandaDoc calls are out of scope for this slice");
    }

    return {
      externalContractId,
      status: "generated",
      documentUrl: `https://stub.pandadoc.local/contracts/${externalContractId}`
    };
  }
};
