#!/usr/bin/env bash
# Ensure QA labels exist (idempotent).
set -euo pipefail

labels=(
  "automation:qa|0E8A16|QA automation loop"
  "severity:critical|B60205|Critical QA finding"
  "severity:high|D93F0B|High severity QA finding"
  "severity:medium|FBCA04|Medium severity QA finding"
  "severity:low|C5DEF5|Low severity QA finding"
  "autofix-candidate|5319E7|Safe for daily autofix automation"
  "needs-human|E99695|Requires human judgment"
)

for entry in "${labels[@]}"; do
  IFS='|' read -r name color description <<<"$entry"
  if gh label list --json name --jq '.[].name' | grep -Fxq "$name"; then
    echo "exists: $name"
  else
    gh label create "$name" --color "$color" --description "$description"
    echo "created: $name"
  fi
done
