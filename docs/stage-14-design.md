# Stage 14: durable analysis projects

V1 keeps one immutable CSV per project. Uploading another dataset requires a new
project; replacement, versioning, and joins remain outside this release. The web
server uploads validated bytes to a private Supabase bucket using the user's
session, then calls one transactional PostgreSQL function to save the dataset,
columns, chart configurations, insights, and bounded analysis snapshot.

The snapshot lets a saved dashboard reopen without running analytics or downloading
the CSV. Cache tokens are not persisted. The first filter request after reopening
downloads the private CSV on the server and rehydrates FastAPI's temporary cache.
Subsequent filter requests use only a token and small JSON body. Expired tokens
recover the same way. Filters are a temporary view; the original analysis is saved.

RLS applies to every dataset-related table and Storage objects. The database save
function is security-invoker and verifies ownership; no service-role key is used.
Unique project/dataset constraints reject concurrent duplicate saves. Failed saves
attempt object cleanup only when the database confirms the dataset was not saved;
ambiguous network outcomes retain the object so retry/reopen cannot lose data.

Project deletion removes its Storage objects through the Storage API before deleting
relational records. A database guard rejects project deletion while objects remain.
Storage and PostgreSQL cannot form one distributed transaction: failed or interrupted
uploads may leave owner-private orphan objects. The deployment guide documents
reconciliation; never delete Storage metadata directly in SQL.
