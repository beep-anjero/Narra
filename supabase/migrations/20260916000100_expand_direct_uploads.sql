begin;

-- CSV bytes now travel directly from the browser to private Storage, bypassing
-- the Vercel Function request-body limit.
update storage.buckets
set file_size_limit = 26214400
where id = 'datasets';

commit;
