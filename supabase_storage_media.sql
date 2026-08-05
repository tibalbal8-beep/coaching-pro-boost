-- Bucket Supabase Storage pour les photos/schémas d'exercices et de plays, à la place du
-- kv_store (qui compte dans le quota "Database Size", contrairement au Storage). À exécuter une
-- fois dans Supabase → SQL Editor.

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

-- Chaque fichier est rangé sous {user_id}/{clé} — un utilisateur ne peut lire/écrire que dans
-- son propre dossier (storage.foldername(name) découpe le chemin en segments).
create policy "Users can read their own media"
  on storage.objects for select
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload their own media"
  on storage.objects for insert
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own media"
  on storage.objects for update
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own media"
  on storage.objects for delete
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
