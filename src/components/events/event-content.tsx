'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { supabase } from '@/lib/supabase/client'
import { useSpaceStore } from '@/stores'
import { CalendarView } from './calendar-view'
import { EventDetails } from './event-details'
import { Event } from './types'

interface EventContentProps {
  event: Event | null
  onEventUpdate?: (event: Event | null) => void
}

function EventContentComponent({ event, onEventUpdate }: EventContentProps) {
  const spaceStore = useSpaceStore()
  const [events, setEvents] = useState<Event[]>([])

  // Load events for the current space
  useEffect(() => {
    const loadEvents = async () => {
      if (!spaceStore.currentSpaceId) return
      
      try {
        const { data, error } = await supabase
          .from('entities')
          .select('id, title, summary, event_start, event_end, event_location, event_link, metadata, created_at')
          .eq('type', 'event')
          .eq('space_id', spaceStore.currentSpaceId)
          .eq('status', 'approved')
          .order('event_start', { ascending: true })

        if (error) {
          console.error('Failed to load events:', error)
        } else {
          setEvents(data || [])
        }
      } catch (error) {
        console.error('Exception loading events:', error)
      }
    }

    loadEvents()
  }, [spaceStore.currentSpaceId])

  return (
    <div className="relative flex-1 flex flex-col h-full">
      {/* Calendar View */}
      <CalendarView events={events} onEventSelect={onEventUpdate} />
      
      {/* Floating Event Details */}
      <EventDetails event={event} onEventUpdate={onEventUpdate} />
    </div>
  )
}

export const EventContent = observer(EventContentComponent) 