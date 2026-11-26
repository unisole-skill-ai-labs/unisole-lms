import crypto from "crypto";
import { Page } from "@playwright/test";

export const ENGINE_URL = "http://127.0.0.1:3000";
export const LMS_URL = "http://localhost:5174";
const JWT_SECRET = process.env.JWT_SECRET || "unisole-secret-key";

export interface TestUser {
  id: string;
  phone: string;
  name: string;
  role: string;
  roles: string[];
}

export const ADMIN_USER: TestUser = {
  id: "usr_admin",
  phone: "+919999999999",
  name: "Super Admin",
  role: "SUPER_ADMIN",
  roles: ["SUPER_ADMIN"],
};

export const ENROLLED_STUDENT: TestUser = {
  id: "usr_133",
  phone: "+919876500003",
  name: "Learner 0003",
  role: "STUDENT",
  roles: ["STUDENT"],
};

export const NON_ENROLLED_STUDENT: TestUser = {
  id: "usr_2",
  phone: "+919876543211",
  name: "Rahul Sharma",
  role: "STUDENT",
  roles: ["STUDENT"],
};

function base64UrlEncode(obj: any): string {
  return Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function signJwt(user: TestUser): string {
  const header = base64UrlEncode({ alg: "HS256", typ: "JWT" });
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode({
    ...user,
    iat: now,
    exp: now + 60 * 60 * 24,
  });
  const sig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${header}.${payload}.${sig}`;
}

export async function loginAs(page: Page, user: TestUser): Promise<string> {
  const token = signJwt(user);
  await page.addInitScript(
    ({ tok, usr }) => {
      localStorage.setItem("unisole-app:token", tok);
      localStorage.setItem("unisole-app:user", JSON.stringify(usr));
    },
    { tok: token, usr: user }
  );
  return token;
}

export async function apiRequest(
  token: string,
  method: string,
  path: string,
  body?: any
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${ENGINE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}
