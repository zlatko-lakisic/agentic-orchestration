/**
 * Deployed revision for Admin: published VERSION, plus how far the checkout
 * is ahead when it is a branch, commit, or pull/merge request.
 *
 * Live git wins when `.git` is present (dev machine, host checkout).
 * The coordinator pod has no `.git`; it reads deploy-stamp.json written on
 * the device into the Admin hostPath (`public/admin/deploy-stamp.json`).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const GIT_TIMEOUT_MS = 2500;

export function normalizeVersion(raw) {
  const text = String(raw || "").trim().replace(/^v/i, "");
  return text || null;
}

function parseAhead(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

function matchRef(text) {
  const s = String(text || "");
  let m = s.match(/(?:refs\/)?pull\/(\d+)(?:\/|\b)/i);
  if (m) return { kind: "pull_request", id: m[1] };
  m = s.match(/(?:^|[^\w])pr[-/](\d+)\b/i);
  if (m) return { kind: "pull_request", id: m[1] };
  m = s.match(/merge-requests?\/(\d+)/i);
  if (m) return { kind: "merge_request", id: m[1] };
  m = s.match(/(?:^|[^\w])mr[-/](\d+)\b/i);
  if (m) return { kind: "merge_request", id: m[1] };
  return null;
}

function matchBranchConfig(text) {
  const fromRef = matchRef(text);
  if (fromRef) return fromRef;
  const s = String(text || "");
  let m = s.match(/#(\d+)\b/);
  if (m) return { kind: "pull_request", id: m[1] };
  m = s.match(/!(\d+)\b/);
  if (m && /merge request/i.test(s)) return { kind: "merge_request", id: m[1] };
  return null;
}

function matchMergeSubject(subject) {
  const s = String(subject || "");
  let m = s.match(/Merge pull request #(\d+)/i);
  if (m) return { kind: "pull_request", id: m[1] };
  m = s.match(/See merge request\b.*!(\d+)/i) || s.match(/Merge request !(\d+)/i);
  if (m) return { kind: "merge_request", id: m[1] };
  return null;
}

export function findPullRequest(facts, { detached }) {
  // A named branch is the deploy target. A pull ref that merely points at the
  // same commit (typical right after merging to main) must not replace it.
  if (!detached && facts?.branch) {
    const fromBranch = matchRef(facts.branch);
    if (fromBranch) return fromBranch;
    const fromUpstream = matchRef(facts.upstream);
    if (fromUpstream) return fromUpstream;
    return matchBranchConfig(facts.branchConfig);
  }
  const blobs = [];
  if (facts?.decorations) blobs.push(facts.decorations);
  if (Array.isArray(facts?.pointingRefs)) blobs.push(...facts.pointingRefs);
  for (const text of blobs) {
    const hit = matchRef(text);
    if (hit) return hit;
  }
  return matchMergeSubject(facts?.subject);
}

function targetFor(kind, { branch, shortSha, prId }) {
  if (kind === "pull_request" && prId) return `PR #${prId}`;
  if (kind === "merge_request" && prId) return `MR !${prId}`;
  if (kind === "branch" && branch) return `branch ${branch}`;
  if (kind === "commit" && shortSha) return shortSha;
  return null;
}

export function formatDeployLabel({ version, kind, ahead, target }) {
  const ver = version ? `v${normalizeVersion(version)}` : "dev";
  if (kind === "release" || !target) return ver;
  const parts = [ver];
  if (ahead != null && ahead > 0) {
    parts.push(ahead === 1 ? "1 commit ahead" : `${ahead} commits ahead`);
  }
  parts.push(target);
  return parts.join(" · ");
}

/**
 * @param {object} facts version, sha, branch, subject, decorations, upstream,
 *   branchConfig, pointingRefs, ahead
 */
export function classifyDeployRevision(facts = {}) {
  const version = normalizeVersion(facts.version);
  const sha = String(facts.sha || "").trim() || null;
  const shortSha = sha ? sha.slice(0, 7) : null;
  const branchName = String(facts.branch || "").trim();
  const detached = !branchName || branchName === "HEAD";
  const branch = detached ? null : branchName;
  const ahead = parseAhead(facts.ahead);
  const subject = String(facts.subject || "").trim() || null;
  const pr = findPullRequest(facts, { detached });

  let kind = "release";
  if (ahead === 0) {
    kind = "release";
  } else if (pr) {
    kind = pr.kind;
  } else if (branch) {
    kind = "branch";
  } else if (shortSha) {
    kind = "commit";
  }

  const prId = pr && kind !== "release" ? pr.id : null;
  const target = targetFor(kind, { branch, shortSha, prId });
  const label = formatDeployLabel({ version, kind, ahead, target });
  return {
    version,
    label,
    kind,
    ahead: kind === "release" ? 0 : ahead,
    branch,
    sha,
    shortSha,
    prId,
    subject,
    target,
  };
}

function git(repoRoot, args) {
  const result = spawnSync("git", ["-C", repoRoot, ...args], {
    encoding: "utf8",
    timeout: GIT_TIMEOUT_MS,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) return null;
  return String(result.stdout || "").trim();
}

export function readVersionFile(repoRoot) {
  const candidates = [
    path.join(repoRoot, "VERSION"),
    path.join(repoRoot, "agentic-orchestration-tool", "VERSION"),
  ];
  for (const candidate of candidates) {
    try {
      const text = fs.readFileSync(candidate, "utf8").trim();
      const version = normalizeVersion(text);
      if (version) return version;
    } catch {
      /* next candidate */
    }
  }
  return null;
}

export function readGitFacts(repoRoot) {
  if (!repoRoot || !fs.existsSync(path.join(repoRoot, ".git"))) return null;
  const sha = git(repoRoot, ["rev-parse", "HEAD"]);
  if (!sha) return null;
  const branch = git(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]) || "HEAD";
  const subject = git(repoRoot, ["log", "-1", "--format=%s"]) || "";
  const decorations = git(repoRoot, ["log", "-1", "--format=%D"]) || "";
  let upstream = "";
  if (branch !== "HEAD") {
    upstream =
      git(repoRoot, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]) || "";
  }
  let branchConfig = "";
  if (branch !== "HEAD") {
    const listed = git(repoRoot, ["config", "--local", "--list"]) || "";
    const prefix = `branch.${branch}.`;
    branchConfig = listed
      .split(/\r?\n/)
      .filter((line) => line.startsWith(prefix))
      .join("\n");
  }
  const pointingRaw = git(repoRoot, ["for-each-ref", "--points-at", "HEAD", "--format=%(refname)"]);
  const pointingRefs = pointingRaw ? pointingRaw.split(/\r?\n/).filter(Boolean) : [];
  const version = readVersionFile(repoRoot);
  let ahead = null;
  if (version) {
    const tagSha = git(repoRoot, ["rev-parse", "-q", "--verify", `v${version}^{commit}`]);
    if (tagSha) {
      const count = git(repoRoot, ["rev-list", "--count", `${tagSha}..HEAD`]);
      if (count != null && /^\d+$/.test(count)) ahead = Number(count);
    }
  }
  return {
    version,
    sha,
    branch,
    subject,
    decorations,
    upstream,
    branchConfig,
    pointingRefs,
    ahead,
  };
}

export function readDeployStamp(stampPaths) {
  for (const stampPath of stampPaths || []) {
    if (!stampPath) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(stampPath, "utf8"));
      if (raw && typeof raw === "object") return raw;
    } catch {
      /* next candidate */
    }
  }
  return null;
}

export function loadDeployRevision({ repoRoot, stampPaths = [] } = {}) {
  const live = readGitFacts(repoRoot);
  const facts = live || readDeployStamp(stampPaths) || {};
  if (!facts.version && repoRoot) facts.version = readVersionFile(repoRoot);
  return classifyDeployRevision(facts);
}
