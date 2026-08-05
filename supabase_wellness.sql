-- Questionnaires de bien-être post-match : lien public (jeton imprévisible, comme
-- shared_exercises) que les joueurs remplissent sans compte, résultats consultables par le coach.
-- À exécuter une fois dans Supabase → SQL Editor.

-- Permission fine : autorise un compte à créer/envoyer des questionnaires de bien-être
-- SANS lui donner tout l'accès admin (is_admin reste séparé).
alter table public.profiles add column if not exists can_manage_wellness boolean not null default false;

create table if not exists public.wellness_forms (
  token text primary key,
  title text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Liste des joueurs choisie au moment de la création du questionnaire (permet d'exclure
-- certains joueurs, ou de partager le bon roster avec un autre coach qui n'a pas accès à la
-- liste de joueurs du compte principal). Si absent (anciens questionnaires), on retombe sur la
-- liste de joueurs du compte créateur.
alter table public.wellness_forms add column if not exists players jsonb;

create table if not exists public.wellness_checkins (
  id uuid primary key default gen_random_uuid(),
  token text not null references public.wellness_forms(token) on delete cascade,
  player_name text not null,
  rpe int, sommeil int, fatigue int, courbature int, stress int, humeur int, alimentation int,
  submitted_at timestamptz default now()
);

alter table public.wellness_forms enable row level security;
alter table public.wellness_checkins enable row level security;

create policy "Anyone can read a form by token"
  on public.wellness_forms for select
  using (true);

create policy "Admins ou responsables bien-être peuvent créer un questionnaire"
  on public.wellness_forms for insert
  to authenticated
  with check (exists (
    select 1 from public.profiles
    where id = auth.uid() and (is_admin = true or can_manage_wellness = true)
  ));

create policy "Anyone can submit a checkin"
  on public.wellness_checkins for insert
  with check (true);

create policy "Anyone can read checkins by token"
  on public.wellness_checkins for select
  using (true);

create policy "Le créateur peut supprimer son questionnaire"
  on public.wellness_forms for delete
  to authenticated
  using (created_by = auth.uid());

-- Pour donner cette permission à un autre coach (sans lui donner le flag admin global) :
-- update public.profiles set can_manage_wellness = true
-- where id in (select id from auth.users where email = 'email-du-coach@exemple.com');
