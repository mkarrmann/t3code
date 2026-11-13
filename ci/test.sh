#!/usr/bin/env bash
# Tests what the patches change: the web package's typecheck, and the tests
# beside every apps/web file they touch, unit and browser.
set -euo pipefail
base="$1"
cd apps/web
mapfile -t tests < <(
  git diff --name-only "$base" HEAD -- . | sed 's#^apps/web/##' | while read -r file; do
    [[ -f "$file" ]] || continue
    stem="${file%.*}"
    case "$file" in *.test.ts | *.test.tsx) echo "$file" ;; esac
    for test in "$stem".test.ts "$stem".test.tsx "$stem".browser.test.ts "$stem".browser.test.tsx; do
      [[ -f "$test" ]] && echo "$test"
    done
  done | sort -u
)
echo "tests: ${tests[*]}"
vp run typecheck
if printf '%s\n' "${tests[@]}" | grep -q '\.browser\.test\.'; then
  node node_modules/playwright/cli.js install --with-deps --only-shell chromium
fi
[[ ${#tests[@]} -eq 0 ]] || vp test run "${tests[@]}"
