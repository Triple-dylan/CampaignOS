#!/usr/bin/env bash
# Public surface smoke for CampaignOS (no auth required).
# Usage: ./scripts/qa-public-smoke.sh [BASE_URL]
set -euo pipefail

BASE_URL="${1:-https://campaignos-sigma.vercel.app}"
BASE_URL="${BASE_URL%/}"
FAIL=0

check() {
  local path="$1"
  local expect="$2"
  local follow="${3:-}"
  local code
  if [[ "$follow" == "follow" ]]; then
    code=$(curl -sS -o /dev/null -L -w "%{http_code}" "${BASE_URL}${path}")
  else
    code=$(curl -sS -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")
  fi
  if [[ "$code" == "$expect" ]]; then
    printf "pass  %-24s -> %s\n" "$path" "$code"
  else
    printf "FAIL  %-24s -> %s (expected %s)\n" "$path" "$code" "$expect"
    FAIL=1
  fi
}

echo "Public smoke against ${BASE_URL}"
check "/" "200"
check "/sign-in" "200"
check "/sign-up" "200"
check "/api/health" "200"

# Signed-out workspace routes should redirect to sign-in (not 404/500).
for path in /dashboard /brain /planner /assets /research /fundraising /tasks /compliance /automations /settings /onboarding; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")
  if [[ "$code" == "307" || "$code" == "302" || "$code" == "303" ]]; then
    printf "pass  %-24s -> %s (redirect)\n" "$path" "$code"
  else
    printf "FAIL  %-24s -> %s (expected 3xx redirect)\n" "$path" "$code"
    FAIL=1
  fi
done

health=$(curl -sS "${BASE_URL}/api/health" || true)
if echo "$health" | grep -q '"status":"ok"'; then
  echo "pass  health payload ok"
else
  echo "FAIL  health payload unexpected: ${health}"
  FAIL=1
fi

if [[ "$FAIL" -ne 0 ]]; then
  echo "public smoke FAILED"
  exit 1
fi
echo "public smoke PASSED"
