# StudioDesk

> AI-grounded pricing, business documents, and client workflows for independent creatives.

StudioDesk is an AI-powered creative business assistant designed for freelancers, studios, and independent agencies. It helps you price projects intelligently, generate professional proposals, invoices, contracts, and receipts, obtain digital e-signatures from clients via a public portal, and manage your creative business seamlessly—both online and offline across desktop and native mobile platforms.

---

## What's New & Core Features

### 🤖 AI Pricing Studio
- **Context-Grounded Pricing**: Run AI-powered pricing analysis informed by your studio profile, client tier, historical project data, and project scope.
- **Client Tier Intelligence**: Supports **Standard**, **Preferred**, and **Enterprise** client tiers with customizable rate cards.
- **Line-Item Rationale & Hour Estimation**: Get recommended budgets, price ranges, confidence scores, and line-item breakdowns with explicit pricing rationales.
- **One-Click Document Handoff**: Instantly convert pricing estimates into draft proposals or invoices.

### 📄 AI Document Generator & PDF Engine
- **Multi-Document Support**: Generate draft **proposals**, **invoices**, **contracts**, and **receipts** with AI guidance in seconds.
- **Inline Rich Section Editor**: Review, customize, and edit titles, line items, payment terms, scope sections, and custom notes inline.
- **Tax & Currency Auto-Calculations**: Automatic subtotal, tax (VAT rate per country), and grand total calculations.
- **Brand Customization**: PDF templates render using your studio's custom brand accent colors, logo, and studio identity.
- **Instant Client-Side & Server-Side PDF Export**: Export publication-ready PDFs directly from your browser or via backend rendering.

### 🔗 Public Client Sharing Portal & E-Signatures
- **Secure Tokenized Portal (`/portal/$token`)**: Share proposals, contracts, and invoices with clients via secure, tokenized public links without requiring client logins.
- **Canvas Digital Signature Pad**: Clients can review and digitally sign proposals and contracts directly in the web portal using built-in canvas signature capture.
- **Real-Time Client Activity Tracking**: Get notified when a client views, signs, or accepts a document.
- **Direct Public PDF Downloads**: Clients can download signed PDFs directly from the portal.

### 🔔 Real-Time Notification Center & Web Push
- **In-App Notification Bell (`NotificationBell`)**: Real-time notifications powered by Supabase Realtime for document views, digital signatures, pricing completion, and trial updates.
- **Browser Web Push Notifications**: Native Web Push notification support via VAPID and Service Worker integration (`usePushSubscription`) to alert you on any device.
- **Interactive Unread Badges**: Track unread alerts, mark notifications as read, and jump directly to relevant documents or projects.

### ⚡ Offline Capability & Optimistic UI
- **Offline Mutation Queue**: Create, edit, and update documents, clients, and projects even without an active internet connection using IndexedDB (`idb-keyval`) and TanStack Query client persistence.
- **Background Auto-Sync**: Mutations queued offline automatically synchronize with Supabase once network connectivity is restored.
- **Optimistic UI Updates**: Zero-latency interface state updates across all key user interactions.

### 💳 Subscription & Tier Management
- **Dedicated Billing Hub (`/subscription`)**: Clear overview of subscription status, usage quotas, and plan tiers (**Starter**, **Pro**, **Studio**).
- **3-Day Full-Access Free Trial**: Experience full platform capabilities during onboarding.
- **Usage Limit Enforcement (`enforceUsageLimits`)**: Automated feature gating and usage safeguards with responsive upgrade modals (`UpgradeModal`).

### 👑 Admin Management Panel
- **Subscriber Operations (`/admin`)**: Platform owner portal for tracking total subscriber count, plan tier distribution, MRR metrics, and subscription statuses.
- **Plan Overrides**: Admin tools to update user plans, extend trials, and inspect tenant usage.

### 📱 Native Cross-Platform Mobile Experience (Android & iOS)
- **Capacitor Integration**: Fully functional native Android mobile build.
- **Native PDF File System & Sharing**: Download PDFs directly to native device storage (`@capacitor/filesystem`) and share via native OS share sheet (`@capacitor/share`).
- **Hydration-Safe Animated Splash Screen**: Custom brand animated splash screen with zero black/white flicker during app launch.
- **Mobile Keyboard & Viewport Optimization**: Smooth keyboard handling (`adjustResize` / `adjustPan`) and haptic-touch responsive layout adaptation.

### 🗺️ Guided Onboarding Tour & Responsive UX
- **Interactive Onboarding Walkthrough (`OnboardingTour`)**: Step-by-step product tour using Driver.js to introduce new users to key features.
- **4-Step Studio Setup Wizard**: Configures studio identity, disciplines, day rates, brand accent color, and bank details with golden-ratio desktop side-by-side layout.
- **Skeleton Loading States (`PageSkeleton`)**: Full-screen skeleton screens across all authenticated routes for zero layout shift during data fetching.
- **Legal & FAQ Documentation**: Built-in FAQ (`/faq`), Privacy Policy (`/privacy`), and Terms of Service (`/tos`).

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [TanStack Start](https://tanstack.com/start) (React 19, TanStack Router file-based SSR/SSG) |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite`), CSS custom properties, Radix UI primitives, shadcn/ui |
| **Backend & Database** | Supabase (PostgreSQL + RLS + Auth + Storage + Realtime) |
| **AI Integration** | Lovable AI Gateway (via Vercel `ai` SDK & `@ai-sdk/google`) |
| **PDF Generation** | PDF-lib (client-side) & `@react-pdf/renderer` (server-side template rendering) |
| **State & Offline Storage** | TanStack Query, IndexedDB (`idb-keyval`), `@tanstack/react-query-persist-client` |
| **Mobile & Native** | Capacitor (`@capacitor/core`, `@capacitor/android`, `@capacitor/filesystem`, `@capacitor/share`) |
| **Notifications** | Web Push API (`web-push`), VAPID subscriptions, Supabase Realtime Broadcast |
| **Product Tour & Motion** | Driver.js (`driver.js`), GSAP (`gsap`, `@gsap/react`), Lucide React icons |
| **Forms & Validation** | React Hook Form, Zod schema validation |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 20+
- A Supabase project with required schema & migrations applied
- Lovable Cloud AI Gateway access / API credentials

### Installation

```bash
# Clone the repository
git clone https://github.com/codex/testG.git
cd studiodesk

# Install dependencies
bun install

# Set up environment variables (.env.local)
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Run the local development server
bun dev
```

### Native Mobile Build (Android)

```bash
# Sync web build assets with Capacitor Android project
bun run android:sync

# Open project in Android Studio
bun run android:open
```

---

## Project Structure

```
src/
├── components/           # UI components (AppShell, NotificationBell, SignaturePad, SharePanel, OnboardingTour)
│   └── ui/               # Radix UI & shadcn/ui primitives
├── hooks/                # Custom hooks (usePushSubscription, use-mobile)
├── integrations/
│   ├── lovable/          # AI gateway helpers
│   └── supabase/         # Supabase client, auth middleware, and types
├── lib/                  # Server functions & domain services
│   ├── *.functions.ts    # documents, pricing, projects, clients, notifications, shares, subscription, admin
│   ├── ai-gateway.server.ts
│   ├── pdf.server.ts
│   └── security.server.ts
├── pwa/                  # PWA service worker registration logic
├── routes/               # TanStack Start file-based routing
│   ├── __root.tsx        # Root layout, provider setup, splash screen
│   ├── auth.tsx          # Authentication (Sign in, sign up, password reset)
│   ├── onboarding.tsx    # Studio identity setup wizard
│   ├── portal.$token.tsx # Public client portal & digital signature page
│   ├── index.tsx         # Modern landing page
│   └── _authenticated/   # Protected studio application layout
│       ├── dashboard.tsx # Business performance & activity overview
│       ├── documents.tsx # Document management & filterable list
│       ├── documents.$id.tsx # Document inline editor & PDF generator
│       ├── pricing.tsx   # AI Pricing Studio
│       ├── projects.tsx  # Project list & creation
│       ├── projects.$id.tsx # Project scope & document breakdown
│       ├── clients.tsx   # Client CRM & tier list
│       ├── clients.$id.tsx # Client detail view
│       ├── subscription.tsx # Subscription plan & usage billing hub
│       ├── admin.tsx     # Admin subscriber analytics & management
│       ├── settings.tsx  # Studio profile, rate cards, bank details
│       ├── faq.tsx       # Product FAQ
│       ├── privacy.tsx   # Privacy Policy
│       └── tos.tsx       # Terms of Service
└── start.ts              # TanStack Start instance configuration
```

---

## Key Workflows

### 1. Project Pricing → Document Generation
1. Create a project in **Projects** or select an existing client.
2. Open **Pricing Studio**, select client tier (Standard/Preferred/Enterprise), and enter scope/deliverables.
3. Run the AI analysis to receive grounded hour estimations and price range breakdowns.
4. Click **Generate Document** to instantly turn the pricing run into a formal Proposal or Invoice.

### 2. Client Sharing & Digital E-Signature
1. Open a generated document and click **Share**.
2. Generate a secure client portal link (`/portal/$token`) with optional expiration rules.
3. Client opens link in portal, reviews terms, and signs digitally using the canvas signature pad.
4. Real-time notification fires to your studio dashboard and mobile push notification, updating document status to **Accepted**.

### 3. Offline Mode & Background Synchronization
1. Make updates to documents, create projects, or adjust client details while offline.
2. Mutations are saved optimistically in local state and queued in IndexedDB.
3. Upon reconnecting, background synchronization seamlessly sends pending updates to Supabase.

---

## Database Schema (Supabase)

| Table | Description |
| :--- | :--- |
| `profiles` | Studio identity, brand config, currency, day rates, bank details, subscription status |
| `clients` | Client contacts, company details, assigned pricing tier (Standard/Preferred/Enterprise) |
| `projects` | Creative projects linked to clients, budget tracking, scope tags, project status |
| `documents` | Generated documents (proposals, invoices, contracts, receipts) with JSON section state |
| `pricing_runs` | AI pricing analysis runs, scope inputs, rationale outputs, confidence metrics |
| `document_shares` | Secure share tokens, expiration parameters, client view logs, digital signature signatures |
| `notifications` | In-app user notifications, read states, notification types, deep link references |
| `push_subscriptions` | VAPID Web Push client endpoints for push notification delivery |
| `rate_cards` | Custom rate cards and hourly pricing baselines per client tier |

---

## Environment Variables

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Client & Server | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client & Server | Supabase anonymous public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only | Supabase service role key (bypasses RLS for admin operations) |

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `bun dev` | Start Vite development server |
| `bun run build` | Build production bundle |
| `bun run build:dev` | Build development bundle |
| `bun run preview` | Locally preview production build |
| `bun run android:sync` | Sync web build output to Capacitor Android project |
| `bun run android:open` | Launch Android Studio for native APK compilation |
| `bun run lint` | Run ESLint across codebase |
| `bun run format` | Format files with Prettier |

---

## License

Private. Developed for **StudioDesk**.
