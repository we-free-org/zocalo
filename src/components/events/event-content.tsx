'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { supabase } from '@/lib/supabase/client'
import { useSpaceStore } from '@/stores'
import { CalendarView } from './calendar-view'
import { EventDetails } from './event-details'
import { Event } from './types'
import { entityService, EventEntityData } from '@/lib/entities'

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
        const eventEntities = await entityService.queryEntitiesWithContent<EventEntityData>({
          space_id: spaceStore.currentSpaceId,
          type: 'event',
          status: 'approved',
          order_by: 'created_at',
          order_direction: 'asc'
        })

        // Sort by event start date from parsed content
        const sortedEvents = eventEntities.sort((a, b) => {
          const aStart = new Date(a.parsedContent?.event_start || a.created_at)
          const bStart = new Date(b.parsedContent?.event_start || b.created_at)
          return aStart.getTime() - bStart.getTime()
        })

        setEvents(sortedEvents as Event[])
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