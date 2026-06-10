#!/usr/bin/env bash
# Branch cleanup — audited 2026-06-09 against origin/main @ b842903 (Merge PR #41).
# Archives risky branches as archive/* tags BEFORE deleting, so every deletion is
# recoverable. Run from anywhere in the repo. Review the pre-flight output (step 1)
# before letting the deletion steps proceed.
#
# Recovery: git branch <name> archive/<name> && git push origin <name>
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# 0) Fresh state — branch refs moved once mid-audit, so always re-fetch first.
git fetch --all --prune

# 1) Pre-flight: print patch-unique commit count vs main for EVERY remote branch.
#    Eyeball this. Anything in OUTRIGHT below that is NOT 0 here (other than the
#    known small residues on find-tutor-ds-migration / teacher-navbar-canonization
#    / teacher-system-calendar, which are merged) = STOP and investigate.
echo "=== uniq+ per remote branch (0 = fully in main) ==="
for b in $(git branch -r | grep -vE 'HEAD|origin/main$' | sed 's#origin/##'); do
  printf "%-44s %s\n" "$b" "$(git cherry origin/main "origin/$b" | grep -c '^+')"
done

# ---- Branch lists -----------------------------------------------------------
# Provably in main (Groups A+B merged, + parent-dashboard-ds tip==main). No archive.
OUTRIGHT=(
  docs/qa-reset-runbook feat/admin-foundation-a1 feat/design-system-v1-foundation
  feat/independent-student-e2e feat/oauth-onboarding-provisioning
  feat/p0-1-taxonomy-sync-guard feat/quick-matching-wizard feat/student-dashboard
  feat/teacher-dashboard-unification feat/teacher-dashboard-v2 feat/teacher-onboarding-v2
  fix/student-intakes-latest-500
  codex/api-contracts-governance codex/landing-pages feat/booking-flow
  feat/google-calendar-real-sync feat/student-onboarding-ui-polish
  feat/teacher-availability-system feat/teacher-dashboard-integration
  feat/teacher-onboarding-calendar feat/teacher-onboarding-flow
  feat/teacher-onboarding-persistence feat/parent-dashboard-backend
  feat/parent-dashboard-integration feat/parent-dashboard-ui fix/auth-foundation
  fix/matching-wizard-build-errors feat/find-tutor-ds-migration
  feat/teacher-navbar-canonization feat/teacher-system-calendar
  feat/parent-dashboard-ds
)
# Unique commits exist only on these refs → ARCHIVE (tag) before delete.
# Groups C (closed-unmerged) + D (never-PR'd orphans).
ARCHIVE=(
  chore/organize-landing-assets chore/organize-teacher-landing-assets
  feat/student-dashboard-mvp feat/teacher-landing-visual-foundation
  fix/migration-015-deployment-gap
  feat/backend-gcal-oauth feat/frontend-gcal-onboarding
  feat/navigation-ux-consistency feat/onboarding-flow-refactor
  feat/teacher-dashboard feat/teacher-dashboard-overview fix/auth-stabilization
)

# 2) (Manual, recommended) eyeball the high-risk diffs before proceeding:
#    git diff origin/main...origin/fix/migration-015-deployment-gap --stat
#    git log origin/main..origin/feat/navigation-ux-consistency --oneline

# 3) Archive the risky remote branches as tags, then push tags.
for b in "${ARCHIVE[@]}"; do
  git tag -f "archive/$b" "origin/$b"
done
# Local-only experiment (only copy in existence) — archive from its local ref.
if git show-ref --verify --quiet refs/heads/feat/student-dashboard-ds-migration; then
  git tag -f "archive/feat/student-dashboard-ds-migration" feat/student-dashboard-ds-migration
fi
git push origin --tags

# 4) Delete remote branches (outright set first, then archived set).
for b in "${OUTRIGHT[@]}" "${ARCHIVE[@]}"; do
  git push origin --delete "$b"
done

# 5) Prune local branches — keep ONLY main + feat/demo-seed-alignment.
git checkout main
for b in $(git for-each-ref --format='%(refname:short)' refs/heads \
            | grep -vxE 'main|feat/demo-seed-alignment'); do
  git branch -D "$b"
done

# 6) Final sync + report.
git fetch --all --prune
echo "=== remaining remote ===" && git branch -r | grep -v HEAD
echo "=== remaining local ===" && git branch
echo "=== archive tags ===" && git tag -l 'archive/*'
