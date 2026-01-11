import { supabase } from '../lib/supabase'

export const gameService = {
  /**
   * Create a new game
   * @param {string} code - Game code (5 characters)
   * @param {string} hostId - User ID of the host
   * @param {Object} config - Game configuration {items, boardSize, useFreeSpace}
   * @returns {Promise<Object>} Created game data
   */
  async createGame(code, hostId, config) {
    try {
      // Verify user profile exists first
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id')
        .eq('id', hostId)
        .single()
      
      if (profileError || !userProfile) {
        console.error('User profile not found:', hostId, profileError)
        throw new Error('User profile not found. Please ensure your account was created correctly. Try logging out and back in.')
      }
      
      // Create game
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          code,
          host_id: hostId,
          config,
          status: 'active',
        })
        .select()
        .single()
      
      if (gameError) {
        // Provide more helpful error message for foreign key constraint
        if (gameError.code === '23503' && gameError.message?.includes('host_id_fkey')) {
          throw new Error('User profile not found in database. Please try logging out and back in, or contact support if the issue persists.')
        }
        throw gameError
      }
      
      // Add host as participant
      const { error: participantError } = await supabase
        .from('game_participants')
        .insert({
          game_code: code,
          user_id: hostId,
          is_host: true,
        })
      
      if (participantError) {
        // If participant insert fails, try to clean up the game
        await supabase.from('games').delete().eq('code', code)
        throw participantError
      }
      
      return game
    } catch (error) {
      console.error('Create game error:', error)
      throw error
    }
  },
  
  /**
   * Get game by code
   * @param {string} code - Game code
   * @returns {Promise<Object>} Game data
   */
  async getGame(code) {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('code', code)
        .eq('status', 'active')
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Game not found')
        }
        throw error
      }
      
      return data
    } catch (error) {
      console.error('Get game error:', error)
      throw error
    }
  },
  
  /**
   * Join a game
   * @param {string} code - Game code
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Game data
   */
  async joinGame(code, userId) {
    try {
      // Check if game exists
      const game = await this.getGame(code)
      
      // Check if user is already a participant
      const { data: existingParticipant } = await supabase
        .from('game_participants')
        .select('*')
        .eq('game_code', code)
        .eq('user_id', userId)
        .single()
      
      if (existingParticipant) {
        // User already joined, return game
        return game
      }
      
      // Add as participant
      const { error } = await supabase
        .from('game_participants')
        .insert({
          game_code: code,
          user_id: userId,
          is_host: false,
        })
      
      if (error) {
        if (error.code === '23505') {
          // Already joined (race condition)
          return game
        }
        throw error
      }
      
      return game
    } catch (error) {
      console.error('Join game error:', error)
      throw error
    }
  },
  
  /**
   * Get all games for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of games with participant info
   */
  async getUserGames(userId) {
    try {
      const { data, error } = await supabase
        .from('game_participants')
        .select(`
          *,
          game:games(*)
        `)
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })
      
      if (error) throw error
      
      // Transform data to match expected format
      return data.map(participant => ({
        gameCode: participant.game_code,
        isHost: participant.is_host,
        joinedAt: participant.joined_at,
        config: participant.game?.config || null,
        pendingWin: false, // Will be set by checking win_claims
      }))
    } catch (error) {
      console.error('Get user games error:', error)
      throw error
    }
  },
  
  /**
   * End/delete a game (host only)
   * @param {string} code - Game code
   * @param {string} userId - User ID (must be host)
   * @returns {Promise<void>}
   */
  async endGame(code, userId) {
    try {
      // Verify user is host
      const { data: game } = await supabase
        .from('games')
        .select('host_id')
        .eq('code', code)
        .single()
      
      if (!game || game.host_id !== userId) {
        throw new Error('Only the host can end the game')
      }
      
      // Update game status to ended
      const { error } = await supabase
        .from('games')
        .update({ status: 'ended' })
        .eq('code', code)
      
      if (error) throw error
    } catch (error) {
      console.error('End game error:', error)
      throw error
    }
  },
}
