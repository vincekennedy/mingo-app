import { supabase } from '../lib/supabase'

export type WinClaimInput = {
  type: string
  indices: number[]
  items: string[]
}

export type PendingWinClaim = {
  id: string
  userId: string
  username: string
  type: string
  indices: number[]
  items: string[]
  timestamp: number
}

export type UserClaimStatus = {
  id: string
  status: string
  type: string
  indices: number[]
  items: string[]
  incorrectIndices: number[]
  timestamp: number
}

export const winClaimsService = {
  async submitClaim(
    gameId: string,
    userId: string,
    claim: WinClaimInput,
  ): Promise<Record<string, unknown>> {
    try {
      const { data, error } = await supabase
        .from('win_claims')
        .insert({
          game_id: gameId,
          user_id: userId,
          claim_type: claim.type,
          claimed_indices: claim.indices,
          claimed_items: claim.items,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error
      return data as Record<string, unknown>
    } catch (error) {
      console.error('Submit claim error:', error)
      throw error
    }
  },

  async getPendingClaims(gameId: string): Promise<PendingWinClaim[]> {
    try {
      const { data, error } = await supabase
        .from('win_claims')
        .select(
          `
          *,
          user:users(username, display_name)
        `,
        )
        .eq('game_id', gameId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (error) throw error

      type ClaimRow = {
        id: string
        user_id: string
        claim_type: string
        claimed_indices: number[]
        claimed_items: string[]
        created_at: string
        user:
          | { username?: string; display_name?: string | null }
          | { username?: string; display_name?: string | null }[]
          | null
      }

      const rows = (data || []) as ClaimRow[]

      return rows.map((claim) => {
        const user = Array.isArray(claim.user) ? claim.user[0] : claim.user
        return {
          id: claim.id,
          userId: claim.user_id,
          username: user?.display_name || user?.username || 'Unknown',
          type: claim.claim_type,
          indices: claim.claimed_indices,
          items: claim.claimed_items,
          timestamp: new Date(claim.created_at).getTime(),
        }
      })
    } catch (error) {
      console.error('Get pending claims error:', error)
      throw error
    }
  },

  async confirmClaim(claimId: string): Promise<void> {
    try {
      const { data: claim, error: fetchError } = await supabase
        .from('win_claims')
        .select('id, game_id, user_id')
        .eq('id', claimId)
        .single()

      if (fetchError) throw fetchError

      const { error } = await supabase
        .from('win_claims')
        .update({
          status: 'confirmed',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', claimId)

      if (error) throw error

      // Drop duplicate pending claims from the same rapid-submit race so the
      // host verification UI and guest status stay on the confirmed win.
      if (claim?.game_id && claim?.user_id) {
        const { error: cleanupError } = await supabase
          .from('win_claims')
          .update({
            status: 'rejected',
            incorrect_indices: [],
            resolved_at: new Date().toISOString(),
          })
          .eq('game_id', claim.game_id)
          .eq('user_id', claim.user_id)
          .eq('status', 'pending')
          .neq('id', claimId)

        if (cleanupError) {
          console.error('Cleanup duplicate pending claims error:', cleanupError)
        }
      }
    } catch (error) {
      console.error('Confirm claim error:', error)
      throw error
    }
  },

  async rejectClaim(claimId: string, incorrectIndices: number[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('win_claims')
        .update({
          status: 'rejected',
          incorrect_indices: incorrectIndices,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', claimId)

      if (error) throw error
    } catch (error) {
      console.error('Reject claim error:', error)
      throw error
    }
  },

  async getUserClaimStatus(
    gameId: string,
    userId: string,
  ): Promise<UserClaimStatus | null> {
    try {
      const mapRow = (row: {
        id: string
        status: string
        claim_type: string
        claimed_indices: number[]
        claimed_items: string[]
        incorrect_indices?: number[] | null
        created_at: string
      }): UserClaimStatus => ({
        id: row.id,
        status: row.status,
        type: row.claim_type,
        indices: row.claimed_indices,
        items: row.claimed_items,
        incorrectIndices: row.incorrect_indices || [],
        timestamp: new Date(row.created_at).getTime(),
      })

      // Prefer a confirmed claim so a later duplicate pending claim cannot
      // hide an already-confirmed win (e.g. rapid multi-submit races).
      const { data: confirmed, error: confirmedError } = await supabase
        .from('win_claims')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (confirmedError) throw confirmedError
      if (confirmed) return mapRow(confirmed as Parameters<typeof mapRow>[0])

      const { data, error } = await supabase
        .from('win_claims')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return mapRow(data as Parameters<typeof mapRow>[0])
    } catch (error) {
      console.error('Get user claim status error:', error)
      return null
    }
  },

  async getConfirmedWinners(gameId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('win_claims')
        .select('user_id')
        .eq('game_id', gameId)
        .eq('status', 'confirmed')

      if (error) throw error

      const rows = (data || []) as Array<{ user_id: string }>
      return [...new Set(rows.map((claim) => claim.user_id))]
    } catch (error) {
      console.error('Get confirmed winners error:', error)
      return []
    }
  },

  /** Map of gameId -> hasPendingWin */
  async checkPendingWinsForGames(
    gameIds: string[],
  ): Promise<Record<string, boolean>> {
    if (!gameIds || gameIds.length === 0) return {}

    try {
      const { data, error } = await supabase
        .from('win_claims')
        .select('game_id')
        .in('game_id', gameIds)
        .eq('status', 'pending')

      if (error) throw error

      const rows = (data || []) as Array<{ game_id: string }>
      const pendingMap: Record<string, boolean> = {}
      gameIds.forEach((id) => {
        pendingMap[id] = rows.some((claim) => claim.game_id === id)
      })

      return pendingMap
    } catch (error) {
      console.error('Check pending wins error:', error)
      return {}
    }
  },
}
