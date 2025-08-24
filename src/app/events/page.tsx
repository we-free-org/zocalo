'use client'

import { useState, useEffect, Suspense } from 'react'
import { observer } from 'mobx-react-lite'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { AuthProvider } from '@/components/auth-provider'
import { EventsSidebar, EventContent, Event } from '@/components/events'
import { useUserStore, useSpaceStore } from '@/stores'
import { Loader2 } from 'lucide-react'

const EventsContent = observer(() => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const userStore = useUserStore()
  const spaceStore = useSpaceStore()

  // Reset selected event when space changes
  useEffect(() => {
    console.log('EventsContent: Space changed, clearing selected event')
    setSelectedEvent(null)
  }, [spaceStore.currentSpaceId])

  console.log('EventsContent: Current state:', {
    currentSpaceName: spaceStore.currentSpaceName,
    currentSpaceId: spaceStore.currentSpace?.id,
    spacesCount: spaceStore.spaces.length,
    selectedEvent: selectedEvent?.title || 'none'
  })

  return (
    <div className="flex h-full">
      {/* Events sidebar */}
      <EventsSidebar
        selectedEvent={selectedEvent}
        onEventSelect={setSelectedEvent}
      />
      
      {/* Main content */}
      <div className="flex-1">
        <EventContent 
          event={selectedEvent}
          onEventUpdate={setSelectedEvent}
        />
      </div>
    </div>
  )
})

const EventsPageContent = observer(() => {
  return (
    <DashboardLayout>
      <EventsContent />
    </DashboardLayout>
  )
})

export default function EventsPage() {
  return (
    <AuthProvider requireAuth={true}>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading events...</span>
          </div>
        </div>
      }>
        <EventsPageContent />
      </Suspense>
    </AuthProvider>
  )
} 
