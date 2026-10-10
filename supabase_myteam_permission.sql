-- Permission fine "can_use_myteam" : donne accès à l'onglet « Mon équipe » (analyse, imports FIBA / CSV, rotations)
-- à un compte précis sans lui donner tout l'admin (même principe que can_use_matchmode, voir supabase_matchmode_permission.sql).
-- À exécuter une fois dans Supabase → SQL Editor.

alter table public.profiles add column if not exists can_use_myteam boolean not null default false;

-- Donner l'accès à un utilisateur précis (le compte doit déjà exister) :
update public.profiles set can_use_myteam = true
  where id = (select id from auth.users where email = 'mikael.maudhuy08@gmail.com');

-- Pour retirer l'accès :
-- update public.profiles set can_use_myteam = false
--   where id = (select id from auth.users where email = 'mikael.maudhuy08@gmail.com');
