import type Redis from "ioredis";

export type Scope = "ip" | "org";
export type Window = "day" | "month";

export type CheckInput = { scope: Scope; id: string; burst: number; cap: number; window: Window };
export type CheckResult = { allowed: boolean; remaining: number; resetAt: string; reason?: "burst" | "cap" | "subnet" };

export type Limiter = { check(input: CheckInput): Promise<CheckResult> };

/** Distinct IPs of one /24 allowed to reach the daily cap before the whole /24 is treated as one scope. */
export const SUBNET_IP_THRESHOLD = 10;

// One round trip: burst counter (60 s), window counter (expires at the window end),
// and for IPs a per-/24 set of hosts that hit the cap today.
// Returns {allowed, remaining, reason} where reason is "" | "burst" | "cap" | "subnet".
const LUA = `
local burstKey, capKey, subnetKey = KEYS[1], KEYS[2], KEYS[3]
local burst, cap, resetAt, subnetThreshold, host = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4]), ARGV[5]
if subnetKey ~= '' and redis.call('SCARD', subnetKey) > subnetThreshold then
  local used = tonumber(redis.call('GET', capKey) or '0')
  return {0, math.max(cap - used, 0), 'subnet'}
end
local used = tonumber(redis.call('GET', capKey) or '0')
if used >= cap then
  if subnetKey ~= '' then redis.call('SADD', subnetKey, host); redis.call('EXPIREAT', subnetKey, resetAt) end
  return {0, 0, 'cap'}
end
local b = redis.call('INCR', burstKey)
if b == 1 then redis.call('EXPIRE', burstKey, 60) end
if b > burst then
  return {0, cap - used, 'burst'}
end
local n = redis.call('INCR', capKey)
if n == 1 then redis.call('EXPIREAT', capKey, resetAt) end
if n >= cap and subnetKey ~= '' then redis.call('SADD', subnetKey, host); redis.call('EXPIREAT', subnetKey, resetAt) end
return {1, cap - n, ''}
`;

function windowEnd(window: Window, now = new Date()): Date {
  return window === "day"
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

function windowLabel(window: Window, now = new Date()): string {
  const iso = now.toISOString();
  return window === "day" ? iso.slice(0, 10) : iso.slice(0, 7);
}

export function createLimiter(redis: Redis): Limiter {
  return {
    async check(input) {
      const now = new Date();
      const reset = windowEnd(input.window, now);
      const label = windowLabel(input.window, now);
      const burstKey = `ww:burst:${input.scope}:${input.id}`;
      const capKey = `ww:cap:${input.scope}:${input.id}:${label}`;
      const subnet = input.scope === "ip" ? input.id.split(".").slice(0, 3).join(".") : "";
      const subnetKey = subnet ? `ww:subnet:${subnet}:${label}` : "";
      const [allowed, remaining, reason] = (await redis.eval(
        LUA, 3, burstKey, capKey, subnetKey,
        String(input.burst), String(input.cap), String(Math.floor(reset.getTime() / 1000)), String(SUBNET_IP_THRESHOLD), input.id,
      )) as [number, number, string];
      return {
        allowed: allowed === 1,
        remaining: Number(remaining),
        resetAt: reset.toISOString(),
        ...(reason ? { reason: reason as CheckResult["reason"] } : {}),
      };
    },
  };
}
