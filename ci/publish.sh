#!/usr/bin/env bash
# Builds apps/web as the official release does, checks its production chunks
# boot, and publishes dist/ (without source maps) as t3-client-VERSION.tar.gz.
set -euo pipefail
export APP_VERSION="$VERSION" VITE_RELEASE_CHANNEL=stable T3CODE_DESKTOP_UPDATE_REPOSITORY=pingdotgg/t3code
vp run --filter @t3tools/web build
node apps/web/scripts/verify-built-boot.ts
find apps/web/dist -name '*.map' -delete
rm -rf apps/web/dist/.vite
archive="t3-client-$VERSION.tar.gz"
tar -czf "$archive" -C apps/web/dist .
sha256sum "$archive" | tee "$archive.sha256"
git diff "$BASE" HEAD >patches.diff
gh release create "$TAG" -R "$GITHUB_REPOSITORY" --target "$GITHUB_REF_NAME" --latest=false \
  --title "T3 Code $VERSION client, patched ($TAG)" \
  --notes "The web client of upstream $BASE with the patches from $SOURCE (patches.diff). sha256: $(cut -d' ' -f1 "$archive.sha256")" \
  "$archive" "$archive.sha256" patches.diff
