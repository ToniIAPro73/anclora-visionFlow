#!/usr/bin/env bash
# F0-T6: Detects divergence between declared stack in docs and actual code.
# Fails (exit 1) if live code references SQLite as runtime DB while schema uses postgresql,
# or if z-ai-web-dev-sdk is still wired as a live dependency.
set -euo pipefail

FAILURES=0

# --- Check 1: datasource block in schema.prisma declares postgresql ---
DATASOURCE_PROVIDER=$(awk '/^datasource/,/^}/' prisma/schema.prisma | grep 'provider' | grep -o '"[^"]*"' | tr -d '"' | head -1)
if [[ "$DATASOURCE_PROVIDER" != "postgresql" ]]; then
  echo "FAIL [stack-divergence]: prisma datasource provider is '$DATASOURCE_PROVIDER', expected 'postgresql'" >&2
  FAILURES=$((FAILURES + 1))
fi

# --- Check 2: no runtime SQLite in environment or config files ---
# Excludes: test files (legacy compatibility tests), documentation templates, comments
SQLITE_IN_CODE=$(grep -rn "file:.*\.db\b\|sqlite3\b" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs" \
  src/ next.config.ts 2>/dev/null | \
  grep -v "\.test\.\|\.spec\.\|// \|/\*" || true)

if [[ -n "$SQLITE_IN_CODE" ]]; then
  echo "FAIL [stack-divergence]: SQLite runtime references found in live code (not tests):" >&2
  echo "$SQLITE_IN_CODE" >&2
  FAILURES=$((FAILURES + 1))
fi

# --- Check 3: DATABASE_URL in CI workflows must NOT be SQLite ---
CI_SQLITE=$(grep -rn "file:.*\.db" .github/workflows/ 2>/dev/null || true)
if [[ -n "$CI_SQLITE" ]]; then
  echo "FAIL [stack-divergence]: SQLite DATABASE_URL found in CI workflows:" >&2
  echo "$CI_SQLITE" >&2
  FAILURES=$((FAILURES + 1))
fi

# --- Check 4: z-ai-web-dev-sdk not in package.json dependencies ---
if grep -q '"z-ai-web-dev-sdk"' package.json; then
  echo "FAIL [stack-divergence]: z-ai-web-dev-sdk still listed in package.json" >&2
  FAILURES=$((FAILURES + 1))
fi

# --- Check 5: z-ai-web-dev-sdk not imported in live source (excluding tests/docs) ---
ZAI_IN_CODE=$(grep -rn '"z-ai-web-dev-sdk"\|from.*z-ai-web-dev-sdk' \
  --include="*.ts" --include="*.tsx" src/ 2>/dev/null | \
  grep -v "\.test\.\|\.spec\." || true)
if [[ -n "$ZAI_IN_CODE" ]]; then
  echo "FAIL [stack-divergence]: z-ai-web-dev-sdk imported in live source:" >&2
  echo "$ZAI_IN_CODE" >&2
  FAILURES=$((FAILURES + 1))
fi

if [[ $FAILURES -eq 0 ]]; then
  echo "OK [stack-divergence]: no stack divergence detected (postgresql + openai sdk)"
  exit 0
else
  echo "FAIL [stack-divergence]: $FAILURES check(s) failed" >&2
  exit 1
fi
