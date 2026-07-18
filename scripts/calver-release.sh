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
npm version "$VERSION" --no-git-tag-version --allow-same-version

git add package.json package-lock.json
git commit -m "chore: release ${VERSION}"
git tag "v${VERSION}"
echo "Tagged v${VERSION}"
