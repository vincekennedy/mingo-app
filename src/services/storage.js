import { supabase } from '../lib/supabase'

export const storageService = {
  /**
   * Upload an image file to Supabase Storage
   * @param {File} file - Image file to upload
   * @param {string} gameCode - Game code (for organizing files)
   * @param {string} userId - User ID
   * @returns {Promise<string>} Public URL of the uploaded image
   */
  async uploadImage(file, gameCode, userId) {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image')
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        throw new Error('Image size must be less than 5MB')
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${userId}/${gameCode}/${fileName}`

      // Upload to Supabase Storage (filePath is relative to bucket root)
      const { data, error } = await supabase.storage
        .from('game-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        // Check if it's a bucket not found error
        if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
          throw new Error('Storage bucket not set up. Please run SETUP_STORAGE.sql in Supabase SQL Editor.')
        }
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('game-images')
        .getPublicUrl(data.path)

      return publicUrl
    } catch (error) {
      console.error('Storage upload error:', error)
      throw error
    }
  },

  /**
   * Delete an image from Supabase Storage
   * @param {string} imageUrl - Public URL of the image to delete
   * @returns {Promise<void>}
   */
  async deleteImage(imageUrl) {
    try {
      // Extract path from URL
      // Supabase public URL format: https://project.supabase.co/storage/v1/object/public/bucket-name/path/to/file
      const url = new URL(imageUrl)
      const pathParts = url.pathname.split('/').filter(part => part !== '')
      
      // Find the bucket name in the path
      const bucketIndex = pathParts.findIndex(part => part === 'game-images')
      if (bucketIndex !== -1) {
        // Path after bucket name
        const filePath = pathParts.slice(bucketIndex + 1).join('/')
        const { error } = await supabase.storage
          .from('game-images')
          .remove([filePath])
        if (error) throw error
        return
      }
      
      // Try alternative path format: /storage/v1/object/public/game-images/userId/gameCode/file
      const storageIndex = pathParts.findIndex(part => part === 'storage')
      if (storageIndex !== -1 && pathParts[storageIndex + 1] === 'v1') {
        const publicIndex = pathParts.findIndex((part, idx) => idx > storageIndex && part === 'public')
        if (publicIndex !== -1) {
          const filePath = pathParts.slice(publicIndex + 2).join('/') // Skip 'public' and 'game-images'
          const { error } = await supabase.storage
            .from('game-images')
            .remove([filePath])
          if (error) throw error
          return
        }
      }
      
      throw new Error('Invalid image URL format')
    } catch (error) {
      console.error('Storage delete error:', error)
      throw error
    }
  }
}
