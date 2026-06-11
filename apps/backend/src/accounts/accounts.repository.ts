import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import type { Account, UserRole } from '../auth/authTypes.js';

const adminClient = createSupabaseAdminClient;
const ACCOUNT_COLUMNS = 'id,role,onboarding_completed,status,is_default';

// Idempotent: creates a NON-default account for (userId, role) and returns it. If
// one already exists for that pair it is returned unchanged (the (user_id, role)
// unique index makes this safe), so POST /api/accounts is naturally idempotent.
// A brand-new account starts onboarding_completed=false, so its onboarding runs
// from scratch regardless of the identity's other accounts.
export async function createAccount(userId: string, role: UserRole): Promise<Account> {
  const { error: upsertError } = await adminClient()
    .from('accounts')
    .upsert(
      { user_id: userId, role, is_default: false, status: 'active' },
      { onConflict: 'user_id,role', ignoreDuplicates: true },
    );

  if (upsertError) {
    throw new AppError('Unable to create account', 500);
  }

  const { data, error } = await adminClient()
    .from('accounts')
    .select(ACCOUNT_COLUMNS)
    .eq('user_id', userId)
    .eq('role', role)
    .maybeSingle();

  if (error || !data) {
    throw new AppError('Unable to load created account', 500);
  }

  return data as Account;
}
