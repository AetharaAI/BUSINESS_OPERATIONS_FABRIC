import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

type InviteTokenPayload = {
  email: string;
  tenant_id: string;
  full_name?: string;
  role: string;
  temp_password: string;
  expires_at: string;
};

const base64urlEncode = (value: string): string => Buffer.from(value, "utf8").toString("base64url");
const base64urlDecode = (value: string): string => Buffer.from(value, "base64url").toString("utf8");

const requireInviteSecret = (): string => {
  const secret = process.env.PORTAL_INVITE_TOKEN_SECRET || "";
  if (!secret) {
    throw new Error("PORTAL_INVITE_TOKEN_SECRET is required for invite token generation");
  }
  return secret;
};

const sign = (payloadPart: string): string => {
  const secret = requireInviteSecret();
  return createHmac("sha256", secret).update(payloadPart).digest("base64url");
};

export const generateTemporaryPassword = (): string =>
  `${randomBytes(3).toString("hex")}#${randomBytes(4).toString("base64url")}`;

export const createInviteToken = (payload: InviteTokenPayload): string => {
  const payloadPart = base64urlEncode(JSON.stringify(payload));
  const sig = sign(payloadPart);
  return `${payloadPart}.${sig}`;
};

export const parseInviteToken = (token: string): InviteTokenPayload => {
  const [payloadPart, sigPart] = token.split(".");
  if (!payloadPart || !sigPart) {
    throw new Error("Invalid token format");
  }

  const expected = sign(payloadPart);
  const left = Buffer.from(sigPart);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("Invalid token signature");
  }

  const payload = JSON.parse(base64urlDecode(payloadPart)) as InviteTokenPayload;
  if (!payload.expires_at || Date.now() > Date.parse(payload.expires_at)) {
    throw new Error("Invite token expired");
  }

  return payload;
};
