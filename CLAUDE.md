# CLAUDE.md — Servyou Project Instructions

This file gives Claude Code persistent context about the Servyou project. Read this at the start of every session before making changes.

## What Servyou Is

Servyou is a Tunisia-focused three-sided marketplace MVP connecting consumers, e-commerce shop owners, and freelancers. Consumers browse and request products from shops or services from freelancers. Sellers contact buyers via a WhatsApp link to arrange payment and delivery off-platform. Servyou does not handle money or in-app messaging in the MVP.

## Tech Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS, deployed on Vercel. Backend is Supabase (PostgreSQL + Auth + Row Level Security). Code lives at github.com/Servyou-tn/servyou. Live at servyou.vercel.app.

## Project Structure

- `src/app/` — pages and routes (App Router conventions)
- `src/components/` — reusable React components, organized by category (ui, layout, forms, cards)
- `src/lib/` — Supabase clients, utilities, shared types
- `src/lib/supabase/client.ts` — Supabase client for browser code
- `src/lib/supabase/server.ts` — Supabase client for server code
- `public/` — static assets (images, icons)

## Development Commands

- `npm run dev` — start the local development server at localhost:3000
- `npm run build` — production build (run before pushing major changes)
- `npm run lint` — check code with ESLint

## Naming Conventions

- Component files: PascalCase (e.g. ProductCard.tsx, RequestButton.tsx)
- Utility files: camelCase or kebab-case (e.g. formatCurrency.ts, supabase-client.ts)
- Use named exports, not default exports (except for Next.js special files like page.tsx, layout.tsx)
- Import order: external libraries → @/ absolute imports → relative imports

## Styling Rules

- Use Tailwind utility classes directly in JSX
- No separate CSS files (except src/app/globals.css for Tailwind directives)
- For repeated style groupings, extract className utility functions, not stylesheet files

## Database and Security

- All database access goes through the Supabase client library, never raw HTTP
- Row Level Security (RLS) policies enforce permissions at the database level
- NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are safe for browser code
- SUPABASE_SERVICE_ROLE_KEY is server-only — NEVER use it in client components
- All prices stored in Tunisian Dinars (TND), decimal with 2 places

## Locked MVP Scope (do NOT add features without discussion)

The MVP includes only: email signup with role selection (consumer / shop_owner / freelancer), basic profile, product catalog from shops, service catalog from freelancers, search and filter, "Request to buy" or "Request service" buttons that create pending orders, seller dashboard listing incoming requests, WhatsApp contact button with pre-filled message, and marking orders as completed or cancelled.

The following are explicitly NOT in the MVP and should NOT be added without first discussing in chat: in-app messaging, in-app payment (Konnect), reviews, ratings, favorites, wishlists, notifications, admin dashboards, audit logs, phone/SMS verification, Auth0, NextAuth, Redis, queues, microservices, additional user roles. All of these are deferred to version two.

## Working Style

- Work in stages: understand the existing code → plan changes → implement one piece at a time → verify
- Commit to Git after every meaningful piece of work with a clear one-line message
- New feature ideas during work go into docs/version-two-ideas.md, NOT into the MVP
- When in doubt, prefer the simpler approach
- Tunisia-first: check that every design decision fits Tunisian reality (governorates, dinars, WhatsApp, French/Arabic where relevant)

## Git Commit Rules

- NEVER add "Co-Authored-By" lines or any Claude/Anthropic attribution to commit messages
- Use the exact commit message provided by the user when one is given; otherwise write a clear one-line message with no trailer lines

## Reference Documents

The full project context lives in 11 documents inside the Claude.ai project workspace. When more detail is needed, refer to those documents — especially the database architecture, security model, and frontend architecture files.