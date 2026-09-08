import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { clientIp } from "../src/scope";

const req = (headers: Record<string, string>, remote = "10.0.0.9") =>
  ({ header: (k: string) => headers[k.toLowerCase()], socket: { remoteAddress: remote } }) as unknown as Request;

describe("clientIp", () => {
  it("takes cf-connecting-ip behind the proxy and the socket address without it", () => {
    const headers = { "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" };
    expect(clientIp(req(headers), true)).toBe("203.0.113.7");
    expect(clientIp(req(headers), false)).toBe("10.0.0.9");
  });

  it("ignores a forwarded header the caller sent when nothing is proxying", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4" }), false)).toBe("10.0.0.9");
  });

  it("falls back to the forwarded chain behind the proxy when Cloudflare did not set its header", () => {
    expect(clientIp(req({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" }), true)).toBe("198.51.100.1");
  });
});
