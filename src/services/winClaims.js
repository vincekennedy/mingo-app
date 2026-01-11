import { supabase } from '../lib/supabase'

export const winClaimsService = {
  /**
   * Submit a win claim
   * @param {string} gameCode - Game code
   * @param {string} userId - User ID
   * @param {Object} claim - Claim data {type, indices, items}
   * @returns {Promise<Object>} Created claim
   */
  async submitClaim(gameCode, userId, claim) {
    try {
      const { data, error } = await supabase
        .from('win_claims')
        .insert({
          game_code: gameCode,
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
   * Get pending claims for a game (host only)
   * @param {string} gameCode - Game code
   * @returns {Promise<Array>} Array of pending claims
   */
  async getPendingClaims(gameCode) {
    try {
      const { data, error } = await supabase
        .from('win_claims')
        .select(`
          *,
          user:users(username)
        `)
        .eq('game_code', gameCode)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      
      if (error) throw error
      
      return data.map(claim => ({
        id: claim.id,
        userId: claim.user_id,
        username: claim.user?.username || 'Unknown',
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
  
  /**
   * Confirm a win claim (host only)
   * @param {string} claimId - Claim ID
   * @returns {Promise<void>}
   */
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
  
  /**
   * Reject a win claim (host only)
   * @param {string} claimId - Claim ID
   * @param {Array} incorrectIndices - Array of incorrect item indices
   * @returns {Promise<void>}
   */
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
   * Get claim status for a user in a game
   * @param {string} gameCode - Game code
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Claim status or null
   */
  async getUserClaimStatus(gameCode, userId) {
    try {
      const { data, error } = await supabase
        .from('win_claims')
        .select('*')
        .eq('game_code', gameCode)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null // No claim found
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
   * Check if there are pending wins for games where user is host
   * @param {Array} gameCodes - Array of game codes
   * @returns {Promise<Object>} Map of gameCode -> hasPendingWin
   */
  async checkPendingWinsForGames(gameCodes) {
    if (!gameCodes || gameCodes.length === 0) return {}
    
    try {
      const { data, error } = await supabase
        .from('win_claims')
        .select('game_code')
        .in('game_code', gameCodes)
        .eq('status', 'pending')
      
      if (error) throw error
      
      const pendingMap = {}
      gameCodes.forEach(code => {
        pendingMap[code] = data.some(claim => claim.game_code === code)
      })
      
      return pendingMap
    } catch (error) {
      console.error('Check pending wins error:', error)
      return {}
    }
  },
}
