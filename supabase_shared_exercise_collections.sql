-- Table pour partager/importer un lot d'exercices en une fois (QR code unique pour tout le
-- cahier technique). Même principe que shared_exercises (voir supabase_shared_tables_rls.sql)
-- mais stocke un tableau d'exercices sous un seul token.
-- À exécuter une fois dans Supabase → SQL Editor.

create table if not exists public.shared_exercise_collections (
  token text primary key,
  title text,
  exercises jsonb not null,
  created_at timestamptz default now()
);

alter table public.shared_exercise_collections enable row level security;

create policy "Anyone can read a share by token"
  on public.shared_exercise_collections for select
  using (true);

create policy "Authenticated users can create a share"
  on public.shared_exercise_collections for insert
  to authenticated
  with check (true);
