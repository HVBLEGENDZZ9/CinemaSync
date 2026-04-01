/**
 * Room uru8 — Realtime sync protocol
 *
 * All sync events are broadcast on the `room:main` Supabase Realtime channel.
 * The core principle: never trust client clocks. Use serverTimestamp offsets.
 */

export const CHANNEL_NAME = 'room:main'

export const EVENTS = {
  VIDEO_LOAD: 'VIDEO_LOAD',
  PLAY: 'PLAY',
  PAUSE: 'PAUSE',
  SEEK: 'SEEK',
  BUFFER_START: 'BUFFER_START',
  BUFFER_END: 'BUFFER_END',
}

/**
 * Compute the adjusted video timestamp for a PLAY event,
 * accounting for network latency via server timestamp offset.
 */
export function computePlayPosition(videoTimestamp, serverTimestamp) {
  const elapsed = (Date.now() - serverTimestamp) / 1000
  return videoTimestamp + Math.max(0, elapsed)
}

/**
 * Compute the catch-up position for late joiners using the room's
 * persisted state from the database.
 */
export function computeCatchUpPosition(lastTimestamp, lastUpdatedAt, isPlaying) {
  if (!isPlaying) return lastTimestamp
  const elapsed = (Date.now() - new Date(lastUpdatedAt).getTime()) / 1000
  return lastTimestamp + Math.max(0, elapsed)
}

/**
 * Create a debounced function that delays invocation until after
 * `wait` ms have elapsed since the last call.
 */
export function debounce(fn, wait) {
  let timer = null
  function debounced(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, wait)
  }
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
  return debounced
}

/**
 * Format seconds into mm:ss display string.
 */
export function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * Persist room state to the database so late joiners can catch up.
 */
export async function persistRoomState(supabase, roomId, state) {
  const { error } = await supabase
    .from('rooms')
    .update({
      current_url: state.currentUrl,
      is_playing: state.isPlaying,
      last_timestamp: state.lastTimestamp,
      last_updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)

  if (error) {
    console.error('Failed to persist room state:', error)
  }
}
