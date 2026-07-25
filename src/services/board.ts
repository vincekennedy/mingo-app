import type { BoardCell } from '../lib/winDetection'
import { supabase } from '../lib/supabase'

export type BoardStatePayload = {
  board: BoardCell[]
  marked?: Set<number> | number[]
  hasWon?: boolean
}

export type LoadedBoardState = {
  board: BoardCell[]
  marked: Set<number>
  hasWon: boolean
}

export const boardService = {
  async saveBoardState(
    gameId: string,
    userId: string,
    boardState: BoardStatePayload,
  ): Promise<void> {
    try {
      const { error } = await supabase.from('board_states').upsert(
        {
          game_id: gameId,
          user_id: userId,
          board: boardState.board,
          marked_indices: Array.from(boardState.marked || []),
          has_won: boardState.hasWon || false,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'game_id,user_id',
        },
      )

      if (error) throw error
    } catch (error) {
      console.error('Save board state error:', error)
      throw error
    }
  },

  async loadBoardState(
    gameId: string,
    userId: string,
  ): Promise<LoadedBoardState | null> {
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

      const row = data as {
        board: BoardCell[]
        marked_indices?: number[] | null
        has_won?: boolean | null
      }

      return {
        board: row.board,
        marked: new Set(row.marked_indices || []),
        hasWon: row.has_won || false,
      }
    } catch (error) {
      console.error('Load board state error:', error)
      return null
    }
  },

  async saveGeneratedBoard(
    gameId: string,
    userId: string,
    _config: unknown,
    board: BoardCell[],
    marked: Set<number> | number[],
  ): Promise<void> {
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
