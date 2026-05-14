-- StudyBuddy.02 Security Hardening
-- 007_security_hardening.sql
-- Keeps shared database helpers deterministic without adding product logic.

alter function public.set_updated_at()
set search_path = public;
