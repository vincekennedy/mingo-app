import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from './supabase'

type RealtimeHandlers = {
  onParticipantsChange?: (
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  ) => void
  onClaimsChange?: (
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  ) => void
  onGameChange?: (
    row: Record<string, unknown>,
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  ) => void
}

/**
 * Subscribe to multiplayer changes for a single game (host / play screens).
 * @returns unsubscribe
 */
export function subscribeGame(
  gameId: string,
  handlers: RealtimeHandlers = {},
): () => void {
  if (!gameId) return () => {}

  const { onParticipantsChange, onClaimsChange, onGameChange } = handlers
  const channel = supabase.channel(`game:${gameId}`)

  if (onParticipantsChange) {
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'game_participants',
        filter: `game_id=eq.${gameId}`,
      },
      (payload) => onParticipantsChange(payload),
    )
    channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'game_participants',
        filter: `game_id=eq.${gameId}`,
      },
      (payload) => onParticipantsChange(payload),
    )
  }

  if (onClaimsChange) {
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'win_claims',
        filter: `game_id=eq.${gameId}`,
      },
      (payload) => onClaimsChange(payload),
    )
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'win_claims',
        filter: `game_id=eq.${gameId}`,
      },
      (payload) => onClaimsChange(payload),
    )
  }

  if (onGameChange) {
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`,
      },
      (payload) =>
        onGameChange(
          (payload.new ?? {}) as Record<string, unknown>,
          payload,
        ),
    )
  }

  channel.subscribe((status, err) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.error('Game realtime channel error:', gameId, status, err)
    }
  })

  return () => {
    supabase.removeChannel(channel)
  }
}

type DashboardHandlers = {
  onChange?: (
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  ) => void
}

/**
 * Subscribe to win_claims visible to the current user (dashboard badges).
 * @returns unsubscribe
 */
export function subscribeDashboard(
  userId: string,
  handlers: DashboardHandlers = {},
): () => void {
  if (!userId) return () => {}

  const { onChange } = handlers
  const channel = supabase.channel(`dashboard:${userId}`)

  if (onChange) {
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'win_claims',
      },
      (payload) => onChange(payload),
    )
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'win_claims',
      },
      (payload) => onChange(payload),
    )
  }

  channel.subscribe((status, err) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.error('Dashboard realtime channel error:', userId, status, err)
    }
  })

  return () => {
    supabase.removeChannel(channel)
  }
}
