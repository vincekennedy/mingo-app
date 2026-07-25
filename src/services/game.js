import { supabase } from '../lib/supabase'

export const gameService = {
  /**
   * Create a new game
   * @param {string} code - Join code (4–12 chars vanity or 5-char random)
   * @param {string} hostId - User ID of the host
   * @param {Object} config - Game configuration
   * @param {{ visibility?: 'private' | 'public' }} [options]
   * @returns {Promise<Object>} Created game data (includes id + code)
   */
  async createGame(code, hostId, config, options = {}) {
    try {
      const visibility = options.visibility === 'public' ? 'public' : 'private'

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id')
        .eq('id', hostId)
        .single()

      if (profileError || !userProfile) {
        console.error('User profile not found:', hostId, profileError)
        throw new Error('User profile not found. Please ensure your account was created correctly. Try logging out and back in.')
      }

      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          code,
          host_id: hostId,
          config,
          status: 'active',
          visibility,
        })
        .select()
        .single()

      if (gameError) {
        if (gameError.code === '23503' && gameError.message?.includes('host_id_fkey')) {
          throw new Error('User profile not found in database. Please try logging out and back in, or contact support if the issue persists.')
        }
        if (gameError.code === '23505') {
          const err = new Error('That entry code is already in use by an active game. End that game or pick another code.')
          err.code = 'CODE_IN_USE'
          throw err
        }
        throw gameError
      }

      const { error: participantError } = await supabase
        .from('game_participants')
        .insert({
          game_id: game.id,
          user_id: hostId,
          is_host: true,
        })

      if (participantError) {
        await supabase.from('games').delete().eq('id', game.id)
        throw participantError
      }

      return game
    } catch (error) {
      console.error('Create game error:', error)
      throw error
    }
  },

  /**
   * Get active game by join code
   * @param {string} code
   * @returns {Promise<Object>}
   */
  async getGame(code) {
    try {
      const { data, error } = await supabase.rpc('get_active_game_by_code', {
        p_code: code,
      })

      if (error) throw error

      const game = Array.isArray(data) ? data[0] : data
      if (!game) {
        throw new Error('Game not found')
      }

      return game
    } catch (error) {
      console.error('Get game error:', error)
      throw error
    }
  },

  /**
   * List open public games for the lobby
   * @param {number} [limit=10]
   */
  async listPublicGames(limit = 10) {
    try {
      const { data, error } = await supabase.rpc('list_public_games', {
        p_limit: limit,
      })

      if (error) throw error

      return (data || []).map((row) => ({
        id: row.id,
        code: row.code,
        title: row.title || null,
        playerCount: Number(row.player_count) || 0,
        boardSize: row.board_size || 5,
        winMode: row.win_mode || 'standard',
        createdAt: row.created_at,
      }))
    } catch (error) {
      console.error('List public games error:', error)
      throw error
    }
  },

  /**
   * Join a game by code
   * @param {string} code
   * @param {string} userId
   */
  async joinGame(code, userId) {
    try {
      const game = await this.getGame(code)

      const { data: existingParticipant } = await supabase
        .from('game_participants')
        .select('*')
        .eq('game_id', game.id)
        .eq('user_id', userId)
        .single()

      if (existingParticipant) {
        return game
      }

      const { error } = await supabase
        .from('game_participants')
        .insert({
          game_id: game.id,
          user_id: userId,
          is_host: false,
        })

      if (error) {
        if (error.code === '23505') {
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
   * Get all active games for a user
   * @param {string} userId
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

      const activeGames = data.filter((participant) => {
        if (!participant.game) {
          console.warn('Participant has no game data:', participant)
          return false
        }
        return participant.game.status === 'active'
      })

      return activeGames.map((participant) => ({
        gameId: participant.game_id || participant.game.id,
        gameCode: participant.game.code,
        isHost: participant.is_host,
        joinedAt: participant.joined_at,
        config: participant.game?.config || null,
        visibility: participant.game?.visibility === 'public' ? 'public' : 'private',
        pendingWin: false,
      }))
    } catch (error) {
      console.error('Get user games error:', error)
      throw error
    }
  },

  /**
   * End/delete a game (host only)
   * @param {string} gameId - Game UUID
   * @param {string} userId
   */
  async endGame(gameId, userId) {
    try {
      const { data: game, error: fetchError } = await supabase
        .from('games')
        .select('host_id, status')
        .eq('id', gameId)
        .single()

      if (fetchError) {
        console.error('Error fetching game:', fetchError)
        throw fetchError
      }

      if (!game) {
        throw new Error('Game not found')
      }

      if (game.host_id !== userId) {
        throw new Error('Only the host can end the game')
      }

      const { data: updatedGame, error } = await supabase
        .from('games')
        .update({ status: 'ended' })
        .eq('id', gameId)
        .select()
        .single()

      if (error) {
        if (error.code === '42501' || error.message?.includes('row-level security') || error.message?.includes('policy')) {
          throw new Error(
            'Permission denied: Cannot update game status. This is likely an RLS policy issue.\n\n' +
            'FIX: Ensure "Hosts can update their games" RLS exists (FULL_SCHEMA_RESTORE.sql), or apply sql/archive/FIX_GAMES_UPDATE_POLICY.sql on a legacy project.'
          )
        }
        throw error
      }

      return updatedGame
    } catch (error) {
      console.error('End game error:', error)
      throw error
    }
  },

  /**
   * @param {string} gameId
   */
  async getGameParticipants(gameId) {
    try {
      const { data, error } = await supabase
        .from('game_participants')
        .select(`
          user_id,
          is_host,
          joined_at,
          user:users(username, display_name)
        `)
        .eq('game_id', gameId)
        .order('joined_at', { ascending: true })

      if (error) throw error

      return data.map((participant) => ({
        id: participant.user_id,
        username: participant.user?.display_name || participant.user?.username || 'Unknown',
        isHost: participant.is_host,
        joinedAt: participant.joined_at,
      }))
    } catch (error) {
      console.error('Get game participants error:', error)
      return []
    }
  },

  /**
   * @param {string} gameId
   */
  async markGameAsEnded(gameId) {
    try {
      const { data: updatedGame, error } = await supabase
        .from('games')
        .update({ status: 'ended' })
        .eq('id', gameId)
        .select()
        .single()

      if (error) {
        if (error.code === '42501' || error.message?.includes('row-level security') || error.message?.includes('policy')) {
          throw new Error(
            'Permission denied: Cannot update game status. This is likely an RLS policy issue.\n\n' +
            'FIX: Ensure "Hosts can update their games" RLS exists (FULL_SCHEMA_RESTORE.sql), or apply sql/archive/FIX_GAMES_UPDATE_POLICY.sql on a legacy project.'
          )
        }
        throw error
      }

      return updatedGame
    } catch (error) {
      console.error('Mark game as ended error:', error)
      throw error
    }
  },
}
