#!/usr/bin/env bash
# Set package.json CalVer to today's date (America/New_York) and create git tag vYYYY.MM.DD[.N]
set -euo pipefail

TZ="${CALVER_TZ:-America/New_York}"
BASE="$(TZ="$TZ" date +%Y.%m.%d)"
VERSION="$BASE"
N=0

while git rev-parse "refs/tags/v${VERSION}" >/dev/null 2>&1; do
  N=$((N + 1))
  VERSION="${BASE}.${N}"
done

CURRENT="$(node -p "require('./package.json').version")"
if [[ "$CURRENT" == "$VERSION" ]]; then
  echo "Version already ${VERSION}; nothing to do."
  exit 0
fi

echo "Releasing CalVer ${VERSION} (was ${CURRENT})"
# Avoid `npm version` — it coerces CalVer like 2026.07.19 → 2026.7.19 (semver).
VERSION="$VERSION" node <<'NODE'
const fs = require('fs');
const version = process.env.VERSION;
for (const file of ['package.json', 'package-lock.json']) {
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  pkg.version = version;
  if (pkg.packages && pkg.packages['']) pkg.packages[''].version = version;
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
}
NODE

git add package.json package-lock.json
git commit -m "chore: release ${VERSION}"
git tag "v${VERSION}"
echo "Tagged v${VERSION}"
