import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { computeCatchUpPosition } from '../lib/sync'

const ROOM_ID = 'main'

export function useRoom() {
  const [room, setRoom] = useState(null)
  const [library, setLibrary] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch room state for late-join catch-up
  useEffect(() => {
    async function fetchRoom() {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', ROOM_ID)
        .single()

      if (error) {
        console.error('Failed to fetch room:', error)
        // If room doesn't exist yet, create a default state
        setRoom({
          id: ROOM_ID,
          current_url: null,
          is_playing: false,
          last_timestamp: 0,
          last_updated_at: new Date().toISOString(),
        })
      } else {
        setRoom(data)
      }
      setLoading(false)
    }

    fetchRoom()
  }, [])

  // Shared fetch function
  const fetchLibrary = useCallback(async () => {
    const { data, error } = await supabase
      .from('video_library')
      .select('*')
      .order('uploaded_at', { ascending: false })

    if (!error && data) {
      setLibrary(data)
    }
  }, [])

  // Fetch video library
  useEffect(() => {
    fetchLibrary()

    // Subscribe to library changes
    const channel = supabase
      .channel('video_library_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_library',
        },
        () => {
          // Re-fetch on any change
          fetchLibrary()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchLibrary])

  // Compute catch-up state for late joiners
  const getCatchUpState = useCallback(() => {
    if (!room || !room.current_url) return null

    const position = computeCatchUpPosition(
      room.last_timestamp,
      room.last_updated_at,
      room.is_playing
    )

    return {
      url: room.current_url,
      position,
      isPlaying: room.is_playing,
    }
  }, [room])

  const updateRoomUrl = useCallback(async (url) => {
    const { error } = await supabase
      .from('rooms')
      .update({
        current_url: url,
        is_playing: false,
        last_timestamp: 0,
        last_updated_at: new Date().toISOString(),
      })
      .eq('id', ROOM_ID)

    if (error) console.error('Failed to update room URL:', error)
  }, [])

  // Delete a video via the edge function (R2 + DB cleanup)
  const deleteVideo = useCallback(async (videoId, fileUrl) => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) throw new Error('Not logged in')

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-video`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ videoId, fileUrl }),
      }
    )

    if (!response.ok) {
      const errBody = await response.text()
      console.error('delete-video error:', response.status, errBody)
      throw new Error(`Failed to delete video (${response.status})`)
    }

    // Optimistic removal from local state
    setLibrary((prev) => prev.filter((v) => v.id !== videoId))
  }, [])

  // Rename a video (update filename in Supabase)
  const renameVideo = useCallback(async (videoId, newFilename) => {
    const { error } = await supabase
      .from('video_library')
      .update({ filename: newFilename })
      .eq('id', videoId)

    if (error) {
      console.error('Failed to rename video:', error)
      throw error
    }

    // Optimistic update
    setLibrary((prev) =>
      prev.map((v) => (v.id === videoId ? { ...v, filename: newFilename } : v))
    )
  }, [])

  return {
    room,
    library,
    loading,
    getCatchUpState,
    updateRoomUrl,
    deleteVideo,
    renameVideo,
    refreshLibrary: fetchLibrary,
    roomId: ROOM_ID,
  }
}
