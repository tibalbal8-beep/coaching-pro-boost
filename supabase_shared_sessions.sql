-- Table pour partager une séance complète entre deux comptes Premium (lien à usage unique
-- côté import, mais lien lui-même valable 30 jours comme shared_exercises/shared_plays).
-- session_data = la séance (sans id/teamId, régénérés à l'import), exercises/plays = les
-- exercices et plays qu'elle référence, enrichis (photos/schémas embarqués) pour être
-- importables même si le compte destinataire ne les a pas déjà en bibliothèque.
-- À exécuter une fois dans Supabase → SQL Editor.

create table if not exists public.shared_sessions (
  token text primary key,
  session_data jsonb not null,
  exercises jsonb not null default '[]'::jsonb,
  plays jsonb not null default '[]'::jsonb,
  session_photo text,
  expires_at timestamptz default (now() + interval '30 days'),
  created_at timestamptz default now()
);

alter table public.shared_sessions enable row level security;

create policy "Anyone can read a share by token"
  on public.shared_sessions for select
  using (true);

create policy "Authenticated users can create a share"
  on public.shared_sessions for insert
  to authenticated
  with check (true);
