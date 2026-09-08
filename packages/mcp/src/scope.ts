import type { Request } from "express";
import type { Limiter, CheckResult } from "@wellworn/ratelimit";

export type Scope =
  | { kind: "anonymous"; id: string }
  | { kind: "org"; id: string; keyId: string; burst: number; cap: number };

export type KeyResolver = (token: string) => Promise<{ orgId: string; keyId: string; burst: number; cap: number } | null>;

export const ANON_BURST = 10;
export const ANON_DAILY_CAP = 60;

export function clientIp(req: Request, trustProxy: boolean): string {
  const cf = req.header("cf-connecting-ip");
  if (trustProxy && cf) return cf;
  const xff = req.header("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.socket.remoteAddress ?? "0.0.0.0";
}

export async function resolveScope(req: Request, trustProxy: boolean, resolveKey: KeyResolver): Promise<Scope | { kind: "invalid_key" }> {
  const auth = req.header("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return { kind: "anonymous", id: clientIp(req, trustProxy) };
  const key = await resolveKey(token);
  if (!key) return { kind: "invalid_key" };
  return { kind: "org", id: key.orgId, keyId: key.keyId, burst: key.burst, cap: key.cap };
}

export function checkScope(limiter: Limiter, scope: Scope): Promise<CheckResult> {
  return scope.kind === "anonymous"
    ? limiter.check({ scope: "ip", id: scope.id, burst: ANON_BURST, cap: ANON_DAILY_CAP, window: "day" })
    : limiter.check({ scope: "org", id: scope.id, burst: scope.burst, cap: scope.cap, window: "month" });
}

export function limitLine(scope: Scope, r: CheckResult): string {
  const cap = scope.kind === "anonymous" ? ANON_DAILY_CAP : scope.cap;
  const label = scope.kind === "anonymous" ? "no-key" : "plan";
  const period = scope.kind === "anonymous" ? "today" : "this month";
  return `limit reached: ${label} ${cap - r.remaining}/${cap} ${period} (resets ${r.resetAt}). Free key or plans: https://wellworn.dev/pricing`;
}
