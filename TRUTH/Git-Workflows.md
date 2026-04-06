Use this as a drop-in section for `TRUTH.md`:

````md
# Git Workflow Truth

## Branch Discipline

All active implementation work must happen on a dedicated working branch.

`main` is not the workspace branch.
`main` is the clean, stable, deployable checkpoint branch.

The working branch is where Codex and all new implementation operate until the work is validated.

---

## Standard Workflow

### 1. Start work on the working branch
Before making changes, confirm the current branch and repo state.

```bash
git branch --show-current
git status -sb
````

Rules:

* Do not begin new implementation work on `main`
* Keep all active edits on the designated working branch
* Confirm repo state before proceeding

---

### 2. Validate checkpoint readiness

When the current work reaches a clean, confirmed checkpoint:

* verify the repo is clean
* verify the current branch
* review the delta against `main`
* confirm the checkpoint is worth preserving

Recommended checks:

```bash
git status -sb
git diff --stat main..WORK_BRANCH
git diff --name-only main..WORK_BRANCH
git log --oneline --decorate --graph -n 10
```

Checkpoint criteria:

* branch state is understood
* work is intentional and validated
* no unresolved breakage
* no accidental junk in the diff
* repo is in a recoverable state

---

### 3. Merge checkpoint into main

Once the checkpoint is validated, update `main`, merge the working branch into `main`, and push it.

```bash
git checkout main
git pull origin main
git merge --no-ff WORK_BRANCH
git push origin main
```

Rules:

* Only merge to `main` at deliberate checkpoint stages
* Do not use `main` for experimental or in-progress work
* Every merge to `main` should represent a stable known-good state

---

### 4. Tag the checkpoint

After merging into `main`, create and push an annotated tag for the checkpoint.

```bash
git tag -a CHECKPOINT_TAG -m "Checkpoint message"
git push origin CHECKPOINT_TAG
```

Purpose of tags:

* mark exact known-good recovery points
* make rollback and reference easier
* preserve important milestones in repo history

Rule:

* important checkpoint merges to `main` should receive an annotated tag

---

### 5. Return to the working branch

After the checkpoint is merged and tagged, switch back to the working branch and continue new work there.

```bash
git checkout WORK_BRANCH
git status -sb
```

Rules:

* resume all new implementation on the working branch
* leave `main` untouched until the next validated checkpoint
* repeat the process for each future checkpoint

---

## Operating Policy

### Working branch

Used for:

* active implementation
* feature work
* experiments that are intended to mature into checkpointed work
* Codex execution and iteration

### Main

Used for:

* stable checkpointed history
* deployable state
* known-good merge points
* tagged milestone preservation

---

## Core Rule

Build on branch.
Checkpoint on main.
Tag the checkpoint.
Return to branch.

---

## Non-Negotiables

* always confirm the current branch before major work
* never assume `main` is the correct place to build
* never merge to `main` casually
* always checkpoint intentionally
* always keep `main` clean enough to trust
* use tags to mark meaningful stable states
* switch back to the working branch after checkpointing

---

## Why This Exists

This workflow exists to:

* keep `main` clean
* reduce branch chaos
* make rollbacks easy
* preserve trusted recovery points
* maintain a deployable baseline
* allow Codex to work fast without polluting stable history

---

## Default Pattern for Active Repos

For production-adjacent repos:

* use one dedicated working branch for ongoing implementation
* merge to `main` only at validated checkpoint stages
* create and push a checkpoint tag on important merges
* return immediately to the working branch after checkpointing

This is the default branch discipline unless explicitly overridden.

```
