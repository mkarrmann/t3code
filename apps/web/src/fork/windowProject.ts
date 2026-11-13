// Fork-only (github.com/mkarrmann/t3code): a window's own project. Kept out of
// upstream files so cherry-picking onto a new release touches only the call sites.
import { scopeProjectRef, scopedProjectKey } from "@t3tools/client-runtime/environment";
import { getProjectOrderKey } from "@t3tools/client-runtime/state/project-grouping";
import type { EnvironmentProject } from "@t3tools/client-runtime/state/shell";
import type { EnvironmentId, ProjectId, ScopedProjectRef } from "@t3tools/contracts";

import { useProjects } from "../state/entities";
import { legacyProjectCwdPreferenceKey, useUiStateStore } from "../uiStateStore";

type OrderedProject = Pick<
  EnvironmentProject,
  "environmentId" | "id" | "workspaceRoot" | "archivedAt"
>;

/**
 * The window's project: the first live project its manual project order names.
 * That order is per window (localStorage), and bin/t3-window-scope in the
 * dotfiles puts the window's project first. None while the order names no project.
 */
export function resolveWindowProjectRef(
  projects: ReadonlyArray<OrderedProject>,
  projectOrder: readonly string[],
): ScopedProjectRef | null {
  for (const key of projectOrder) {
    const project = projects.find(
      (candidate) =>
        candidate.archivedAt == null &&
        (getProjectOrderKey(candidate) === key ||
          legacyProjectCwdPreferenceKey(candidate.workspaceRoot) === key),
    );
    if (project !== undefined) return scopeProjectRef(project.environmentId, project.id);
  }
  return null;
}

/** The window's project as a scoped project key, a stable value for memoized consumers. */
export function useWindowProjectKey(): string | null {
  const projects = useProjects();
  const projectOrder = useUiStateStore((store) => store.projectOrder);
  const ref = resolveWindowProjectRef(projects, projectOrder);
  return ref === null ? null : scopedProjectKey(ref);
}

/** THREADS with the window project's first, each part in its own order. */
export function windowProjectFirst<
  T extends { readonly environmentId: EnvironmentId; readonly projectId: ProjectId },
>(threads: readonly T[], windowProjectKey: string | null): T[] {
  if (windowProjectKey === null) return [...threads];
  const own: T[] = [];
  const rest: T[] = [];
  for (const thread of threads) {
    const key = scopedProjectKey(scopeProjectRef(thread.environmentId, thread.projectId));
    (key === windowProjectKey ? own : rest).push(thread);
  }
  return [...own, ...rest];
}
