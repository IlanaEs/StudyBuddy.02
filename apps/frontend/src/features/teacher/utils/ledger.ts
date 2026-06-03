// Pure ledger helpers — the single place that derives a row's status and the
// finance KPIs from LedgerEntry[]. Reused by the Finance tab now and by the
// Wallet tile (T1) + student account-status tab (T4) later, so it stays free of
// React/store imports.
import type { LedgerEntry, LedgerRowStatus } from '../types/teacherDashboard.types';

// Backup auto-close window: a row closes this many hours after the teacher
// completes both checkboxes even if the student never confirms (proxy for the
// backend sweep that will own this once it lands).
export const AUTO_CLOSE_HOURS = 48;

/** Stored nowhere — the row's workflow status derived from its fields. */
export function ledgerRowStatus(e: LedgerEntry): LedgerRowStatus {
  if (e.closedAt) return 'closed';
  if (e.teacherDone && e.teacherPaid) return 'pending_student';
  return 'in_progress';
}

function isSameMonth(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

// ── KPI selectors ────────────────────────────────────────────────────────────
/** הכנסה החודש (Monthly Income) — Σ amount created in the current calendar month. */
export function monthlyIncome(entries: LedgerEntry[], now: Date = new Date()): number {
  return entries.reduce((sum, e) => (isSameMonth(e.createdAt, now) ? sum + e.amount : sum), 0);
}
/** ממתין לתשלום (Pending Payment) — Σ amount not yet marked Paid (running, all-time). */
export function pendingPayment(entries: LedgerEntry[]): number {
  return entries.reduce((sum, e) => (e.teacherPaid ? sum : sum + e.amount), 0);
}
/** שולם (Settled) — Σ amount marked Paid (running, all-time). */
export function settled(entries: LedgerEntry[]): number {
  return entries.reduce((sum, e) => (e.teacherPaid ? sum + e.amount : sum), 0);
}

// ── Per-student selectors (T4 Account Status) ────────────────────────────────
/** All ledger rows belonging to one student. */
export function studentLedgerEntries(entries: LedgerEntry[], studentId: string): LedgerEntry[] {
  return entries.filter((e) => e.studentId === studentId);
}

/**
 * חוב (Debt) — what the student actually owes: Σ amount for rows that were
 * delivered (teacherDone) but not yet Paid. A not-yet-taught lesson is not debt.
 */
export function studentOpenDebt(entries: LedgerEntry[], studentId: string): number {
  return entries.reduce(
    (sum, e) => (e.studentId === studentId && e.teacherDone && !e.teacherPaid ? sum + e.amount : sum),
    0,
  );
}
