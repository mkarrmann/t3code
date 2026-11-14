# mkarrmann/t3code

A fork of [pingdotgg/t3code](https://github.com/pingdotgg/t3code) that carries a
few web-client patches on top of upstream's stable releases. This branch holds
only the automation; the patches live on `mk/v<version>` branches, each one an
upstream release tag plus the patch commits.

## Patches

- The sidebar's time-ordered Active section and Working are grouped by
  project: the window's project (the first project in its manual project
  order, which the dotfiles' `t3-window-scope` sets per window) first, then
  each other project where its most recent thread falls.
- New thread here (`chat.newLocal`) starts in the window's project rather than
  the project of the thread on screen.

The shared logic is in `apps/web/src/fork/`, so upstream files only gain call sites.

## What gets built and how it is used

`.github/workflows/build-client.yml` runs daily and on demand. For upstream's
latest stable release (or the version given) it takes the `mk/v*` branch for
that version, or else cherry-picks the newest older branch's patches onto the
release tag; runs the web typecheck and the tests beside every file the
patches touch; builds `apps/web` as upstream's release does; and publishes
`t3-client-<version>.tar.gz` with its sha256 and `patches.diff` as release
`mk-<version>-<patch sha>`. A release already published for that version and
patch set is not built again.

Only the web client is replaced. The official `t3` program serves the client
from the `client/` directory beside it, so the dotfiles' `t3-ensure` installs
upstream's release as usual, lays this client over a copy of it, and pins the
archive's sha256.

## When the patches stop applying

The run fails, naming the version; GitHub emails about the failed run. Then, in
a checkout with this fork as `fork` and upstream as `origin`:

    git fetch origin tag vNEW && git fetch fork
    git switch -c mk/vNEW vNEW
    git cherry-pick vOLD..fork/mk/vOLD      # resolve, then git cherry-pick --continue
    git push fork mk/vNEW
    gh workflow run build-client.yml -R mkarrmann/t3code -f version=NEW

Pushes come from a local checkout: GitHub refuses a workflow token's push of
branches that change upstream's own workflow files.

## Upstream's workflows

They do not run here. Scheduled workflows run only from the default branch,
which is this one; no branch here is `main`, which upstream's CI runs on; and
release tags are named `mk-*`, not upstream's `v*.*.*`.
