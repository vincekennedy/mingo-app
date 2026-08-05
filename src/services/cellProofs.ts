import { supabase } from '../lib/supabase'
import { compressImageForProof } from '../lib/compressImage'

const BUCKET = 'cell-proofs'
const SIGNED_URL_SECONDS = 3600

export type BoardCellProof = {
  id: string
  gameId: string
  userId: string
  cellIndex: number
  storagePath: string
  mimeType: string
  byteSize: number
  signedUrl?: string
}

type ProofRow = {
  id: string
  game_id: string
  user_id: string
  cell_index: number
  storage_path: string
  mime_type: string
  byte_size: number
}

function proofPath(gameId: string, userId: string, cellIndex: number): string {
  return `${gameId}/${userId}/${cellIndex}.jpg`
}

function mapRow(row: ProofRow, signedUrl?: string): BoardCellProof {
  return {
    id: row.id,
    gameId: row.game_id,
    userId: row.user_id,
    cellIndex: row.cell_index,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    signedUrl,
  }
}

export const cellProofsService = {
  storagePath(gameId: string, userId: string, cellIndex: number): string {
    return proofPath(gameId, userId, cellIndex)
  },

  async createSignedUrl(storagePath: string, expiresIn = SIGNED_URL_SECONDS): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, expiresIn)
    if (error) throw error
    if (!data?.signedUrl) throw new Error('No signed URL returned')
    return data.signedUrl
  },

  async listForUser(
    gameId: string,
    userId: string,
    options?: { withSignedUrls?: boolean },
  ): Promise<BoardCellProof[]> {
    const { data, error } = await supabase
      .from('board_cell_proofs')
      .select('id, game_id, user_id, cell_index, storage_path, mime_type, byte_size')
      .eq('game_id', gameId)
      .eq('user_id', userId)

    if (error) throw error
    const rows = (data || []) as ProofRow[]
    if (!options?.withSignedUrls) return rows.map((r) => mapRow(r))

    return Promise.all(
      rows.map(async (r) => {
        try {
          const signedUrl = await this.createSignedUrl(r.storage_path)
          return mapRow(r, signedUrl)
        } catch {
          return mapRow(r)
        }
      }),
    )
  },

  async listForIndices(
    gameId: string,
    userId: string,
    cellIndices: number[],
    options?: { withSignedUrls?: boolean },
  ): Promise<BoardCellProof[]> {
    if (cellIndices.length === 0) return []
    const { data, error } = await supabase
      .from('board_cell_proofs')
      .select('id, game_id, user_id, cell_index, storage_path, mime_type, byte_size')
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .in('cell_index', cellIndices)

    if (error) throw error
    const rows = (data || []) as ProofRow[]
    if (!options?.withSignedUrls) return rows.map((r) => mapRow(r))

    return Promise.all(
      rows.map(async (r) => {
        try {
          const signedUrl = await this.createSignedUrl(r.storage_path)
          return mapRow(r, signedUrl)
        } catch {
          return mapRow(r)
        }
      }),
    )
  },

  async hasProofsForIndices(
    gameId: string,
    userId: string,
    cellIndices: number[],
    board: Array<string | { isFree?: boolean } | undefined>,
  ): Promise<boolean> {
    const required = cellIndices.filter((i) => {
      const cell = board[i]
      if (typeof cell === 'object' && cell?.isFree) return false
      return true
    })
    if (required.length === 0) return true
    const proofs = await this.listForIndices(gameId, userId, required)
    const have = new Set(proofs.map((p) => p.cellIndex))
    return required.every((i) => have.has(i))
  },

  async uploadAndUpsert(
    gameId: string,
    userId: string,
    cellIndex: number,
    file: File,
  ): Promise<BoardCellProof> {
    const compressed = await compressImageForProof(file)
    const storagePath = proofPath(gameId, userId, cellIndex)

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, compressed, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'image/jpeg',
    })
    if (uploadError) {
      if (
        uploadError.message?.includes('Bucket not found') ||
        uploadError.message?.includes('not found')
      ) {
        throw new Error(
          'Photo storage is not set up. Apply migration board_cell_proofs (cell-proofs bucket).',
        )
      }
      throw uploadError
    }

    const { data, error } = await supabase
      .from('board_cell_proofs')
      .upsert(
        {
          game_id: gameId,
          user_id: userId,
          cell_index: cellIndex,
          storage_path: storagePath,
          mime_type: 'image/jpeg',
          byte_size: compressed.size,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'game_id,user_id,cell_index' },
      )
      .select('id, game_id, user_id, cell_index, storage_path, mime_type, byte_size')
      .single()

    if (error) throw error
    const signedUrl = await this.createSignedUrl(storagePath)
    return mapRow(data as ProofRow, signedUrl)
  },

  async deleteProof(gameId: string, userId: string, cellIndex: number): Promise<void> {
    const storagePath = proofPath(gameId, userId, cellIndex)
    await supabase.storage.from(BUCKET).remove([storagePath])
    await supabase
      .from('board_cell_proofs')
      .delete()
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .eq('cell_index', cellIndex)
  },

  async deleteProofsForIndices(
    gameId: string,
    userId: string,
    cellIndices: number[],
  ): Promise<void> {
    if (cellIndices.length === 0) return
    const paths = cellIndices.map((i) => proofPath(gameId, userId, i))
    await supabase.storage.from(BUCKET).remove(paths)
    await supabase
      .from('board_cell_proofs')
      .delete()
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .in('cell_index', cellIndices)
  },

  /** Host/end-game: remove all proof blobs + rows for a game. */
  async purgeGameProofs(gameId: string): Promise<void> {
    const { data, error } = await supabase
      .from('board_cell_proofs')
      .select('storage_path')
      .eq('game_id', gameId)

    if (error) throw error
    const paths = ((data || []) as { storage_path: string }[]).map((r) => r.storage_path)
    if (paths.length > 0) {
      // Storage remove accepts batches; chunk for safety.
      const chunk = 100
      for (let i = 0; i < paths.length; i += chunk) {
        const slice = paths.slice(i, i + chunk)
        const { error: rmError } = await supabase.storage.from(BUCKET).remove(slice)
        if (rmError) console.error('purgeGameProofs storage remove:', rmError)
      }
    }

    const { error: delError } = await supabase
      .from('board_cell_proofs')
      .delete()
      .eq('game_id', gameId)
    if (delError) throw delError
  },

  /** Best-effort wipe of a user's prefix after host kick (DB row already gone). */
  async purgeUserPrefix(gameId: string, userId: string): Promise<void> {
    const prefix = `${gameId}/${userId}`
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 100 })
    if (error || !data?.length) return
    const paths = data.map((f) => `${prefix}/${f.name}`)
    await supabase.storage.from(BUCKET).remove(paths)
  },
}
