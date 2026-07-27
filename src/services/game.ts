import { supabase } from '../lib/supabase'

export type GameVisibility = 'private' | 'public'

export type GameRow = {
  id: string
  code: string
  host_id: string
  config: Record<string, unknown> | null
  status: string
  visibility?: GameVisibility | string | null
  [key: string]: unknown
}

export type PublicLobbyGame = {
  id: string
  code: string
  title: string | null
  playerCount: number
  boardSize: number
  winMode: string
  createdAt: string
}

export type UserGameSummary = {
  gameId: string
  gameCode: string
  isHost: boolean
  joinedAt: string
  config: Record<string, unknown> | null
  visibility: GameVisibility
  pendingWin: boolean
}

export type GameParticipantSummary = {
  id: string
  username: string
  isHost: boolean
  joinedAt: string
}

type CodeInUseError = Error & { code: 'CODE_IN_USE' }

export const gameService = {
  /**
   * Create a new game
   * @param code Join code (4–12 chars vanity or 5-char random)
   */
  async createGame(
    code: string,
    hostId: string,
    config: Record<string, unknown>,
    options: { visibility?: GameVisibility } = {},
  ): Promise<GameRow> {
    try {
      const visibility = options.visibility === 'public' ? 'public' : 'private'

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id')
        .eq('id', hostId)
        .single()

      if (profileError || !userProfile) {
        console.error('User profile not found:', hostId, profileError)
        throw new Error(
          'User profile not found. Please ensure your account was created correctly. Try logging out and back in.',
        )
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
          throw new Error(
            'User profile not found in database. Please try logging out and back in, or contact support if the issue persists.',
          )
        }
        if (gameError.code === '23505') {
          const err = new Error(
            'That entry code is already in use by an active game. End that game or pick another code.',
          ) as CodeInUseError
          err.code = 'CODE_IN_USE'
          throw err
        }
        throw gameError
      }

      const gameRow = game as GameRow

      const { error: participantError } = await supabase
        .from('game_participants')
        .insert({
          game_id: gameRow.id,
          user_id: hostId,
          is_host: true,
        })

      if (participantError) {
        await supabase.from('games').delete().eq('id', gameRow.id)
        throw participantError
      }

      return gameRow
    } catch (error) {
      console.error('Create game error:', error)
      throw error
    }
  },

  /** Get active game by join code */
  async getGame(code: string): Promise<GameRow> {
    try {
      const { data, error } = await supabase.rpc('get_active_game_by_code', {
        p_code: code,
      })

      if (error) throw error

      const game = (Array.isArray(data) ? data[0] : data) as GameRow | null | undefined
      if (!game) {
        throw new Error('Game not found')
      }

      return game
    } catch (error) {
      console.error('Get game error:', error)
      throw error
    }
  },

  /** List open public games for the lobby */
  async listPublicGames(limit = 10): Promise<PublicLobbyGame[]> {
    try {
      const { data, error } = await supabase.rpc('list_public_games', {
        p_limit: limit,
      })

      if (error) throw error

      const rows = (data || []) as Array<{
        id: string
        code: string
        title?: string | null
        player_count?: number | string | null
        board_size?: number | null
        win_mode?: string | null
        created_at: string
      }>

      return rows.map((row) => ({
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

  /** Remove a player from a game. Optionally ban them from rejoining this game. */
  async removePlayer(
    gameId: string,
    userId: string,
    { ban = false }: { ban?: boolean } = {},
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('host_remove_player', {
        p_game_id: gameId,
        p_user_id: userId,
        p_ban: ban,
      })
      if (error) throw error
    } catch (error) {
      console.error('Remove player error:', error)
      throw error
    }
  },

  /** True if this user is banned from the game. */
  async isUserBanned(gameId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('game_bans')
        .select('id')
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error
      return Boolean(data)
    } catch (error) {
      console.error('Check ban error:', error)
      return false
    }
  },

  /** Join a game by code */
  async joinGame(code: string, userId: string): Promise<GameRow> {
    try {
      const game = await this.getGame(code)

      if (await this.isUserBanned(game.id, userId)) {
        throw new Error('You were banned from this game by the host.')
      }

      const { data: existingParticipant } = await supabase
        .from('game_participants')
        .select('*')
        .eq('game_id', game.id)
        .eq('user_id', userId)
        .single()

      if (existingParticipant) {
        return game
      }

      const { error } = await supabase.from('game_participants').insert({
        game_id: game.id,
        user_id: userId,
        is_host: false,
      })

      if (error) {
        if (error.code === '23505') {
          return game
        }
        // RLS rejection when banned (policy WITH CHECK)
        if (
          error.code === '42501' ||
          /policy|permission|row-level/i.test(error.message || '')
        ) {
          throw new Error('You were banned from this game by the host.')
        }
        throw error
      }

      return game
    } catch (error) {
      console.error('Join game error:', error)
      throw error
    }
  },

  /** Get all active games for a user */
  async getUserGames(userId: string): Promise<UserGameSummary[]> {
    try {
      const { data, error } = await supabase
        .from('game_participants')
        .select(
          `
          *,
          game:games(*)
        `,
        )
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })

      if (error) throw error

      type ParticipantWithGame = {
        game_id?: string
        is_host: boolean
        joined_at: string
        game: GameRow | null
      }

      const rows = (data || []) as ParticipantWithGame[]

      const activeGames = rows.filter((participant) => {
        if (!participant.game) {
          console.warn('Participant has no game data:', participant)
          return false
        }
        return participant.game.status === 'active'
      })

      return activeGames.map((participant) => {
        const game = participant.game as GameRow
        return {
          gameId: participant.game_id || game.id,
          gameCode: game.code,
          isHost: participant.is_host,
          joinedAt: participant.joined_at,
          config: (game.config as Record<string, unknown> | null) || null,
          visibility: game.visibility === 'public' ? 'public' : 'private',
          pendingWin: false,
        }
      })
    } catch (error) {
      console.error('Get user games error:', error)
      throw error
    }
  },

  /** End/delete a game (host only) */
  async endGame(gameId: string, userId: string): Promise<GameRow> {
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

      const gameMeta = game as { host_id: string; status: string }

      if (gameMeta.host_id !== userId) {
        throw new Error('Only the host can end the game')
      }

      const { data: updatedGame, error } = await supabase
        .from('games')
        .update({ status: 'ended' })
        .eq('id', gameId)
        .select()
        .single()

      if (error) {
        if (
          error.code === '42501' ||
          error.message?.includes('row-level security') ||
          error.message?.includes('policy')
        ) {
          throw new Error(
            'Permission denied: Cannot update game status. This is likely an RLS policy issue.\n\n' +
              'FIX: Ensure "Hosts can update their games" RLS exists (FULL_SCHEMA_RESTORE.sql), or apply sql/archive/FIX_GAMES_UPDATE_POLICY.sql on a legacy project.',
          )
        }
        throw error
      }

      return updatedGame as GameRow
    } catch (error) {
      console.error('End game error:', error)
      throw error
    }
  },

  async getGameParticipants(gameId: string): Promise<GameParticipantSummary[]> {
    try {
      const { data, error } = await supabase
        .from('game_participants')
        .select(
          `
          user_id,
          is_host,
          joined_at,
          user:users(username, display_name)
        `,
        )
        .eq('game_id', gameId)
        .order('joined_at', { ascending: true })

      if (error) throw error

      type ParticipantRow = {
        user_id: string
        is_host: boolean
        joined_at: string
        user:
          | { username?: string; display_name?: string | null }
          | { username?: string; display_name?: string | null }[]
          | null
      }

      const rows = (data || []) as ParticipantRow[]

      return rows.map((participant) => {
        const user = Array.isArray(participant.user)
          ? participant.user[0]
          : participant.user
        return {
          id: participant.user_id,
          username: user?.display_name || user?.username || 'Unknown',
          isHost: participant.is_host,
          joinedAt: participant.joined_at,
        }
      })
    } catch (error) {
      console.error('Get game participants error:', error)
      return []
    }
  },

  async markGameAsEnded(gameId: string): Promise<GameRow> {
    try {
      const { data: updatedGame, error } = await supabase
        .from('games')
        .update({ status: 'ended' })
        .eq('id', gameId)
        .select()
        .single()

      if (error) {
        if (
          error.code === '42501' ||
          error.message?.includes('row-level security') ||
          error.message?.includes('policy')
        ) {
          throw new Error(
            'Permission denied: Cannot update game status. This is likely an RLS policy issue.\n\n' +
              'FIX: Ensure "Hosts can update their games" RLS exists (FULL_SCHEMA_RESTORE.sql), or apply sql/archive/FIX_GAMES_UPDATE_POLICY.sql on a legacy project.',
          )
        }
        throw error
      }

      return updatedGame as GameRow
    } catch (error) {
      console.error('Mark game as ended error:', error)
      throw error
    }
  },
}
