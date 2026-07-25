import { supabase } from '../lib/supabase'

export const boardService = {
  /**
   * @param {string} gameId - Game UUID
   * @param {string} userId
   * @param {Object} boardState
   */
  async saveBoardState(gameId, userId, boardState) {
    try {
      const { error } = await supabase
        .from('board_states')
        .upsert({
          game_id: gameId,
          user_id: userId,
          board: boardState.board,
          marked_indices: Array.from(boardState.marked || []),
          has_won: boardState.hasWon || false,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'game_id,user_id',
        })

      if (error) throw error
    } catch (error) {
      console.error('Save board state error:', error)
      throw error
    }
  },

  /**
   * @param {string} gameId
   * @param {string} userId
   */
  async loadBoardState(gameId, userId) {
    try {
      const { data, error } = await supabase
        .from('board_states')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return {
        board: data.board,
        marked: new Set(data.marked_indices || []),
        hasWon: data.has_won || false,
      }
    } catch (error) {
      console.error('Load board state error:', error)
      return null
    }
  },

  /**
   * @param {string} gameId
   * @param {string} userId
   * @param {Object} config
   * @param {Array} board
   * @param {Set} marked
   */
  async saveGeneratedBoard(gameId, userId, config, board, marked) {
    try {
      await this.saveBoardState(gameId, userId, {
        board,
        marked,
        hasWon: false,
      })
    } catch (error) {
      console.error('Save generated board error:', error)
      throw error
    }
  },
}
