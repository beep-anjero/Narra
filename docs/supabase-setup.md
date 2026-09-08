# Supabase setup

The application uses real Supabase Auth APIs. It has no development login bypass
or local account store. No Supabase project was supplied during implementation, so
the hosted migration and live authentication checks below remain outstanding.

## 1. Create a Supabase project

Create a project in the [Supabase dashboard](https://supabase.com/dashboard).
Keep its database password private; Narra's frontend does not need it.

From the project's Connect dialog or API settings, obtain:

- Project URL (`https://<project-ref>.supabase.co`).
- Publishable key (`sb_publishable_...`). A legacy **anon** JWT is also supported
  for local Supabase installations; a service-role JWT or secret key is rejected.

Create `apps/web/.env.local` with only these web configuration values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-public-key>
```

Replace the angle-bracket values with your actual project settings. The local file
is ignored by Git. The publishable key is designed for public clients; database
authorization is enforced by RLS, not by hiding that key. Do not put a service-role
or secret key in either variable.

Restart `pnpm dev` after setting the environment. Production deployments need the
same variables configured before building.

## 2. Apply the migration

Open the new project's SQL Editor and run the complete contents of:

`supabase/migrations/20260907000100_auth_profiles.sql`

It runs in a transaction and creates:

- `public.profiles`: the Auth user ID, email, and creation time.
- A trigger that creates profiles and synchronizes confirmed Auth email changes.
- A backfill for users created before the migration.
- A SELECT policy limited to `(select auth.uid()) = id`.
- Grants permitting authenticated profile reads and denying direct client writes.

Profile identity and email come from `auth.users`, never from user-supplied metadata.
Deleting the Auth user cascades to its profile. Run this initial migration once;
future schema changes should be new migration files.

For a CLI-managed project, use the Supabase CLI's normal link and migration-push
workflow instead of also applying the same file manually. No CLI or Docker runtime
is required to run the Narra frontend or its embedded PostgreSQL tests.

## 3. Configure email/password authentication

In Supabase's authentication settings:

1. Enable the Email provider and new-user registrations.
2. Keep email confirmation enabled.
3. Set the minimum password length to 8, matching Narra's registration validation.
4. Set **Site URL** to the exact local origin you use, for example
   `http://127.0.0.1:3000`.
5. Use that same origin throughout registration and login. Configure your HTTPS
   application origin as Site URL before deploying the application.

The app's signup action uses the configured Supabase Site URL rather than deriving
email links from an untrusted request header or accepting a client-supplied origin.

## 4. Configure the confirmation email

In **Authentication → Email Templates → Confirm signup**, use a server-side
confirmation link:

```html
<h2>Confirm your Narra account</h2>
<p>Confirm your email address to open your workspace.</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email">
    Confirm email address
  </a>
</p>
```

`/auth/confirm` verifies the token with Supabase, stores the resulting session in
cookies, and redirects to `/dashboard`. It accepts only the email confirmation flow;
password reset, magic links, and OAuth callbacks have not been implemented.
Expired/used links return a readable login notice. Confirmation tokens are removed
from the redirect destination, and confirmation responses are not cached.

Email delivery depends on the project's delivery settings. If Supabase rejects a
test recipient or limits email delivery, check those settings and its Auth logs.
Configure a suitable mail provider before production use.

## 5. Verify the live flow

Use test accounts and a real inbox:

1. Visit `/dashboard` while logged out; expect `/login?next=...`.
2. Open `/register`, submit a valid email and matching password, and check the
   confirmation message. A short password or mismatch should produce field errors.
3. Follow the email link. The verified user should reach `/dashboard`.
4. Confirm that the user's profile exists in Supabase and its ID matches Auth.
5. Reload the workspace and open it in a new tab; the session should persist.
6. Log out. The workspace must require login again, including after Back/reload.
7. Log in with the same account and check wrong-password/unconfirmed-email errors.
8. Repeat with a second user. Through Supabase's Data API using each user's access
   token and the public key, verify that each can SELECT only their own profile
   and cannot insert, update, or delete profiles. SQL Editor queries run with
   privileged access and do not demonstrate end-user isolation.

## 6. Apply the Stage 4 projects migration

After applying the profiles migration, run the entire contents of
`supabase/migrations/20260908000100_projects.sql` in a new SQL Editor query once.
Do not rerun the profiles migration. The new migration creates projects, owner RLS
policies, restricted column grants, an owner index, and the update timestamp trigger.

Then verify with two test accounts:

1. Create a named project from `/dashboard/new` and reopen it after refreshing.
2. Edit its name and description in Project settings; verify the project card updates.
3. Log out, log back in, and reopen the project.
4. In a second account, confirm the first account's project is absent and opening
   its URL shows Project unavailable. Direct Data API reads and writes must also
   be denied or return no rows for the other owner's project.
5. Delete an owned project by typing DELETE in settings. Verify it disappears and
   its old URL is unavailable.

CSV uploads and dataset metadata are not part of Stage 4.

### Email delivery setup note

The hosted dashboard may require custom SMTP before allowing email template edits.
Configure SMTP before using the custom confirmation template above. For local-only
testing, Confirm email can be disabled under Sign In / Providers → Email; Narra
then handles the immediate signup session. This does not verify email ownership.
Restore confirmation and test email delivery before public launch.

## Local automated coverage

`pnpm check` runs formatting, lint, TypeScript, Vitest, and a production build.
Auth tests isolate provider calls with test doubles. SQL tests execute the actual
migration in PGlite (PostgreSQL in WASM) using minimal Supabase-owned Auth schema
fixtures. Neither proves live email delivery or hosted Supabase configuration.

Official references: [Supabase SSR setup](https://supabase.com/docs/guides/auth/server-side/nextjs),
[confirmation email templates](https://supabase.com/docs/guides/auth/auth-email-templates),
and [user data and profile triggers](https://supabase.com/docs/guides/auth/managing-user-data).
