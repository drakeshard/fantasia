insert into storage.buckets (id, name, public)
values ('runtime-assets', 'runtime-assets', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

-- GAME-BACKEND04 intentionally creates no storage.objects policies.
-- The bucket is public for direct read delivery, while browser/API object listing,
-- upload, update, and delete remain unavailable without a trusted server credential.
