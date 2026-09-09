# Stage 9 verification

## Implemented

- Reusable preview with 10/25/50-row pagination over at most 100 uploaded rows.
- Case-insensitive preview search and stable natural text sorting in either
  direction, with blanks last and source row numbers retained.
- Shared type badges, explicit missing-cell labels, horizontal table scrolling,
  semantic headers, keyboard controls, sort state, and page announcements.
- Dataset completeness cards and a selectable column statistics panel for numeric,
  categorical, boolean, text, and datetime responses. Undefined values and empty
  categories have explicit states; full-dataset scope is visible.
- Protected `/project/[id]/data` page using the existing server ownership check
  and uploader. Project overview also retains the same exploration components.

## Checks

Verified locally on September 9, 2026:

- `pnpm check`: Prettier, ESLint, strict TypeScript, all 120 tests across 18 files,
  and the production build passed, including the new data route.
- Final statistics-panel tests and lint were rerun after a copy-only refinement.
- Preview tests cover page size, page boundaries, search, empty results, natural
  sort direction, blank-cell placement, source preservation, and accessible sort state.
- Statistics tests cover numeric/category/date selection, unavailable statistics,
  empty categories, and full-dataset counts.
- Existing uploader, authentication, ownership, contract, and error tests remain
  part of the frontend suite. One initial test used the button's accessible name
  to find a table header; the assertion now checks the actual column header.

## Boundaries

Search and sorting apply only to the preview. They do not filter statistics or
fetch additional source rows. Sorting compares original text with numeric runs;
it is not date or measurement normalization. Dashboard filters are a later stage.

Data remains temporary React state and clears on navigation or reload. The data
page explicitly requests another upload until Stage 14 adds persistence. No new
dependencies, migrations, backend algorithms, or visualization recommendations
were added. Hosted Supabase and signed-in desktop/mobile browser interactions
were not verified in this stage; component tests use jsdom.
