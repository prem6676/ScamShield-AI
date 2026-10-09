# ScamShield AI

ScamShield AI checks suspicious messages for common scam and phishing signals, explains the result, and offers safer next steps.

## Run & Operate

- `artifacts/api-server` — shared API service used by the web preview
- `artifacts/scamshield-ai` — responsive React application
- `pnpm run typecheck` — check all workspace packages
- `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/scamshield-ai run build` — build the web artifact
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and schemas after OpenAPI edits
- `artifacts/scamshield-ai/portable-project` — self-contained JavaScript client/server project for local Windows use
- `artifacts/scamshield-ai/public/scamshield-ai-project.zip` — portable source download served from the dashboard

The preview API uses rule-based analysis and temporary in-memory history when optional AI or Supabase settings are absent. The portable project's `README.md` has the Windows setup steps. Supabase service-role credentials belong only in the backend environment.

## Stack

- Web: React, Vite, Wouter, TanStack Query, Recharts, and Lucide
- API: Express 5 with OpenAPI-generated Zod validation and typed React Query hooks
- Persistence and analysis: optional Supabase PostgreSQL and optional server-only OpenAI-compatible provider; local heuristic fallback

## Where things live

- API contract: `lib/api-spec/openapi.yaml`
- Shared API routes and services: `artifacts/api-server/src/`
- Replit web UI: `artifacts/scamshield-ai/src/`
- Portable project: `artifacts/scamshield-ai/portable-project/`
- Supabase schema: `artifacts/scamshield-ai/portable-project/database/schema.sql`

## Architecture decisions

- The portable Windows project is independent of the Replit monorepo; its ZIP contains a client, server, schema, environment examples, and setup instructions.
- Missing Supabase configuration uses explicitly temporary process memory; a configured-but-unavailable database returns an error instead of silently claiming data was persisted.
- Submitted URLs are analyzed as text only and are never fetched or opened.

## Product

- Dashboard, message scanner, analysis detail, searchable/filterable history with confirmed deletion, and safety guidance.
- Every result identifies AI or rule-based analysis and warns that a low score is not proof of safety.

## User preferences

- Keep the downloadable project runnable on Windows without Replit-only services or APIs.

## Gotchas

- The portable app's AI and Supabase settings are optional; its default history is volatile and its default analysis is heuristic-based.
- For an OpenAPI contract change, rerun codegen before typechecking the frontend or API.

## Pointers

- See the `pnpm-workspace` skill for workspace structure and package details.
