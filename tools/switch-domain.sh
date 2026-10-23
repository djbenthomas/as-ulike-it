#!/usr/bin/env bash
# switch-domain.sh — repoint the site at https://as-ulikeit.com/
#
# Run ONLY after GoDaddy DNS points at GitHub Pages (see as-u-like-it/DOMAIN-SWITCH-RUNBOOK.md).
# Runs in place and does not commit; review `git diff` then commit yourself.
#
#   cd ~/.openclaw/workspace-dale/as-ulike-it-site
#   bash tools/switch-domain.sh
#
# Safe to re-run (idempotent: old host simply isn't found the second time).

set -euo pipefail
cd "$(dirname "$0")/.."

OLD='https://djbenthomas.github.io/as-ulike-it/'
NEW='https://as-ulikeit.com/'

if [ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]; then
  echo "✗ not on main — aborting"; exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "✗ working tree dirty — commit or stash first"; exit 1
fi

echo "→ rewriting $OLD → $NEW"
# BSD sed (macOS): -i '' ; handles both bare-host and trailing-slash occurrences
find . -name '*.html' -not -path './node_modules/*' -print0 \
  | xargs -0 sed -i '' "s|${OLD}|${NEW}|g"
sed -i '' "s|${OLD}|${NEW}|g" robots.txt

echo "→ adding CNAME (as-ulikeit.com)"
printf 'as-ulikeit.com\n' > CNAME

echo "→ regenerating sitemap at new host"
HOST="$NEW" node tools/build-sitemap.mjs

echo "→ validating"
node tools/validate.mjs

echo
echo "── leftovers (should be empty) ──"
grep -rl 'djbenthomas\.github\.io' --include='*.html' --include='*.xml' --include='*.txt' . | grep -v node_modules || echo "(none)"

echo
echo "✓ done — review 'git diff', then:"
echo "  git add -A && git commit -m 'Point canonical/OG/JSON-LD/sitemap at as-ulikeit.com' && git push"
