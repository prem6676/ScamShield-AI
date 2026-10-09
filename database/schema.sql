create extension if not exists pgcrypto;

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  submitted_url text,
  risk_score integer not null check (risk_score between 0 and 100),
  risk_level text not null check (risk_level in ('Low', 'Medium', 'High', 'Critical')),
  summary text not null,
  indicators jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  category text not null check (
    category in (
      'phishing',
      'impersonation',
      'financial scam',
      'credential theft',
      'suspicious offer',
      'other'
    )
  ),
  confidence numeric(4, 3) not null check (confidence between 0 and 1),
  analysis_source text not null check (analysis_source in ('AI', 'rule-based')),
  created_at timestamptz not null default now()
);

create index if not exists scans_created_at_desc_idx
  on public.scans (created_at desc);
create index if not exists scans_risk_level_created_at_idx
  on public.scans (risk_level, created_at desc);

alter table public.scans enable row level security;

-- The app uses the Supabase service-role key only on its backend.
-- Do not add a public/anon policy for this table.
