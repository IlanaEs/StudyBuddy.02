// DB access only. No business logic. Backed by the calendar_connections table,
// which is service-role-only (RLS on, no policies). Refresh tokens are stored
// encrypted; this layer never decrypts — it persists/returns opaque ciphertext.

import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';

const adminClient = createSupabaseAdminClient;

export type BusySlotRow = {
  startAt: string;
  endAt: string;
  source: 'google_calendar';
};

export type CalendarConnectionRow = {
  connected: boolean;
  busySlots: BusySlotRow[];
  refreshTokenEncrypted: string | null;
  lastSyncedAt: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRow(row: any): CalendarConnectionRow {
  return {
    connected: row.connected === true,
    busySlots: (row.busy_slots ?? []) as BusySlotRow[],
    refreshTokenEncrypted: (row.refresh_token_encrypted ?? null) as string | null,
    lastSyncedAt: (row.last_synced_at ?? null) as string | null,
  };
}

export async function getConnectionByUserId(
  userId: string,
): Promise<CalendarConnectionRow | null> {
  const { data, error } = await adminClient()
    .from('calendar_connections')
    .select('connected,busy_slots,refresh_token_encrypted,last_synced_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new AppError('Failed to load calendar connection', 500);
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toRow(data as any);
}

export async function upsertConnection(
  userId: string,
  fields: {
    connected: boolean;
    connectedAt: string;
    refreshTokenEncrypted: string | null;
    busySlots: BusySlotRow[];
    lastSyncedAt: string;
  },
): Promise<void> {
  const patch: Record<string, unknown> = {
    user_id: userId,
    provider: 'google',
    connected: fields.connected,
    connected_at: fields.connectedAt,
    busy_slots: fields.busySlots,
    last_synced_at: fields.lastSyncedAt,
  };
  // Only overwrite the stored refresh token when a new one is provided. Google
  // omits the refresh_token on re-consent in some cases; keep the existing one.
  if (fields.refreshTokenEncrypted !== null) {
    patch['refresh_token_encrypted'] = fields.refreshTokenEncrypted;
  }

  const { error } = await adminClient()
    .from('calendar_connections')
    .upsert(patch, { onConflict: 'user_id' });

  if (error) throw new AppError('Failed to save calendar connection', 500);
}

export async function updateBusySlots(
  userId: string,
  busySlots: BusySlotRow[],
  lastSyncedAt: string,
): Promise<void> {
  const { error } = await adminClient()
    .from('calendar_connections')
    .update({ busy_slots: busySlots, last_synced_at: lastSyncedAt })
    .eq('user_id', userId);

  if (error) throw new AppError('Failed to update busy slots', 500);
}

export async function clearConnection(userId: string): Promise<void> {
  const { error } = await adminClient()
    .from('calendar_connections')
    .update({
      connected: false,
      refresh_token_encrypted: null,
      busy_slots: [],
      last_synced_at: null,
    })
    .eq('user_id', userId);

  if (error) throw new AppError('Failed to disconnect calendar', 500);
}
