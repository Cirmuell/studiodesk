# StudioDesk

> AI-grounded pricing and business documents for independent creatives.

StudioDesk is an AI-powered creative business assistant designed for freelancers, studios, and independent creatives — with a focus on the Nigerian market. It helps you price projects intelligently, generate professional proposals, invoices, contracts, and receipts, and manage clients and projects in one place.

---

## Features

### AI Pricing Studio
- Run AI-powered pricing analysis grounded in your studio profile, client tier, and project scope.
- Get a recommended budget, price range, and confidence level.
- View detailed line-item breakdowns with rationale.
- Supports Standard, Preferred, and Enterprise client tiers.

### AI Document Generator
- Generate draft **proposals**, **invoices**, **contracts**, and **receipts** with one click.
- AI drafts are informed by your studio profile, project scope, client details, and prior pricing analysis.
- Inline editor to review, edit, and refine every section.
- Auto-calculates subtotal, tax (7.5% Nigerian VAT), and total.
- Download polished PDFs after saving.

### Project Management
- Create and track projects with custom or preset templates (Branding, Web, App, Photography, Social, Video).
- Auto-compiles deliverables into scope summaries.
- Filter by status: Lead, Active, Completed, Archived.

### Client CRM
- Manage client relationships with name, company, email, and tier.
- Visual tier badges (Standard · Preferred · Enterprise).
- Searchable client list.

### Dashboard
- At-a-glance view of monthly invoiced totals.
- Quick-access cards for pricing and document creation.
- Latest pricing insight preview.
- Recent projects and documents.

### Onboarding
- 4-step onboarding wizard to configure your studio identity, creative disciplines, day rates, brand colors, and bank details.
- Personalizes all AI outputs from day one.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, file-based routing, SSR/SSG) |
| Styling | Tailwind CSS v4 with custom semantic design tokens |
| UI Components | Radix UI primitives + shadcn/ui |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| AI | Lovable AI Gateway (via `ai` SDK) |
| PDF | PDF-lib (client-side PDF generation) |
| State & Data | TanStack Query (React Query) |
| Forms | React Hook Form + Zod |
| PWA | Vite PWA plugin with Workbox |

---

## Getting Started

### Prerequisites
- [Bun](https://bun.sh) (recommended) or Node.js 20+
- A Supabase project (or use Lovable Cloud)
- AI Gateway access (configured via Lovable Cloud)

### Installation

```bash
# Clone the repo
git clone https://github.com/codex/testG.git
cd testG

# Install dependencies
bun install

# Set up environment variables
# Vite will read these automatically in dev:
#   VITE_SUPABASE_URL=
#   VITE_SUPABASE_PUBLISHABLE_KEY=
#   SUPABASE_SERVICE_ROLE_KEY=   # server-only

# Run the dev server
bun dev
```

### Build

```bash
bun run build
```

---

## Project Structure

```
src/
├── components/          # Reusable UI components (AppShell, badges, share panel)
│   └── ui/               # shadcn/ui primitives
├── hooks/               # Custom React hooks (use-mobile)
├── integrations/
│   ├── lovable/         # Lovable integration helpers
│   └── supabase/        # Supabase client, auth middleware, types
├── lib/                 # Server functions, utilities, formatting
│   ├── *.functions.ts   # createServerFn modules (documents, pricing, projects, etc.)
│   ├── ai-gateway.server.ts
│   ├── pdf.server.ts
│   └── security.server.ts
├── pwa/                 # PWA registration logic
├── routes/              # TanStack file-based routes
│   ├── __root.tsx       # Root layout (head meta, providers, PWA)
│   ├── auth.tsx         # Auth/sign-in page
│   ├── _authenticated/    # Protected routes (dashboard, docs, pricing, etc.)
│   │   ├── index.tsx    # Dashboard
│   │   ├── documents.tsx
│   │   ├── documents.$id.tsx
│   │   ├── pricing.tsx
│   │   ├── projects.tsx
│   │   ├── projects.$id.tsx
│   │   ├── clients.tsx
│   │   ├── settings.tsx
│   │   └── admin.tsx
│   └── api/             # Public & authenticated API routes
│       ├── documents.$id.pdf.ts
│       └── public/portal.$token.pdf.ts
├── router.tsx           # Router configuration
├── server.ts            # Server entry
├── start.ts             # TanStack Start instance config
└── styles.css           # Global styles + Tailwind theme tokens
```

---

## Key Workflows

### Draft → Edit → Export
1. **Draft** — Tap "New document" and select type (proposal, invoice, contract, receipt). AI generates a complete draft using your studio context.
2. **Edit** — Review and edit title, sections, line items, terms, and payment instructions inline.
3. **Save** — Persist your edits.
4. **Export** — Download a professional PDF ready to send to clients.

### Pricing a Project
1. Create a project with scope and deliverables.
2. Go to **Pricing Studio**, select the project (or enter custom scope).
3. Set client tier and estimated hours.
4. Run the AI analysis to get a grounded estimate.
5. Use that estimate to generate an invoice or proposal in one click.

---

## Database Schema (Supabase)

### Core Tables
| Table | Purpose |
|-------|---------|
| `profiles` | Studio identity, brand config, bank details, currency, onboarding state |
| `clients` | Client contacts with tier (standard/preferred/enterprise) |
| `projects` | Projects linked to clients, with scope, budget, status |
| `documents` | Generated docs (proposals, invoices, contracts, receipts) with JSON content |
| `pricing_runs` | AI pricing analysis results per project |
| `rate_cards` | Custom rate cards per client tier |

### Security
- Row Level Security (RLS) enabled on all tables.
- Auth via Supabase Auth with JWT sessions.
- `requireSupabaseAuth` middleware guards all server functions.
- `enforceUsageLimits` provides billing/safety gates.

---

## Environment Variables

| Variable | Context | Description |
|----------|---------|-------------|
| `VITE_SUPABASE_URL` | Client | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Supabase service role (server-only) |

---

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start Vite dev server |
| `bun run build` | Production build |
| `bun run build:dev` | Development build |
| `bun run preview` | Preview production build |
| `bun run lint` | ESLint check |
| `bun run format` | Prettier format |

---

## License

Private. Built with [Lovable](https://lovable.dev).
