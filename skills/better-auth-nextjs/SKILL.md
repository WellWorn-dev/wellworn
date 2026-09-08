---
name: better-auth-nextjs
description: Set up Better Auth 1.7 in a Next.js 16 App Router project with Drizzle on Postgres, email + password with verification, Google login, and the organization plugin. Use when a verdict picked Better Auth or when adding auth to a Next.js app.
---

# Better Auth in Next.js (App Router, Drizzle, Postgres)

Verified against better-auth 1.7.3, Next.js 16.3, drizzle-orm 0.45 on 2026-09-08.

## Steps

1. Install: `pnpm add better-auth @better-auth/api-key` (only add the api-key package if you need keys).
2. Create `src/lib/auth.ts` on the server:
   - `betterAuth({ database: drizzleAdapter(db, { provider: "pg", schema }), emailAndPassword: { enabled: true, requireEmailVerification: true }, socialProviders: { google: { clientId, clientSecret } }, plugins: [organization()] })`
   - Pass the full Drizzle `schema` object. Plugins add tables; without the schema the adapter fails at runtime, not at build.
3. Generate and migrate the auth tables: `npx @better-auth/cli generate`, then run your migration tool. Re-run generate after adding any plugin.
4. Mount the handler: `src/app/api/auth/[...all]/route.ts` exporting `toNextJsHandler(auth)`.
5. Client: `src/lib/auth-client.ts` with `createAuthClient({ plugins: [organizationClient()] })`.
6. Protect server code with `auth.api.getSession({ headers: await headers() })`; never trust a client-side session for authorization.

## Traps

- Cookie cache: role and plan changes wait up to 5 minutes. For role-gated routes call `getSession` with `disableCookieCache: true`, or disable `session.cookieCache`.
- Email verification links point at `baseURL`; set `BETTER_AUTH_URL` to the public origin, including behind a tunnel or proxy.
- The organization plugin's `activeOrganizationId` lives on the session; set it after sign-in or every org query returns nothing.

## Check

- Sign up, receive the verification mail, sign in, `getSession` returns the user with `activeOrganizationId` set.
