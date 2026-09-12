# Stage 12: deterministic insights

The independent insight service reports missing values, potential IQR outliers,
Pearson correlations with at least three paired values, category frequencies,
and monthly mean changes. Every insight exposes calculation evidence. Constant
columns and correlations below moderate strength are omitted; outliers remain in
the dataset. The two most recent observed months must be consecutive, and a zero
baseline suppresses percentage change. Numeric calculations use float64 precision.

Work is bounded to eight numeric candidates, two missing-value findings, two
outlier findings, two correlations, two categorical columns, and one date column
with two numeric measures. Output is capped at 12 insights. These calculations
describe observations, not causation or forecasts. No LLM is involved.

The combined analysis includes insights. The authenticated generate-insights API
and protected insights page reuse the existing validation and ownership boundaries.
Insight cards expose evidence using native keyboard-accessible disclosures.

Verification covers IQR fences, valid correlation pairs, constant columns, monthly
changes, zero baselines, deterministic frequency ties, and evidence rendering.
Hosted sign-in and visual browser QA remain unverified. Datasets remain temporary.

Before the Stage 12 commit, 123 backend tests and 145 web tests passed. Ruff,
Prettier, ESLint, strict TypeScript, and the Next.js production build passed.
