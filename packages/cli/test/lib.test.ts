import { describe, expect, it } from "vitest";
import { dependenciesOf, trapsUrl } from "../src/lib";

describe("dependenciesOf", () => {
  it("reads every dependency block of a package.json and strips range operators", () => {
    const manifest = JSON.stringify({ dependencies: { "better-auth": "^1.7.3", "@tanstack/react-query": "~5.90.0" }, devDependencies: { vitest: "3.2.4" }, peerDependencies: { react: ">=19" } });
    expect(dependenciesOf("package.json", manifest)).toEqual([
      { library: "@tanstack/react-query", version: "5.90.0" },
      { library: "better-auth", version: "1.7.3" },
      { library: "react", version: "19" },
      { library: "vitest", version: "3.2.4" },
    ]);
  });
  it("reads requirements.txt pins and bare names", () => {
    expect(dependenciesOf("requirements.txt", "django==5.1.2\nrequests>=2.32\n# comment\nhttpx\n")).toEqual([
      { library: "django", version: "5.1.2" },
      { library: "httpx", version: undefined },
      { library: "requests", version: "2.32" },
    ]);
  });
  it("returns nothing for a manifest it does not know", () => {
    expect(dependenciesOf("Cargo.toml", "[dependencies]\nserde = \"1\"")).toEqual([]);
  });
});

describe("trapsUrl", () => {
  it("encodes the library and adds the version only when known", () => {
    expect(trapsUrl("@tanstack/react-query", "5.90.0")).toBe("https://mcp.wellworn.dev/api/traps?library=%40tanstack%2Freact-query&version=5.90.0");
    expect(trapsUrl("zod")).toBe("https://mcp.wellworn.dev/api/traps?library=zod");
  });
});
