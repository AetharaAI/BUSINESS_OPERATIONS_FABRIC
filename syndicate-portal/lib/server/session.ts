import { cookies } from "next/headers";
import { serverEnv } from "@/lib/server/env";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export const readSessionToken = async (): Promise<string | null> => {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE_NAME)?.value ?? null;
};

export const writeSessionToken = async (token: string): Promise<void> => {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: serverEnv.cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 10
  });
};

export const clearSessionToken = async (): Promise<void> => {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);
};
