# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dev server

Start: `npm run dev`
Stop: `lsof -ti :3000 | xargs kill -9`
Build: `npm run build`

There is no test suite and no linter configured (`next lint` was removed in Next.js 16).

## This is Next.js 16 — read before writing code

Several conventions changed from earlier versions. Violations cause silent failures or build errors.

**`proxy.ts` is the new `middleware.ts`** — In Next.js 16, the middleware file is `proxy.ts` (not `middleware.ts`). The exported function should be named `proxy`, not `middleware`. This is correct and intentional in this repo.

**`params` and `searchParams` are always async** — Synchronous access was removed in Next.js 16. Always `await params`:
```ts
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

**Turbopack is default** — `npm run dev` uses Turbopack. Dev output goes to `.next/dev`, not `.next`.

**`next lint` is removed** — Run ESLint directly if needed.

**`revalidateTag` requires a second argument** — `revalidateTag('key', 'max')` not `revalidateTag('key')`.

For anything else, read `node_modules/next/dist/docs/` before writing code.

## Architecture

**Stack:** Next.js 16 App Router · Prisma ORM · PostgreSQL (Supabase, via PgBouncer) · NextAuth v5 beta (JWT sessions) · Tailwind CSS v4 · shadcn/ui components

**Data model** (in Prisma schema):
- `Business` — top-level tenant. Has `staff[]` and `templates[]`.
- `StaffMember` — authenticates via email/password. Role is `OWNER` or `STAFF`.
- `CouponTemplate` — defines a coupon type: title, expiry mode (`DAYS_FROM_GENERATION` or `FIXED_DATE`), `maxUses`, `allowSelfClaim`.
- `Coupon` — an individual issued coupon with a unique `code` (CUID), status (`ACTIVE`/`REDEEMED`/`EXPIRED`), and optional recipient info.
- `ScanEvent` — append-only log of `VIEWED` and `REDEEMED` actions on coupons.

**Auth:** `auth.ts` configures NextAuth with a Credentials provider against `StaffMember`. The JWT token carries `id`, `businessId`, `businessName`, `businessSlug`, and `role`. `Session.user` is augmented in `auth.ts` with these fields, so API routes use `const session = await auth(); const user = session.user;` — no casts needed.

**Route structure:**
- `/` — public landing page
- `/auth/login`, `/auth/register` — unauthenticated only (proxy.ts redirects logged-in users away)
- `/dashboard/**` — staff-only (proxy.ts redirects unauthenticated users, pages also check individually)
- `/claim/[templateId]` — public self-claim page for customers (requires `template.allowSelfClaim`)
- `/c/[code]` — public coupon display page showing QR code and status
- `app/api/**` — all API routes; most require `session`

**Key data flow for self-claim:** Customer visits `/claim/[templateId]` → submits name/phone → `POST /api/templates/[id]/coupons` (currently broken: this endpoint requires auth) → redirected to `/c/[coupon.code]`.

**Prisma client:** Singleton at `lib/prisma.ts` using `globalThis` to survive hot reloads in dev.

**Coupon `EXPIRED` status is computed on the fly, not persisted.** The DB only ever stores `ACTIVE` or `REDEEMED`. UI and API derive the effective status with `coupon.status === "ACTIVE" && new Date(coupon.expiresAt) < new Date()`. Do not write queries that filter by `status: "EXPIRED"` — they will return zero rows. If reporting on expired coupons is needed, filter `status: "ACTIVE"` plus `expiresAt: { lt: new Date() }`.

**File uploads:** Business logos are written to `public/logos/{businessId}.{ext}` and served statically by Next.js.

**Known issues** (see `needtofix.md`): file upload has no MIME/size validation; coupon redemption has a race condition; `maxUses` is never enforced; self-claim endpoint requires auth; `NEXTAUTH_SECRET` is a placeholder.
