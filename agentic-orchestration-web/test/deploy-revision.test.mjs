import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  classifyDeployRevision,
  loadDeployRevision,
} from "../lib/deploy-revision.mjs";

const SHA = "a1b2c3d4e5f6789012345678901234567890abcd";

test("exact version tag is the published release", () => {
  const rev = classifyDeployRevision({
    version: "2.11.0",
    sha: SHA,
    branch: "main",
    ahead: 0,
    subject: "Release v2.11.0",
  });
  assert.equal(rev.kind, "release");
  assert.equal(rev.label, "v2.11.0");
  assert.equal(rev.ahead, 0);
  assert.equal(rev.target, null);
  assert.equal(rev.shortSha, "a1b2c3d");
});

test("branch checkout shows commits ahead of the version", () => {
  const rev = classifyDeployRevision({
    version: "v2.11.0",
    sha: SHA,
    branch: "main",
    ahead: 12,
    subject: "fix topology",
  });
  assert.equal(rev.kind, "branch");
  assert.equal(rev.version, "2.11.0");
  assert.equal(rev.ahead, 12);
  assert.equal(rev.target, "branch main");
  assert.equal(rev.label, "v2.11.0 · 12 commits ahead · branch main");
});

test("feature branch is labeled with the branch name", () => {
  const rev = classifyDeployRevision({
    version: "2.11.0",
    sha: SHA,
    branch: "feat/admin-revision",
    ahead: 3,
  });
  assert.equal(rev.kind, "branch");
  assert.equal(rev.label, "v2.11.0 · 3 commits ahead · branch feat/admin-revision");
});

test("detached commit shows the short commit id", () => {
  const rev = classifyDeployRevision({
    version: "2.11.0",
    sha: SHA,
    branch: "HEAD",
    ahead: 1,
    subject: "wip",
  });
  assert.equal(rev.kind, "commit");
  assert.equal(rev.prId, null);
  assert.equal(rev.label, "v2.11.0 · 1 commit ahead · a1b2c3d");
});

test("pr branch shows the pull request id", () => {
  const rev = classifyDeployRevision({
    version: "2.11.0",
    sha: SHA,
    branch: "pr-42",
    ahead: 4,
  });
  assert.equal(rev.kind, "pull_request");
  assert.equal(rev.prId, "42");
  assert.equal(rev.label, "v2.11.0 · 4 commits ahead · PR #42");
});

test("gh checkout config shows the pull request id instead of the branch", () => {
  const rev = classifyDeployRevision({
    version: "2.11.0",
    sha: SHA,
    branch: "feat/widgets",
    ahead: 6,
    branchConfig: "branch.feat/widgets.github-pr-owner-number zlatko-lakisic/agentic-orchestration#88",
  });
  assert.equal(rev.kind, "pull_request");
  assert.equal(rev.prId, "88");
  assert.equal(rev.target, "PR #88");
});

test("pull ref pointing at HEAD is a pull request", () => {
  const rev = classifyDeployRevision({
    version: "2.11.0",
    sha: SHA,
    branch: "HEAD",
    ahead: 2,
    pointingRefs: ["refs/remotes/origin/pull/15/head"],
  });
  assert.equal(rev.kind, "pull_request");
  assert.equal(rev.label, "v2.11.0 · 2 commits ahead · PR #15");
});

test("detached merge commit shows the pull request id", () => {
  const rev = classifyDeployRevision({
    version: "2.11.0",
    sha: SHA,
    branch: "HEAD",
    ahead: 8,
    subject: "Merge pull request #9 from zlatko-lakisic/feat/x",
  });
  assert.equal(rev.kind, "pull_request");
  assert.equal(rev.prId, "9");
});

test("main tip that mentions a PR stays the branch", () => {
  const rev = classifyDeployRevision({
    version: "2.11.0",
    sha: SHA,
    branch: "main",
    ahead: 2,
    subject: "Add widgets (#9)",
    pointingRefs: ["refs/heads/main", "refs/remotes/origin/pull/9/head"],
  });
  assert.equal(rev.kind, "branch");
  assert.equal(rev.target, "branch main");
});

test("gitlab merge request ref uses MR id", () => {
  const rev = classifyDeployRevision({
    version: "2.11.0",
    sha: SHA,
    branch: "mr/15",
    ahead: 3,
  });
  assert.equal(rev.kind, "merge_request");
  assert.equal(rev.label, "v2.11.0 · 3 commits ahead · MR !15");
});

test("missing tag still names the branch without an ahead count", () => {
  const rev = classifyDeployRevision({
    version: "2.11.0",
    sha: SHA,
    branch: "main",
    ahead: null,
  });
  assert.equal(rev.kind, "branch");
  assert.equal(rev.ahead, null);
  assert.equal(rev.label, "v2.11.0 · branch main");
});

test("stamp file is used when the directory is not a git checkout", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ao-rev-"));
  const stamp = path.join(tmp, "deploy-stamp.json");
  fs.writeFileSync(
    stamp,
    JSON.stringify({
      version: "2.11.0",
      sha: SHA,
      branch: "release/2.11",
      ahead: 5,
    }),
  );
  const rev = loadDeployRevision({ repoRoot: tmp, stampPaths: [stamp] });
  assert.equal(rev.label, "v2.11.0 · 5 commits ahead · branch release/2.11");
});

test("no checkout reports dev", () => {
  const rev = classifyDeployRevision({});
  assert.equal(rev.kind, "release");
  assert.equal(rev.label, "dev");
});
