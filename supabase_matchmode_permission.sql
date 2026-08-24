-- Permission fine "can_use_matchmode" : donne accès au Mode match à un compte précis sans
-- lui donner tout l'admin (même principe que can_manage_wellness, voir supabase_wellness.sql).
-- À exécuter une fois dans Supabase → SQL Editor.

alter table public.profiles add column if not exists can_use_matchmode boolean not null default false;

-- Pour donner l'accès à un utilisateur précis, remplace l'email et exécute :
-- update public.profiles set can_use_matchmode = true
--   where id = (select id from auth.users where email = 'email-du-compte@exemple.com');
