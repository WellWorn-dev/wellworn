import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Redis from "ioredis";
import { createLimiter, type Limiter } from "../src/index";

const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6381";
let redis: Redis;
let limiter: Limiter;

beforeAll(async () => {
  redis = new Redis(url);
  await redis.flushdb();
  limiter = createLimiter(redis);
});
afterAll(async () => { await redis.quit(); });

describe("limiter", () => {
  it("allows the burst then blocks the next call within the minute", async () => {
    for (let i = 0; i < 10; i++) {
      const r = await limiter.check({ scope: "ip", id: "1.2.3.4", burst: 10, cap: 60, window: "day" });
      expect(r.allowed).toBe(true);
    }
    const blocked = await limiter.check({ scope: "ip", id: "1.2.3.4", burst: 10, cap: 60, window: "day" });
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe("burst");
  });

  it("counts the daily cap per scope id and reports remaining and resetAt at UTC midnight", async () => {
    let last;
    for (let i = 0; i < 60; i++) {
      last = await limiter.check({ scope: "ip", id: "5.6.7.8", burst: 1000, cap: 60, window: "day" });
    }
    expect(last!.allowed).toBe(true);
    expect(last!.remaining).toBe(0);
    const blocked = await limiter.check({ scope: "ip", id: "5.6.7.8", burst: 1000, cap: 60, window: "day" });
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe("cap");
    const reset = new Date(blocked.resetAt);
    expect(reset.getUTCHours()).toBe(0);
    expect(reset.getUTCMinutes()).toBe(0);
    expect(reset.getTime()).toBeGreaterThan(Date.now());
    const ttl = await redis.ttl(`ww:cap:ip:5.6.7.8:${new Date().toISOString().slice(0, 10)}`);
    expect(ttl).toBeGreaterThan(0);
  });

  it("uses a monthly window for orgs that resets on the 1st", async () => {
    const r = await limiter.check({ scope: "org", id: "o1", burst: 30, cap: 2000, window: "month" });
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(1999);
    const reset = new Date(r.resetAt);
    expect(reset.getUTCDate()).toBe(1);
    expect(reset.getUTCHours()).toBe(0);
  });

  it("throttles a /24 as one scope once 11 distinct IPs hit the cap in a day", async () => {
    for (let host = 1; host <= 11; host++) {
      for (let i = 0; i < 3; i++) {
        await limiter.check({ scope: "ip", id: `9.9.9.${host}`, burst: 1000, cap: 3, window: "day" });
      }
    }
    const fresh = await limiter.check({ scope: "ip", id: "9.9.9.200", burst: 1000, cap: 3, window: "day" });
    expect(fresh.allowed).toBe(false);
    expect(fresh.reason).toBe("subnet");
  });
});
