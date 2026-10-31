-- Partage des Espoirs LNB, du recrutement et du comparatif championnat entre ton compte et un compte « invité scouting ».
-- À exécuter une fois dans Supabase → SQL Editor.

-- 1. Droit « invité scouting » : accès restreint (comparatif en consultation + Espoirs LNB + Recrutement modifiables)
alter table public.profiles add column if not exists scout_guest boolean not null default false;

update public.profiles set scout_guest = true
  where id = (select id from auth.users where email = 'mberjoan@scabbasket.fr');

-- Pour retirer l'accès :
-- update public.profiles set scout_guest = false
--   where id = (select id from auth.users where email = 'mberjoan@scabbasket.fr');

-- 2. Espace de données commun (une ligne par jeu de données, avec un numéro de version pour éviter d'écraser le travail de l'autre)
create table if not exists public.shared_scouting (
  key text primary key,
  value text not null,
  version integer not null default 1,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.shared_scouting enable row level security;

drop policy if exists "scouting_lecture" on public.shared_scouting;
drop policy if exists "scouting_ajout" on public.shared_scouting;
drop policy if exists "scouting_modif" on public.shared_scouting;

-- Lecture : admin et invités scouting
create policy "scouting_lecture" on public.shared_scouting for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.is_admin or p.scout_guest)));

-- Écriture : l'admin partout ; l'invité seulement sur les Espoirs LNB et le recrutement (jamais sur le comparatif)
create policy "scouting_ajout" on public.shared_scouting for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid()
    and (p.is_admin or (p.scout_guest and (key like 'espoirs:%' or key like 'recruit:%')))));

create policy "scouting_modif" on public.shared_scouting for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid()
    and (p.is_admin or (p.scout_guest and (key like 'espoirs:%' or key like 'recruit:%')))))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid()
    and (p.is_admin or (p.scout_guest and (key like 'espoirs:%' or key like 'recruit:%')))));
