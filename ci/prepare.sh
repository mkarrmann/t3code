#!/usr/bin/env bash
# Checks out upstream's vVERSION with this fork's patches into the workspace:
# the mk/vVERSION branch if there is one, else the newest older mk/v* branch's
# patches cherry-picked onto the tag. Writes version, base (the upstream tag),
# source (branch@sha the patches came from), tag (the release this builds) and
# skip (that release exists already) to $GITHUB_OUTPUT.
set -euo pipefail
UPSTREAM=pingdotgg/t3code
out() { echo "$1=$2" >>"$GITHUB_OUTPUT"; }
fail() { echo "::error::$*"; exit 1; }

version="${VERSION:-}"
[[ -n "$version" ]] || version=$(gh api "repos/$UPSTREAM/releases/latest" --jq .tag_name)
version="${version#v}"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "not a stable version: $version"

git init -q .
# As upstream's CI: .repos/ holds vendored references the build does not read.
git sparse-checkout set --no-cone '/*' '!/.repos/'
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git remote add fork "https://github.com/$GITHUB_REPOSITORY.git"
git remote add upstream "https://github.com/$UPSTREAM.git"
git fetch -q --filter=blob:none fork '+refs/heads/mk/*:refs/remotes/fork/mk/*'

source_version=""
while read -r candidate; do
  [[ "$(printf '%s\n%s\n' "$candidate" "$version" | sort -V | tail -1)" == "$version" ]] && source_version="$candidate"
done < <(git for-each-ref --format='%(refname:lstrip=4)' refs/remotes/fork/mk/ | sed -n 's/^v\([0-9.]*\)$/\1/p' | sort -V)
[[ -n "$source_version" ]] || fail "no mk/v* branch at or below $version"
source_ref="refs/remotes/fork/mk/v$source_version"
source_sha=$(git rev-parse "$source_ref")
tag="mk-$version-${source_sha:0:7}"
out version "$version"
out base "v$version"
out source "mk/v$source_version@$source_sha"
out tag "$tag"
if gh release view "$tag" -R "$GITHUB_REPOSITORY" >/dev/null 2>&1 && [[ "${FORCE:-false}" != true ]]; then
  echo "$tag is published already"
  out skip true
  exit 0
fi

git fetch -q --filter=blob:none upstream "+refs/tags/v$version:refs/tags/v$version" \
  "+refs/tags/v$source_version:refs/tags/v$source_version"
if [[ "$source_version" == "$version" ]]; then
  git checkout -q --detach "$source_ref"
else
  git checkout -q --detach "v$version"
  git cherry-pick "v$source_version..$source_ref" >/dev/null || {
    git cherry-pick --abort || true
    fail "the patches on mk/v$source_version do not apply to v$version; resolve them locally and push mk/v$version (README.md)"
  }
fi
git log --oneline "v$version..HEAD"
