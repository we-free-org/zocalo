'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Plus, Hash, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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

interface Channel {
  id: string
  name: string
  description?: string
  is_private: boolean
  created_at: string
}

interface ChannelsSidebarProps {
  selectedChannel: Channel | null
  onChannelSelect: (channel: Channel | null) => void
}

// Empty state component defined outside to prevent recreation
const EmptyState = ({ 
  isCreateDialogOpen, 
  setIsCreateDialogOpen,
  newChannel,
  setNewChannel,
  handleCreateChannel,
  isCreating,
  createError,
  setCreateError
}: {
  isCreateDialogOpen: boolean
  setIsCreateDialogOpen: (open: boolean) => void
  newChannel: { name: string; description: string; is_private: boolean }
  setNewChannel: React.Dispatch<React.SetStateAction<{ name: string; description: string; is_private: boolean }>>
  handleCreateChannel: () => Promise<void>
  isCreating: boolean
  createError: string | null
  setCreateError: (error: string | null) => void
}) => (
  <div className="flex flex-col items-center justify-center h-64 text-center px-4">
    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
      <Hash className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">
      No channels yet
    </h3>
    <p className="text-sm text-muted-foreground mb-4 max-w-[200px]">
      Create your first channel to start organizing conversations
    </p>
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-500 hover:bg-green-700 text-white rounded-full px-6">
          <Plus className="w-4 h-4 mr-2" />
          Create Channel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
          <DialogDescription>
            Create a new channel to organize conversations and collaborate with your team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {createError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {createError}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="channel-name">Channel name</Label>
            <Input
              id="channel-name"
              value={newChannel.name}
              onChange={(e) => {
                setNewChannel(prev => ({ ...prev, name: e.target.value }))
                setCreateError(null)
              }}
              placeholder="e.g. general, random, development"
              disabled={isCreating}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="channel-description">Description (optional)</Label>
            <Textarea
              id="channel-description"
              value={newChannel.description}
              onChange={(e) => setNewChannel(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What's this channel about?"
              className="resize-none"
              rows={3}
              disabled={isCreating}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="private-channel"
              checked={newChannel.is_private}
              onCheckedChange={(checked) => 
                setNewChannel(prev => ({ ...prev, is_private: checked as boolean }))
              }
              disabled={isCreating}
            />
            <Label htmlFor="private-channel" className="text-sm">
              Make this channel private
            </Label>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateDialogOpen(false)
                setCreateError(null)
                setNewChannel({ name: '', description: '', is_private: false })
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateChannel}
              disabled={!newChannel.name.trim() || isCreating}
              className="bg-green-500 hover:bg-green-700"
            >
              {isCreating ? 'Creating...' : 'Create Channel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
)

function ChannelsSidebarComponent({ selectedChannel, onChannelSelect }: ChannelsSidebarProps) {
  const spaceStore = useSpaceStore()
  const [channels, setChannels] = useState<Channel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newChannel, setNewChannel] = useState({
    name: '',
    description: '',
    is_private: false
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    loadChannels()
  }, [spaceStore.currentSpaceId])

  const loadChannels = async () => {
    try {
      // Only load channels if we have a current space
      if (!spaceStore.currentSpaceId) {
        setChannels([])
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('channels')
        .select('id, name, description, is_private, created_at')
        .eq('space_id', spaceStore.currentSpaceId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Failed to load channels:', error)
      } else {
        setChannels(data || [])
      }
    } catch (error) {
      console.error('Failed to load channels:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateChannel = async () => {
    if (!newChannel.name.trim()) {
      setCreateError('Channel name is required')
      return
    }

    setIsCreating(true)
    setCreateError(null)

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setCreateError('You must be logged in to create a channel')
        return
      }

      // Get current space from SpaceStore
      if (!spaceStore.currentSpace) {
        setCreateError('No space selected. Please select a space first.')
        return
      }

      const currentSpaceId = spaceStore.currentSpace.id

      // Check if channel name already exists in this space
      const { data: existingChannel } = await supabase
        .from('channels')
        .select('id')
        .eq('space_id', currentSpaceId)
        .eq('name', newChannel.name.trim())
        .single()

      if (existingChannel) {
        setCreateError('A channel with this name already exists')
        return
      }

      // Create the channel
      const { data, error } = await supabase
        .from('channels')
        .insert({
          name: newChannel.name.trim(),
          description: newChannel.description.trim() || null,
          is_private: newChannel.is_private,
          space_id: currentSpaceId,
          created_by: user.id
        })
        .select('id, name, description, is_private, created_at')
        .single()

      if (error) {
        console.error('Database error creating channel:', error)
        setCreateError(`Failed to create channel: ${error.message}`)
        return
      }

      // Success! Refresh channels list
      await loadChannels()
      
      // Reset form and close dialog
      setNewChannel({ name: '', description: '', is_private: false })
      setCreateError(null)
      setIsCreateDialogOpen(false)
      
      // Select the newly created channel
      if (data) {
        onChannelSelect(data)
      }

      console.log('Channel created successfully:', data)
    } catch (error) {
      console.error('Unexpected error creating channel:', error)
      setCreateError('An unexpected error occurred. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }


  return (
    <div className="w-64 bg-card border-r flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Channels</h2>
          {channels.length > 0 && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  className="bg-green-500 hover:bg-green-700 text-white rounded-full h-8 w-8 p-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Channel</DialogTitle>
                  <DialogDescription>
                    Create a new channel to organize conversations and collaborate with your team.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  {createError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                      {createError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="channel-name">Channel name</Label>
                    <Input
                      id="channel-name"
                      value={newChannel.name}
                      onChange={(e) => {
                        setNewChannel(prev => ({ ...prev, name: e.target.value }))
                        setCreateError(null)
                      }}
                      placeholder="e.g. general, random, development"
                      disabled={isCreating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="channel-description">Description (optional)</Label>
                    <Textarea
                      id="channel-description"
                      value={newChannel.description}
                      onChange={(e) => setNewChannel(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="What's this channel about?"
                      className="resize-none"
                      rows={3}
                      disabled={isCreating}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="private-channel"
                      checked={newChannel.is_private}
                      onCheckedChange={(checked) => 
                        setNewChannel(prev => ({ ...prev, is_private: checked as boolean }))
                      }
                      disabled={isCreating}
                    />
                    <Label htmlFor="private-channel" className="text-sm">
                      Make this channel private
                    </Label>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsCreateDialogOpen(false)
                        setCreateError(null)
                        setNewChannel({ name: '', description: '', is_private: false })
                      }}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateChannel}
                      disabled={!newChannel.name.trim() || isCreating}
                      className="bg-green-500 hover:bg-green-700"
                    >
                      {isCreating ? 'Creating...' : 'Create Channel'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">Loading channels...</div>
          </div>
        ) : channels.length === 0 ? (
          <EmptyState 
            isCreateDialogOpen={isCreateDialogOpen}
            setIsCreateDialogOpen={setIsCreateDialogOpen}
            newChannel={newChannel}
            setNewChannel={setNewChannel}
            handleCreateChannel={handleCreateChannel}
            isCreating={isCreating}
            createError={createError}
            setCreateError={setCreateError}
          />
        ) : (
          <div className="p-2">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel)}
                className={cn(
                  'w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors hover:bg-accent',
                                     selectedChannel?.id === channel.id && 'bg-green-500/10 text-green-500'
                )}
              >
                {channel.is_private ? (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Hash className="w-4 h-4 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{channel.name}</div>
                  {channel.description && (
                    <div className="text-xs text-muted-foreground truncate">
                      {channel.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export const ChannelsSidebar = observer(ChannelsSidebarComponent) 