import { supabase } from '../lib/supabase'

export const winClaimsService = {
  /**
   * @param {string} gameId
   * @param {string} userId
   * @param {Object} claim
   */
  async submitClaim(gameId, userId, claim) {
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
      return data
    } catch (error) {
      console.error('Submit claim error:', error)
      throw error
    }
  },

  /**
   * @param {string} gameId
   */
  async getPendingClaims(gameId) {
    try {
      const { data, error } = await supabase
        .from('win_claims')
        .select(`
          *,
          user:users(username, display_name)
        `)
        .eq('game_id', gameId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (error) throw error

      return data.map((claim) => ({
        id: claim.id,
        userId: claim.user_id,
        username: claim.user?.display_name || claim.user?.username || 'Unknown',
        type: claim.claim_type,
        indices: claim.claimed_indices,
        items: claim.claimed_items,
        timestamp: new Date(claim.created_at).getTime(),
      }))
    } catch (error) {
      console.error('Get pending claims error:', error)
      throw error
    }
  },

  async confirmClaim(claimId) {
    try {
      const { error } = await supabase
        .from('win_claims')
        .update({
          status: 'confirmed',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', claimId)

      if (error) throw error
    } catch (error) {
      console.error('Confirm claim error:', error)
      throw error
    }
  },

  async rejectClaim(claimId, incorrectIndices) {
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

  /**
   * @param {string} gameId
   * @param {string} userId
   */
  async getUserClaimStatus(gameId, userId) {
    try {
      const { data, error } = await supabase
        .from('win_claims')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return {
        id: data.id,
        status: data.status,
        type: data.claim_type,
        indices: data.claimed_indices,
        items: data.claimed_items,
        incorrectIndices: data.incorrect_indices || [],
        timestamp: new Date(data.created_at).getTime(),
      }
    } catch (error) {
      console.error('Get user claim status error:', error)
      return null
    }
  },

  /**
   * @param {string} gameId
   */
  async getConfirmedWinners(gameId) {
    try {
      const { data, error } = await supabase
        .from('win_claims')
        .select('user_id')
        .eq('game_id', gameId)
        .eq('status', 'confirmed')

      if (error) throw error

      return [...new Set(data.map((claim) => claim.user_id))]
    } catch (error) {
      console.error('Get confirmed winners error:', error)
      return []
    }
  },

  /**
   * @param {string[]} gameIds
   * @returns {Promise<Object>} Map of gameId -> hasPendingWin
   */
  async checkPendingWinsForGames(gameIds) {
    if (!gameIds || gameIds.length === 0) return {}

    try {
      const { data, error } = await supabase
        .from('win_claims')
        .select('game_id')
        .in('game_id', gameIds)
        .eq('status', 'pending')

      if (error) throw error

      const pendingMap = {}
      gameIds.forEach((id) => {
        pendingMap[id] = data.some((claim) => claim.game_id === id)
      })

      return pendingMap
    } catch (error) {
      console.error('Check pending wins error:', error)
      return {}
    }
  },
}
