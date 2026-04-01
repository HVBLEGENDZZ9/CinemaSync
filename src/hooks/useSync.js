import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CHANNEL_NAME, EVENTS, debounce } from '../lib/sync'

export function useSync({ onEvent }) {
  const channelRef = useRef(null)
  const onEventRef = useRef(onEvent)
  const broadcastSeekRef = useRef(null)
  const [partnerPresence, setPartnerPresence] = useState(null)

  // Keep callback ref fresh
  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  // Initialize debounced seek broadcaster
  useEffect(() => {
    broadcastSeekRef.current = debounce((payload) => {
      if (!channelRef.current) return
      channelRef.current.send({
        type: 'broadcast',
        event: EVENTS.SEEK,
        payload: {
          ...payload,
          serverTimestamp: Date.now(),
        },
      })
    }, 50)

    return () => {
      broadcastSeekRef.current?.cancel()
    }
  }, [])

  useEffect(() => {
    const channel = supabase.channel(CHANNEL_NAME, {
      config: {
        presence: { key: 'user' },
      },
    })

    // Listen for broadcast events
    Object.values(EVENTS).forEach((event) => {
      channel.on('broadcast', { event }, (payload) => {
        onEventRef.current?.(event, payload.payload)
      })
    })

    // Track presence
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const users = Object.values(state).flat()
      setPartnerPresence(users.length > 1 ? users[1] : null)
    })

    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      if (newPresences.length > 0) {
        setPartnerPresence(newPresences[0])
      }
    })

    channel.on('presence', { event: 'leave' }, () => {
      const state = channel.presenceState()
      const users = Object.values(state).flat()
      setPartnerPresence(users.length > 1 ? users[1] : null)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (user) {
          channel.track({
            user_id: user.id,
            username: user.email?.replace('@sri.sakhi', '') ?? 'unknown',
            online_at: new Date().toISOString(),
          })
        }
      }
    })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [])

  const broadcast = useCallback((event, payload) => {
    if (!channelRef.current) return
    channelRef.current.send({
      type: 'broadcast',
      event,
      payload: {
        ...payload,
        serverTimestamp: Date.now(),
      },
    })
  }, [])

  const broadcastSeek = useCallback((payload) => {
    broadcastSeekRef.current?.(payload)
  }, [])

  return {
    broadcast,
    broadcastSeek,
    partnerPresence,
    EVENTS,
  }
}
