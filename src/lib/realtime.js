import { supabase } from './supabase'

/**
 * Subscribe to multiplayer changes for a single game (host / play screens).
 * @param {string} gameCode
 * @param {{
 *   onParticipantsChange?: (payload: object) => void,
 *   onClaimsChange?: (payload: object) => void,
 *   onGameChange?: (row: object, payload: object) => void,
 * }} handlers
 * @returns {() => void} unsubscribe
 */
export function subscribeGame(gameCode, handlers = {}) {
  if (!gameCode) return () => {}

  const { onParticipantsChange, onClaimsChange, onGameChange } = handlers
  const channel = supabase.channel(`game:${gameCode}`)

  if (onParticipantsChange) {
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'game_participants',
        filter: `game_code=eq.${gameCode}`,
      },
      (payload) => onParticipantsChange(payload)
    )
    channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'game_participants',
        filter: `game_code=eq.${gameCode}`,
      },
      (payload) => onParticipantsChange(payload)
    )
  }

  if (onClaimsChange) {
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'win_claims',
        filter: `game_code=eq.${gameCode}`,
      },
      (payload) => onClaimsChange(payload)
    )
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'win_claims',
        filter: `game_code=eq.${gameCode}`,
      },
      (payload) => onClaimsChange(payload)
    )
  }

  if (onGameChange) {
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `code=eq.${gameCode}`,
      },
      (payload) => onGameChange(payload.new, payload)
    )
  }

  channel.subscribe((status, err) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.error('Game realtime channel error:', gameCode, status, err)
    }
  })

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to win_claims visible to the current user (dashboard badges).
 * No game_code filter — RLS scopes events to games the user can read.
 * @param {string} userId
 * @param {{ onChange?: (payload: object) => void }} handlers
 * @returns {() => void} unsubscribe
 */
export function subscribeDashboard(userId, handlers = {}) {
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
      (payload) => onChange(payload)
    )
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'win_claims',
      },
      (payload) => onChange(payload)
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
