import { EnvironmentId, ProjectId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { legacyProjectCwdPreferenceKey } from "../uiStateStore";
import { resolveWindowProjectRef, windowProjectFirst } from "./windowProject";

const envA = EnvironmentId.make("env-a");
const envB = EnvironmentId.make("env-b");
const project = (
  environmentId: EnvironmentId,
  id: string,
  workspaceRoot: string,
  archivedAt: string | null = null,
) => ({
  environmentId,
  id: ProjectId.make(id),
  workspaceRoot,
  archivedAt,
});
const checkoutOnA = project(envA, "p1", "/home/u/checkout1");
const checkoutOnB = project(envB, "p2", "/home/u/checkout1");
const alpha = project(envA, "p3", "/home/u/alpha");

describe("resolveWindowProjectRef", () => {
  it("is the first project the window's order names, on that order's environment", () => {
    expect(
      resolveWindowProjectRef(
        [checkoutOnB, alpha, checkoutOnA],
        [
          "env-a:/home/u/checkout1",
          legacyProjectCwdPreferenceKey("/home/u/checkout1"),
          "env-a:/home/u/alpha",
        ],
      ),
    ).toEqual({ environmentId: envA, projectId: checkoutOnA.id });
  });

  it("skips keys of archived or unknown projects", () => {
    const archived = project(envA, "p4", "/home/u/old", "2026-01-01T00:00:00.000Z");
    expect(
      resolveWindowProjectRef(
        [archived, alpha],
        ["env-a:/home/u/old", "env-a:/home/u/gone", "env-a:/home/u/alpha"],
      ),
    ).toEqual({ environmentId: envA, projectId: alpha.id });
  });

  it("matches a legacy cwd key", () => {
    expect(
      resolveWindowProjectRef([alpha], [legacyProjectCwdPreferenceKey("/home/u/alpha")]),
    ).toEqual({
      environmentId: envA,
      projectId: alpha.id,
    });
  });

  it("is none for a window with no order, not whichever project comes first", () => {
    expect(resolveWindowProjectRef([alpha, checkoutOnA], [])).toBeNull();
  });
});

describe("windowProjectFirst", () => {
  const thread = (name: string, environmentId: EnvironmentId, projectId: string) => ({
    name,
    environmentId,
    projectId: ProjectId.make(projectId),
  });
  const threads = [
    thread("a", envA, "p3"),
    thread("b", envA, "p1"),
    thread("c", envB, "p2"),
    thread("d", envA, "p1"),
    thread("e", envA, "p3"),
  ];

  it("moves the window project's threads up, keeping each part's order", () => {
    expect(windowProjectFirst(threads, "env-a:p1").map((t) => t.name)).toEqual([
      "b",
      "d",
      "a",
      "c",
      "e",
    ]);
  });

  it("leaves the order alone without a window project", () => {
    expect(windowProjectFirst(threads, null).map((t) => t.name)).toEqual(["a", "b", "c", "d", "e"]);
  });
});
