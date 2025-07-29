'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Link as LinkIcon, 
  Clock, 
  Edit, 
  Trash2, 
  X, 
  MessageCircle, 
  Send, 
  Save, 
  XCircle 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase/client'
import { useSpaceStore, useUserStore } from '@/stores'
import { Event } from './types'
import { entityService } from '@/lib/entities'
import { Comments } from '@/components/comments'

interface EventDetailsProps {
  event: Event | null
  onEventUpdate?: (event: Event | null) => void
}

export function EventDetails({ event, onEventUpdate }: EventDetailsProps) {
  const spaceStore = useSpaceStore()
  const userStore = useUserStore()

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    summary: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    event_location: '',
    event_link: ''
  })

  // Initialize edit form when event changes
  useEffect(() => {
    if (event && isEditing) {
      const startDate = new Date(event.parsedContent?.event_start || event.created_at)
      const endDate = event.parsedContent?.event_end ? new Date(event.parsedContent.event_end) : startDate
      
      setEditForm({
        title: event.title || '',
        summary: event.summary || '',
        start_date: startDate.toISOString().split('T')[0],
        start_time: startDate.toTimeString().slice(0, 5),
        end_date: endDate.toISOString().split('T')[0],
        end_time: endDate.toTimeString().slice(0, 5),
        event_location: event.parsedContent?.event_location || '',
        event_link: event.parsedContent?.event_link || ''
      })
    }
  }, [event, isEditing])





  const handleEditEvent = async () => {
    if (!event?.id || !userStore.user?.id) return

    try {
      // Combine date and time
      const startDateTime = new Date(`${editForm.start_date}T${editForm.start_time}`)
      const endDateTime = editForm.end_date && editForm.end_time 
        ? new Date(`${editForm.end_date}T${editForm.end_time}`)
        : null

      const { error } = await supabase
        .from('entities')
        .update({
          title: editForm.title.trim(),
          summary: editForm.summary.trim() || null,
          event_start: startDateTime.toISOString(),
          event_end: endDateTime?.toISOString() || null,
          event_location: editForm.event_location.trim() || null,
          event_link: editForm.event_link.trim() || null,
          is_edited: true,
          edited_at: new Date().toISOString(),
          edited_by: userStore.user.id
        })
        .eq('id', event.id)

      if (error) {
        console.error('Failed to update event:', error)
      } else {
        setIsEditing(false)
        // Refresh the events list
        window.location.reload()
      }
    } catch (error) {
      console.error('Exception updating event:', error)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditForm({
      title: '',
      summary: '',
      start_date: '',
      start_time: '',
      end_date: '',
      end_time: '',
      event_location: '',
      event_link: ''
    })
  }

  const handleDeleteEvent = async () => {
    if (!event?.id || !userStore.user?.id) return
    
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        const { error } = await supabase
          .from('entities')
          .update({ 
            status: 'deleted',
            deleted_by: userStore.user.id,
            deleted_at: new Date().toISOString()
          })
          .eq('id', event.id)

        if (error) {
          console.error('Failed to delete event:', error)
        } else {
          onEventUpdate?.(null) // Close the panel
          // Reload events to update the calendar
          window.location.reload()
        }
      } catch (error) {
        console.error('Exception deleting event:', error)
      }
    }
  }

  // Helper functions
  const formatEventDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffMs = endDate.getTime() - startDate.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`
    }
    return `${diffMinutes}m`
  }

  const isEventToday = (dateString: string) => {
    const eventDate = new Date(dateString)
    const today = new Date()
    return eventDate.toDateString() === today.toDateString()
  }

  const isEventUpcoming = (dateString: string) => {
    const eventDate = new Date(dateString)
    const today = new Date()
    return eventDate.toDateString() === today.toDateString()
  }

  if (!event) return null

  return (
    <div className="absolute top-4 right-4 w-96 bg-card border rounded-lg shadow-lg z-10 min-h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <CalendarIcon className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-600">
                {spaceStore.currentSpaceName} Event
              </span>
              {isEventToday(event.parsedContent?.event_start || event.created_at) && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                  Today
                </span>
              )}
              {isEventUpcoming(event.parsedContent?.event_start || event.created_at) && !isEventToday(event.parsedContent?.event_start || event.created_at) && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  Upcoming
                </span>
              )}
            </div>
            <h1 className="text-lg font-bold text-foreground mb-1">
              {event.title}
            </h1>
            {event.summary && (
              <p className="text-sm text-muted-foreground">
                {event.summary}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEventUpdate?.(null)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Event Details */}
      <div className="flex-1 overflow-y-auto p-4">
        {isEditing ? (
          /* Edit Form */
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title" className="text-sm font-medium">Event Title *</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter event title"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-summary" className="text-sm font-medium">Summary</Label>
              <Textarea
                id="edit-summary"
                value={editForm.summary}
                onChange={(e) => setEditForm(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Brief description of the event"
                className="mt-1 min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-start-date" className="text-sm font-medium">Start Date *</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editForm.start_date}
                  onChange={(e) => setEditForm(prev => ({ 
                    ...prev, 
                    start_date: e.target.value,
                    end_date: prev.end_date || e.target.value
                  }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-start-time" className="text-sm font-medium">Start Time *</Label>
                <Input
                  id="edit-start-time"
                  type="time"
                  value={editForm.start_time}
                  onChange={(e) => setEditForm(prev => ({ 
                    ...prev, 
                    start_time: e.target.value,
                    end_time: prev.end_time || (() => {
                      const [hours, minutes] = e.target.value.split(':')
                      const newHour = (parseInt(hours) + 1) % 24
                      return `${newHour.toString().padStart(2, '0')}:${minutes}`
                    })()
                  }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-end-date" className="text-sm font-medium">End Date</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={editForm.end_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, end_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-end-time" className="text-sm font-medium">End Time</Label>
                <Input
                  id="edit-end-time"
                  type="time"
                  value={editForm.end_time}
                  onChange={(e) => setEditForm(prev => ({ ...prev, end_time: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-location" className="text-sm font-medium">Location</Label>
              <Input
                id="edit-location"
                value={editForm.event_location}
                onChange={(e) => setEditForm(prev => ({ ...prev, event_location: e.target.value }))}
                placeholder="Event location"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-link" className="text-sm font-medium">Link</Label>
              <Input
                id="edit-link"
                type="url"
                value={editForm.event_link}
                onChange={(e) => setEditForm(prev => ({ ...prev, event_link: e.target.value }))}
                placeholder="https://..."
                className="mt-1"
              />
            </div>

            {/* Edit Actions */}
            <div className="flex space-x-2 pt-4 border-t">
              <Button
                onClick={handleEditEvent}
                disabled={!editForm.title || !editForm.start_date || !editForm.start_time}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Save className="h-3 w-3 mr-1" />
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                className="flex-1"
              >
                <XCircle className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-4">
            {/* Date and Time */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
              <div className="flex items-start space-x-3">
                <Clock className="h-4 w-4 text-purple-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-foreground mb-1 text-sm">Date & Time</h3>
                  <div className="space-y-1">
                    <div className="text-xs text-foreground">
                      <span className="font-medium">Starts:</span> {formatEventDateTime(event.parsedContent?.event_start || event.created_at)}
                    </div>
                    {event.parsedContent?.event_end && (
                      <div className="text-xs text-foreground">
                        <span className="font-medium">Ends:</span> {formatEventDateTime(event.parsedContent.event_end)}
                      </div>
                    )}
                    {event.parsedContent?.event_end && (
                      <div className="text-xs text-purple-600 font-medium">
                        Duration: {calculateDuration(event.parsedContent?.event_start || event.created_at, event.parsedContent.event_end)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Location */}
            {event.event_location && (
              <div className="bg-card rounded-lg p-3 border">
                <div className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-purple-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-foreground mb-1 text-sm">Location</h3>
                    <p className="text-xs text-foreground">{event.event_location}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Link */}
            {event.event_link && (
              <div className="bg-card rounded-lg p-3 border">
                <div className="flex items-start space-x-3">
                  <LinkIcon className="h-4 w-4 text-purple-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-foreground mb-1 text-sm">Link</h3>
                    <a 
                      href={event.event_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-600 hover:text-purple-700 underline break-all"
                    >
                      {event.event_link}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Comments Section */}
            <Comments parentId={event.id} parentType="event" className="bg-card rounded-lg border" />

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex-1 hover:bg-purple-50 hover:border-purple-300"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteEvent}
                className="flex-1 hover:text-red-600 hover:border-red-300"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 