# PlayStation Gaming Center POS

Local-first session, timer, extras, checkout, and accounting system for a PlayStation café. All data is stored in SQLite on this computer. No internet connection is required after dependencies are installed.

## Requirements

- Node.js 20+

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The API runs at [http://localhost:3001](http://localhost:3001).

The database file is `data/center.sqlite`.

`npm install` generates the Prisma client, applies local SQLite migrations, and
idempotently installs the development starter screens/products.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start API + UI |
| `npm test` | Money, billing, and session engine tests |
| `npm run db:seed -w server` | Seed screens and products (safe to re-run) |

## Architecture

See `docs/ARCHITECTURE.md`. Money is stored as integer fils (1.00 JD = 100 fils). The session timer is reconstructed from timestamps after refresh or restart.
