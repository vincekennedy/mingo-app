import { supabase } from '../lib/supabase'

export const boardService = {
  /**
   * Save board state for a user in a game
   * @param {string} gameCode - Game code
   * @param {string} userId - User ID
   * @param {Object} boardState - Board state {board, marked, hasWon, pendingWinClaim, winConfirmed, winRejected}
   * @returns {Promise<void>}
   */
  async saveBoardState(gameCode, userId, boardState) {
    try {
      const { error } = await supabase
        .from('board_states')
        .upsert({
          game_code: gameCode,
          user_id: userId,
          board: boardState.board,
          marked_indices: Array.from(boardState.marked || []),
          has_won: boardState.hasWon || false,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'game_code,user_id'
        })
      
      if (error) throw error
    } catch (error) {
      console.error('Save board state error:', error)
      throw error
    }
  },
  
  /**
   * Load board state for a user in a game
   * @param {string} gameCode - Game code
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Board state or null if not found
   */
  async loadBoardState(gameCode, userId) {
    try {
      const { data, error } = await supabase
        .from('board_states')
        .select('*')
        .eq('game_code', gameCode)
        .eq('user_id', userId)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null // No board state found
        }
        throw error
      }
      
      return {
        board: data.board,
        marked: new Set(data.marked_indices || []),
        hasWon: data.has_won || false,
        // Note: pendingWinClaim, winConfirmed, winRejected are stored in win_claims table
      }
    } catch (error) {
      console.error('Load board state error:', error)
      return null
    }
  },
  
  /**
   * Generate and save a new board for a user
   * @param {string} gameCode - Game code
   * @param {string} userId - User ID
   * @param {Object} config - Game configuration
   * @param {Array} board - Generated board array
   * @param {Set} marked - Marked cells set
   * @returns {Promise<void>}
   */
  async saveGeneratedBoard(gameCode, userId, config, board, marked) {
    try {
      await this.saveBoardState(gameCode, userId, {
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
