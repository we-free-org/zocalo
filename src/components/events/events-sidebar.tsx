'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Plus, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase/client'
import { useSpaceStore } from '@/stores'
import { cn } from '@/lib/utils'
import { Event } from './types'
import { entityService, EventEntityData } from '@/lib/entities'

interface EventsSidebarProps {
  selectedEvent: Event | null
  onEventSelect: (event: Event | null) => void
}



// Empty state component
const EmptyState = ({ 
  isCreateDialogOpen, 
  setIsCreateDialogOpen,
  newEvent,
  setNewEvent,
  handleCreateEvent,
  isCreating,
  createError,
  setCreateError
}: {
  isCreateDialogOpen: boolean
  setIsCreateDialogOpen: (open: boolean) => void
  newEvent: { title: string; summary: string; start_date: string; start_time: string; end_date: string; end_time: string; event_location: string; event_link: string }
  setNewEvent: React.Dispatch<React.SetStateAction<{ title: string; summary: string; start_date: string; start_time: string; end_date: string; end_time: string; event_location: string; event_link: string }>>
  handleCreateEvent: () => Promise<void>
  isCreating: boolean
  createError: string | null
  setCreateError: (error: string | null) => void
}) => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
    <Calendar className="h-16 w-16 text-purple-500 mb-4" />
    <h3 className="text-lg font-semibold text-foreground mb-2">No events yet</h3>
    <p className="text-muted-foreground mb-6 max-w-sm">
      Get started by creating your first event. Schedule meetings, deadlines, or any important dates.
    </p>
    
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          className="bg-purple-600 hover:bg-purple-700 text-white"
          onClick={() => setCreateError(null)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create your first event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Add a new event to your calendar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {createError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {createError}
            </div>
          )}
          <div>
            <Label htmlFor="event-title">Event Title</Label>
            <Input
              id="event-title"
              value={newEvent.title}
              onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter event title..."
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="event-summary">Description (Optional)</Label>
            <Textarea
              id="event-summary"
              value={newEvent.summary}
              onChange={(e) => setNewEvent(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="Enter event description..."
              className="mt-1"
              rows={3}
            />
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Start Date & Time</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <Label htmlFor="start-date" className="text-xs text-muted-foreground">Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={newEvent.start_date}
                    onChange={(e) => setNewEvent(prev => ({ 
                      ...prev, 
                      start_date: e.target.value,
                      end_date: prev.end_date || e.target.value
                    }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="start-time" className="text-xs text-muted-foreground">Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={newEvent.start_time}
                    onChange={(e) => {
                      const startTime = e.target.value
                      const [hours, minutes] = startTime.split(':').map(Number)
                      const endHour = (hours + 1) % 24
                      const endTime = `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
                      
                      setNewEvent(prev => ({ 
                        ...prev, 
                        start_time: startTime,
                        end_time: prev.end_time || endTime
                      }))
                    }}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">End Date & Time (Optional)</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <Label htmlFor="end-date" className="text-xs text-muted-foreground">Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={newEvent.end_date}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, end_date: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="end-time" className="text-xs text-muted-foreground">Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, end_time: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="event-location">Location (Optional)</Label>
            <Input
              id="event-location"
              value={newEvent.event_location}
              onChange={(e) => setNewEvent(prev => ({ ...prev, event_location: e.target.value }))}
              placeholder="Enter location..."
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="event-link">Link (Optional)</Label>
            <Input
              id="event-link"
              type="url"
              value={newEvent.event_link}
              onChange={(e) => setNewEvent(prev => ({ ...prev, event_link: e.target.value }))}
              placeholder="https://..."
              className="mt-1"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateEvent}
              disabled={isCreating || !newEvent.title || !newEvent.start_date || !newEvent.start_time}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isCreating ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
)

function EventsSidebarComponent({ selectedEvent, onEventSelect }: EventsSidebarProps) {
  const spaceStore = useSpaceStore()
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  // Generate default values
  const getDefaultDateTime = () => {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    
    const startTime = now.getHours() < 23 ? 
      `${(now.getHours() + 1).toString().padStart(2, '0')}:00` : 
      '09:00'
    
    const endHour = now.getHours() < 22 ? now.getHours() + 2 : 10
    const endTime = `${endHour.toString().padStart(2, '0')}:00`
    
    return {
      start_date: tomorrow.toISOString().split('T')[0],
      start_time: startTime,
      end_date: tomorrow.toISOString().split('T')[0],
      end_time: endTime
    }
  }

  const [newEvent, setNewEvent] = useState(() => {
    const defaults = getDefaultDateTime()
    return {
      title: '',
      summary: '',
      start_date: defaults.start_date,
      start_time: defaults.start_time,
      end_date: defaults.end_date,
      end_time: defaults.end_time,
      event_location: '',
      event_link: ''
    }
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  


  useEffect(() => {
    loadEvents()
  }, [spaceStore.currentSpaceId])

  const loadEvents = async () => {
    try {
      // Only load events if we have a current space
      if (!spaceStore.currentSpaceId) {
        setEvents([])
        setIsLoading(false)
        return
      }

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
      console.error('Failed to load events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim()) {
      setCreateError('Event title is required')
      return
    }

    if (!newEvent.start_date || !newEvent.start_time) {
      setCreateError('Start date and time are required')
      return
    }

    // Combine date and time for event_start
    const eventStart = `${newEvent.start_date}T${newEvent.start_time}`
    let eventEnd = null
    
    // Combine date and time for event_end if provided
    if (newEvent.end_date && newEvent.end_time) {
      eventEnd = `${newEvent.end_date}T${newEvent.end_time}`
    }

    setIsCreating(true)
    setCreateError(null)

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setCreateError('You must be logged in to create an event')
        return
      }

      if (!spaceStore.currentSpace?.id) {
        setCreateError('No space selected')
        return
      }

      const eventEntity = await entityService.createEntity({
        space_id: spaceStore.currentSpace.id,
        type: 'event',
        title: newEvent.title.trim(),
        summary: newEvent.summary.trim() || null,
        content: {
          event_start: eventStart,
          event_end: eventEnd,
          event_location: newEvent.event_location.trim() || null,
          event_link: newEvent.event_link.trim() || null
        },
        created_by: user.id
      })

      if (!eventEntity) {
        setCreateError('Failed to create event. Please try again.')
        return
      }

      // Reset form and close dialog
      const defaults = getDefaultDateTime()
      setNewEvent({
        title: '',
        summary: '',
        start_date: defaults.start_date,
        start_time: defaults.start_time,
        end_date: defaults.end_date,
        end_time: defaults.end_time,
        event_location: '',
        event_link: ''
      })
      setIsCreateDialogOpen(false)
      
      // Reload events to show the new event
      await loadEvents()
      
    } catch (error) {
      console.error('Failed to create event:', error)
      setCreateError('Failed to create event. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const getUpcomingEvents = () => {
    const now = new Date()
    return events.filter(event => new Date(event.parsedContent?.event_start || event.created_at) >= now)
  }

  if (isLoading) {
    return (
      <div className="w-96 border-r bg-card p-4">
        <div className="flex items-center justify-center h-32">
          <div className="text-sm text-muted-foreground">Loading events...</div>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="w-96 min-w-[300px] border-r bg-card flex flex-col">
        <EmptyState
          isCreateDialogOpen={isCreateDialogOpen}
          setIsCreateDialogOpen={setIsCreateDialogOpen}
          newEvent={newEvent}
          setNewEvent={setNewEvent}
          handleCreateEvent={handleCreateEvent}
          isCreating={isCreating}
          createError={createError}
          setCreateError={setCreateError}
        />
      </div>
    )
  }

  return (
    <div className="w-96 min-w-[300px] border-r bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Events</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => setCreateError(null)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
                <DialogDescription>
                  Add a new event to your calendar.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {createError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                    {createError}
                  </div>
                )}
                <div>
                  <Label htmlFor="event-title">Event Title</Label>
                  <Input
                    id="event-title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter event title..."
                    className="mt-1"
                  />
                </div>
                                 <div>
                   <Label htmlFor="event-summary">Description (Optional)</Label>
                  <Textarea
                    id="event-summary"
                    value={newEvent.summary}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, summary: e.target.value }))}
                    placeholder="Enter event description..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Start Date & Time</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <Label htmlFor="start-date-main" className="text-xs text-muted-foreground">Date</Label>
                                                 <Input
                           id="start-date-main"
                           type="date"
                           value={newEvent.start_date}
                           onChange={(e) => setNewEvent(prev => ({ 
                             ...prev, 
                             start_date: e.target.value,
                             end_date: prev.end_date || e.target.value
                           }))}
                           className="mt-1"
                         />
                      </div>
                      <div>
                        <Label htmlFor="start-time-main" className="text-xs text-muted-foreground">Time</Label>
                                                 <Input
                           id="start-time-main"
                           type="time"
                           value={newEvent.start_time}
                           onChange={(e) => {
                             const startTime = e.target.value
                             const [hours, minutes] = startTime.split(':').map(Number)
                             const endHour = (hours + 1) % 24
                             const endTime = `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
                             
                             setNewEvent(prev => ({ 
                               ...prev, 
                               start_time: startTime,
                               end_time: prev.end_time || endTime
                             }))
                           }}
                           className="mt-1"
                         />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">End Date & Time (Optional)</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <Label htmlFor="end-date-main" className="text-xs text-muted-foreground">Date</Label>
                        <Input
                          id="end-date-main"
                          type="date"
                          value={newEvent.end_date}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, end_date: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="end-time-main" className="text-xs text-muted-foreground">Time</Label>
                        <Input
                          id="end-time-main"
                          type="time"
                          value={newEvent.end_time}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, end_time: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="event-location">Location (Optional)</Label>
                  <Input
                    id="event-location"
                    value={newEvent.event_location}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, event_location: e.target.value }))}
                    placeholder="Enter location..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="event-link">Link</Label>
                  <Input
                    id="event-link"
                    type="url"
                    value={newEvent.event_link}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, event_link: e.target.value }))}
                    placeholder="https://..."
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateEvent}
                    disabled={isCreating || !newEvent.title || !newEvent.start_date || !newEvent.start_time}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isCreating ? 'Creating...' : 'Create Event'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>


      </div>

      {/* Agenda Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <div className="mb-4 px-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Upcoming Events ({getUpcomingEvents().length})
            </h3>
          </div>
          {getUpcomingEvents().map((event) => (
            <div
              key={event.id}
              onClick={() => onEventSelect(event)}
              className={cn(
                "p-3 rounded-lg cursor-pointer transition-colors mb-2 border",
                selectedEvent?.id === event.id
                  ? "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800"
                  : "hover:bg-accent border-transparent"
              )}
            >
              <div className="font-medium text-sm mb-1">{event.title}</div>
              <div className="text-xs text-purple-600 font-medium mb-1">
                {formatEventTime(event.parsedContent?.event_start || event.created_at)}
              </div>
              {event.parsedContent?.event_location && (
                <div className="text-xs text-muted-foreground">
                  📍 {event.parsedContent.event_location}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const EventsSidebar = observer(EventsSidebarComponent) 