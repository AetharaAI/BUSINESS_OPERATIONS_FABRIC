# GIT WORKFLOW DISCIPLINE

## Purpose
Define the required branch workflow for active repos so `main` stays clean, deployable, and recoverable while implementation continues safely on a dedicated working branch.

## Core Rule
Build on branch.
Checkpoint on main.
Tag the checkpoint.
Return to branch.

## Branch Roles

### Working Branch
Use for:
- active implementation
- feature work
- Codex iteration
- incomplete or evolving work

Rules:
- all new work starts here
- do not treat `main` as the working lane
- confirm branch state before making major changes

### Main
Use for:
- stable checkpointed history
- known-good merge states
- deployable baseline
- tagged recovery points

Rules:
- merge into `main` only at validated checkpoint stages
- do not use `main` for in-progress work
- keep `main` clean enough to trust at all times

## Required Workflow

### 1. Confirm Current State
Before doing work:

```bash
git branch --show-current
git status -sb
````

### 2. Work Only on the Working Branch

All active implementation happens on the designated working branch until the changes are validated.

### 3. Validate Checkpoint Readiness

Before merging to `main`, confirm:

* branch state is understood
* repo is clean
* changes are intentional
* no unresolved breakage exists
* checkpoint is worth preserving

Recommended checks:

```bash
git status -sb
git diff --stat main..WORK_BRANCH
git diff --name-only main..WORK_BRANCH
git log --oneline --decorate --graph -n 10
```

### 4. Merge Validated Work to Main

When the checkpoint is ready:

```bash
git checkout main
git pull origin main
git merge --no-ff WORK_BRANCH
git push origin main
```

### 5. Tag the Checkpoint

After merging, create and push an annotated tag:

```bash
git tag -a CHECKPOINT_TAG -m "Checkpoint message"
git push origin CHECKPOINT_TAG
```

### 6. Return to the Working Branch

Resume new work on the working branch:

```bash
git checkout WORK_BRANCH
git status -sb
```

## Non-Negotiables

* always confirm the active branch before major work
* never casually merge to `main`
* never use `main` as the default implementation lane
* always tag important checkpoint merges
* always return to the working branch after checkpointing

## Why This Exists

This workflow prevents branch chaos, preserves stable recovery points, keeps `main` deployable, and allows fast iteration without polluting trusted history.

```
