begin;

-- Keep direct Storage uploads within the same 4 MiB boundary enforced by the
-- Vercel web function and FastAPI service. Multipart overhead remains below
-- Vercel's 4.5 MB request payload ceiling.
update storage.buckets
set file_size_limit = 4194304
where id = 'datasets';

commit;
