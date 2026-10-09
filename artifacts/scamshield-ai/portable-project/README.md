# ScamShield AI

ScamShield AI analyzes suspicious messages and URLs, explains common warning signs, recommends safer next steps, and keeps a searchable scan history. Its AI provider is optional: without one, the server uses local heuristics and labels the result as rule-based.

## Requirements

- Windows 10 or 11
- Node.js 20.19 or newer, or Node.js 22.12 or newer (the current Node.js LTS release is recommended)
- npm, included with Node.js
- Optional: a Supabase project for persistent scan history
- Optional: an OpenAI-compatible chat-completions API for AI analysis

## Run on Windows with PowerShell

1. Extract the ZIP to a folder you can write to.
2. Open PowerShell in the extracted `scamshield-ai` folder.
3. Create the local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Open `.env` and fill in the optional Supabase and AI settings described below.
5. Install dependencies and start the app:

   ```powershell
   npm ci
   npm run dev
   ```

6. Open <http://localhost:5173>.

The root development command starts the Vite client and Express API together. The API health endpoint is <http://localhost:5000/api/health>.

## Supabase scan history

1. Create a Supabase project.
2. In the Supabase SQL editor, run [`database/schema.sql`](database/schema.sql).
3. In the project settings, copy the project URL and service-role key into the root `.env`:

   ```dotenv
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

Keep the service-role key private. It is read only by the Express server; never add it to a `VITE_` variable or client code.

When Supabase is not configured, scans are held in server memory for the current run (up to 500 scans). They disappear when the server stops or restarts. The UI and API report that persistence is unavailable. If Supabase is configured but the database or table is unreachable, the API returns an error rather than claiming that a scan was saved.

## Optional AI analysis

The server accepts an OpenAI-compatible chat-completions endpoint. Configure the following in `.env`:

```dotenv
AI_API_KEY=
AI_MODEL=gpt-4o-mini
AI_API_URL=https://api.openai.com/v1/chat/completions
```

Leave `AI_API_KEY` empty to use the local rule-based analyzer. If the provider is unavailable or returns invalid structured data, the server also falls back to rule-based analysis. AI analysis runs only in the backend; the API key is never sent to the browser. Providers must support chat completions and JSON response mode.

## Configuration

The root `.env.example` contains all settings:

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | Express API port | `5000` |
| `CLIENT_ORIGIN` | Comma-separated browser origins allowed by CORS | `http://localhost:5173` |
| `SUPABASE_URL` | Supabase project URL | unset |
| `SUPABASE_SERVICE_ROLE_KEY` | Private server-only Supabase key | unset |
| `AI_API_KEY` | Private AI provider key | unset |
| `AI_MODEL` | Model name sent to the provider | `gpt-4o-mini` |
| `AI_API_URL` | OpenAI-compatible chat-completions URL | OpenAI endpoint |
| `VITE_API_BASE_URL` | API base used by the client | `/api` |

Client and server environment examples are also provided at `client/.env.example` and `server/.env.example`. The root `.env` takes precedence; if it is absent, the API can read `server/.env`, and Vite can read `client/.env` for `VITE_API_BASE_URL`. Do not commit any `.env` file.

## Commands

```powershell
npm run dev          # Start client and API for local development
npm run dev:client   # Start only the Vite client
npm run dev:server   # Start only the Express API
npm run build        # Build the client for production
npm run start        # Start the Express API
```

After `npm run build`, run `npm run start` and serve the generated `client/dist` folder with a static web server configured to proxy `/api` to the Express server. The development command already configures this proxy.

## API

- `GET /api/health` — server, AI, and database status
- `POST /api/analyze` — analyze and save a message
- `GET /api/scans` — list recent scans; accepts `search`, `riskLevel`, and `limit`
- `GET /api/scans/:id` — retrieve a scan
- `DELETE /api/scans/:id` — delete a scan
- `GET /api/stats` — dashboard totals grouped by risk

## Safety and privacy

- Submitted URLs are treated as text. ScamShield never opens, fetches, or visits them.
- Submitted message contents are sent to the configured AI provider only when AI is enabled.
- Message contents are not executed as code.
- Analysis can be incorrect and cannot detect every scam. A low risk score does not prove that a message is safe.
- Do not click suspicious links, install unknown apps, send money, or share passwords, PINs, or one-time codes based only on this tool's result.
- This starter has no sign-in or per-user scan ownership. Run it for one trusted operator; do not expose it publicly or store other people's scans until authentication and user-level data isolation are added.
