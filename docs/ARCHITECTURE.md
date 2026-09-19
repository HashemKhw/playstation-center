# PlayStation Gaming Center — Architecture

Local-first POS, session, and accounting system. SQLite is the source of truth. The browser timer is display-only.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| UI | React 18 + TypeScript + Vite + Tailwind | Fast local SPA, desktop-first POS |
| API | Express + TypeScript | Simple local HTTP API, no cloud |
| DB | SQLite (WAL) + Prisma | File persistence, crash-safe, migrations |
| Shared domain | `shared/` package | Money and billing live in one place |
| Tests | Vitest | Money, billing, pause, checkout rules |

Run: `npm install` then `npm run dev` (API `:3001`, UI `:5173` with proxy).

## Session-centric model

A **session** is the business object. A screen is occupancy + config. Payments, extras, pauses, and activity events hang off the session.

```
Screen ──< Session ──< SessionExtra
                 ├──< SessionPause
                 ├──< Payment
                 └──< ActivityEvent
PricingRule ──< Screen / Session (snapshot on start)
Product ──< SessionExtra (name/price snapshot)
Settings (key/value)
```

## Timer (source of truth)

```
billableSeconds = now - startTime - sum(pause intervals) - (open pause)
```

Never increment a stored `seconds` counter. After restart, reconstruct from timestamps.

## Money

All amounts are **integer fils** (1 JD = 100 fils). Display formatting only at the UI/API boundary (`formatJod`).

## Billing methods

- **PER_MINUTE**: `round(billableSeconds * hourlyRateFils / 3600)`
- **PER_STARTED_HOUR**: `0` if no billable time, else `ceil(seconds/3600) * rate`
- **FIXED_BLOCKS**: smallest configured block whose duration covers billable time; beyond the largest block, stack the largest block then cover remainder with the same rule

Pricing rule fields are **snapshotted onto the session** at start (and when time is added, planned duration changes — not the rate).

## Fixed-duration sessions

`plannedDurationSeconds` is the purchased window. Timer shows remaining time. At expiry the session stays **RUNNING** with status flag `timeExpired` until staff stop, add time, or continue (overtime bills with the same snapshotted rule).

## Checkout

Stop timer → freeze `endTime` + costs → `CHECKOUT`. Completing payment is a single DB transaction: session `COMPLETED`, payment row, screen freed. Incomplete cash is rejected.

## Risks

| Risk | Mitigation |
| --- | --- |
| Timer drift / refresh | Timestamp math, not JS counters |
| SQLite concurrent writes | Single local process; Prisma transactions |
| Product/price edits | Snapshots on extras and pricing |
| Double occupancy | Unique partial constraint: one non-terminal session per screen |
| Double payment | Payment only from CHECKOUT → COMPLETED in one txn |
| System clock changes | Document; bill from wall clock as recorded |
| Backup overwrite | Explicit confirm + replace SQLite file |

## Ambiguities — defaults chosen

- **Overtime after fixed duration**: keep session running; keep billing; show TIME EXPIRED.
- **Per-minute rounding**: nearest fils.
- **Fixed blocks vs leftover minutes**: smallest covering block; overtime uses additional blocks.
- **Zero elapsed**: gaming cost 0.
- **Discounts**: column exists, always 0 in MVP.
- **Stock**: optional; decrement when adding catalog extras if `stockQuantity` is set.
- **Timezone for “today”**: `Asia/Amman`.
- **Auth**: none in MVP.
- **Delete screen**: blocked if any session exists.
- **Card/other payments**: configurable methods; cash computes change.

## Implementation roadmap

1. Foundation (this repo) → 2. Schema/seed → 3. Screens → 4. Session engine + tests → 5. Extras → 6. Checkout → 7. History → 8. Reports → 9. UI polish → 10. Tests → 11. QA scenario.
