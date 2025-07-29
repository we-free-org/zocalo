'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Plus, Vote as VoteIcon, Search, Calendar, CheckSquare, MoreVertical, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useSpaceStore, useUserStore } from '@/stores'
import { cn } from '@/lib/utils'
import { Vote, VoteTreeItem } from './types'
import { entityService, VoteEntityData } from '@/lib/entities'

interface VotesSidebarProps {
  selectedVote: Vote | null
  onVoteSelect: (vote: Vote | null) => void
}

// Empty State Component
function EmptyState({ onCreateVote }: {
  onCreateVote: () => void
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="rounded-full bg-blue-100 p-4 mb-4">
        <VoteIcon className="h-8 w-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No votes yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Get started by creating your first vote to gather opinions and make decisions together.
      </p>
      <div className="flex flex-col space-y-2 w-full max-w-xs">
        <Button onClick={onCreateVote} className="bg-blue-600 hover:bg-blue-700 text-white">
          <VoteIcon className="h-4 w-4 mr-2" />
          Create Vote
        </Button>
      </div>
    </div>
  )
}

// Vote List Component
function VoteList({ 
  votes, 
  selectedVote, 
  onVoteSelect, 
  onVoteAction,
  searchTerm 
}: {
  votes: Vote[]
  selectedVote: Vote | null
  onVoteSelect: (vote: Vote | null) => void
  onVoteAction: (action: string, vote: Vote) => void
  searchTerm: string
}) {
  // Filter votes based on search term
  const filteredVotes = votes.filter(vote =>
    vote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vote.summary?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort by created date (newest first) and separate by status
  const now = new Date()
  const upcomingVotes = filteredVotes.filter(vote => 
    !vote.parsedContent?.vote_deadline || new Date(vote.parsedContent.vote_deadline) > now
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  
  const pastVotes = filteredVotes.filter(vote => 
    vote.parsedContent?.vote_deadline && new Date(vote.parsedContent.vote_deadline) <= now
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const getVoteStatus = (vote: Vote) => {
    if (!vote.parsedContent?.vote_deadline) return 'ongoing'
    return new Date(vote.parsedContent.vote_deadline) > now ? 'upcoming' : 'ended'
  }

  const formatDeadline = (deadline?: string) => {
    if (!deadline) return 'No deadline'
    const date = new Date(deadline)
    const isToday = date.toDateString() === now.toDateString()
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString()
    
    if (isToday) return 'Today'
    if (isTomorrow) return 'Tomorrow'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const renderVoteItem = (vote: Vote) => {
    const status = getVoteStatus(vote)
    
    return (
      <div
        key={vote.id}
        className={cn(
          "flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer",
          selectedVote?.id === vote.id && "bg-blue-50 border border-blue-200"
        )}
        onClick={() => onVoteSelect(vote)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <VoteIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="font-medium text-foreground text-sm truncate">{vote.title}</span>
            <div className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              status === 'upcoming' && "bg-green-100 text-green-700",
              status === 'ongoing' && "bg-blue-100 text-blue-700", 
              status === 'ended' && "bg-gray-100 text-gray-700"
            )}>
              {status === 'upcoming' ? 'Active' : status === 'ongoing' ? 'Active' : 'Ended'}
            </div>
          </div>
          
          {vote.summary && (
            <p className="text-xs text-muted-foreground truncate mb-1">{vote.summary}</p>
          )}
          
          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            <span className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDeadline(vote.parsedContent?.vote_deadline)}</span>
            </span>
            <span className="flex items-center space-x-1">
              <CheckSquare className="h-3 w-3" />
              <span>{vote.parsedContent?.vote_options?.length || 0} options</span>
            </span>
          </div>
        </div>
        
        {/* Three dots menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onVoteAction('edit', vote)}>
              <Edit className="h-3 w-3 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onVoteAction('delete', vote)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {upcomingVotes.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Active Votes</h3>
          <div className="space-y-1">
            {upcomingVotes.map(renderVoteItem)}
          </div>
        </div>
      )}
      
      {pastVotes.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Past Votes</h3>
          <div className="space-y-1">
            {pastVotes.map(renderVoteItem)}
          </div>
        </div>
      )}
      
      {filteredVotes.length === 0 && searchTerm && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No votes found for &quot;{searchTerm}&quot;</p>
        </div>
      )}
    </div>
  )
}

export const VotesSidebar = observer(({ selectedVote, onVoteSelect }: VotesSidebarProps) => {
  const spaceStore = useSpaceStore()
  const userStore = useUserStore()
  const [votes, setVotes] = useState<Vote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [newVote, setNewVote] = useState({
    title: '',
    summary: '',
    vote_options: ['', ''],
    vote_deadline: '',
    vote_anonymous: false,
    max_votes_per_user: 1,
    vote_multiple_choice: false,
    vote_scoring_enabled: false,
    vote_result_visibility: 'always_visible' as const,
    allow_multiple_votes_per_option: false
  })

  // Load votes
  useEffect(() => {
    const loadVotes = async () => {
      if (!spaceStore.currentSpaceId) {
        setVotes([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const voteEntities = await entityService.queryEntitiesWithContent<VoteEntityData>({
          space_id: spaceStore.currentSpaceId,
          type: 'vote',
          status: 'approved',
          order_by: 'created_at',
          order_direction: 'desc'
        })

        setVotes(voteEntities as Vote[])
      } catch (error) {
        console.error('Exception loading votes:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadVotes()
  }, [spaceStore.currentSpaceId])

  const handleCreateVote = async () => {
    if (!newVote.title.trim() || !userStore.user?.id) return
    
    // Filter out empty options
    const filteredOptions = newVote.vote_options.filter(option => option.trim())
    if (filteredOptions.length < 2) {
      alert('Please provide at least 2 vote options')
      return
    }

    try {
      const voteEntity = await entityService.createEntity({
        space_id: spaceStore.currentSpaceId!,
        type: 'vote',
        title: newVote.title.trim(),
        summary: newVote.summary.trim() || null,
        content: {
          vote_options: filteredOptions,
          vote_deadline: newVote.vote_deadline || undefined,
          vote_anonymous: newVote.vote_anonymous,
          vote_multiple_choice: newVote.vote_multiple_choice,
          max_votes_per_user: newVote.max_votes_per_user,
          vote_scoring_enabled: newVote.vote_scoring_enabled,
          vote_result_visibility: newVote.vote_result_visibility,
          allow_multiple_votes_per_option: newVote.allow_multiple_votes_per_option
        },
        created_by: userStore.user.id
      })

      if (voteEntity) {
        // Get the entity with parsed content
        const entityWithContent = await entityService.getEntityWithContent(voteEntity.id)
        if (entityWithContent) {
          setVotes(prev => [entityWithContent as Vote, ...prev])
        }
        setNewVote({
          title: '',
          summary: '',
          vote_options: ['', ''],
          vote_deadline: '',
          vote_anonymous: false,
          max_votes_per_user: 1,
          vote_multiple_choice: false,
          vote_scoring_enabled: false,
          vote_result_visibility: 'always_visible',
          allow_multiple_votes_per_option: false
        })
        setIsCreateDialogOpen(false)
      }
    } catch (error) {
      console.error('Exception creating vote:', error)
    }
  }

  const handleVoteAction = (action: string, vote: Vote) => {
    switch (action) {
      case 'edit':
        // TODO: Implement edit functionality
        console.log('Edit vote:', vote.id)
        break
      case 'delete':
        handleDeleteVote(vote)
        break
    }
  }

  const handleDeleteVote = async (vote: Vote) => {
    if (!userStore.user?.id) return
    
    if (confirm('Are you sure you want to delete this vote?')) {
      try {
        const success = await entityService.deleteEntity(vote.id, userStore.user.id)
        
        if (success) {
          setVotes(prev => prev.filter(v => v.id !== vote.id))
          if (selectedVote?.id === vote.id) {
            onVoteSelect(null)
          }
        }
      } catch (error) {
        console.error('Exception deleting vote:', error)
      }
    }
  }

  const addVoteOption = () => {
    setNewVote(prev => ({
      ...prev,
      vote_options: [...prev.vote_options, '']
    }))
  }

  const removeVoteOption = (index: number) => {
    if (newVote.vote_options.length > 2) {
      setNewVote(prev => ({
        ...prev,
        vote_options: prev.vote_options.filter((_, i) => i !== index)
      }))
    }
  }

  const updateVoteOption = (index: number, value: string) => {
    setNewVote(prev => ({
      ...prev,
      vote_options: prev.vote_options.map((option, i) => i === index ? value : option)
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">Loading votes...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-foreground">Votes</h1>
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search votes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {votes.length === 0 ? (
          <EmptyState onCreateVote={() => setIsCreateDialogOpen(true)} />
        ) : (
          <div className="p-4">
            <VoteList
              votes={votes}
              selectedVote={selectedVote}
              onVoteSelect={onVoteSelect}
              onVoteAction={handleVoteAction}
              searchTerm={searchTerm}
            />
          </div>
        )}
      </div>

      {/* Create Vote Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Vote</DialogTitle>
            <DialogDescription>
              Create a new vote to gather opinions and make decisions together.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Info */}
                         <div className="space-y-6">
               <div>
                 <Label htmlFor="title">Title *</Label>
                 <Input
                   id="title"
                   value={newVote.title}
                   onChange={(e) => setNewVote(prev => ({ ...prev, title: e.target.value }))}
                   placeholder="What are you voting on?"
                   className="mt-2"
                 />
               </div>
               <div>
                 <Label htmlFor="summary">Description (optional)</Label>
                 <Textarea
                   id="summary"
                   value={newVote.summary}
                   onChange={(e) => setNewVote(prev => ({ ...prev, summary: e.target.value }))}
                   placeholder="Provide more context about this vote"
                   rows={3}
                   className="mt-2"
                 />
               </div>
             </div>

            {/* Vote Options */}
                         <div>
               <Label>Vote Options *</Label>
               <div className="space-y-2 mt-3">
                {newVote.vote_options.map((option, index) => (
                  <div key={index} className="flex space-x-2">
                    <Input
                      value={option}
                      onChange={(e) => updateVoteOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                    {newVote.vote_options.length > 2 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeVoteOption(index)}
                        className="px-3"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addVoteOption}
                  className="w-full"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Option
                </Button>
              </div>
            </div>

            {/* Vote Settings */}
                         <div className="space-y-6">
               <div>
                 <Label htmlFor="deadline">Deadline (optional)</Label>
                 <Input
                   id="deadline"
                   type="datetime-local"
                   value={newVote.vote_deadline}
                   onChange={(e) => setNewVote(prev => ({ ...prev, vote_deadline: e.target.value }))}
                   className="mt-2"
                 />
               </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="anonymous"
                  checked={newVote.vote_anonymous}
                  onCheckedChange={(checked) => setNewVote(prev => ({ ...prev, vote_anonymous: checked }))}
                />
                <Label htmlFor="anonymous">Anonymous voting</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="multiple-choice"
                  checked={newVote.vote_multiple_choice}
                  onCheckedChange={(checked) => setNewVote(prev => ({ ...prev, vote_multiple_choice: checked }))}
                />
                <Label htmlFor="multiple-choice">Allow multiple choices</Label>
              </div>

                             <div>
                 <Label htmlFor="max-votes">Max votes per user</Label>
                 <Input
                   id="max-votes"
                   type="number"
                   min="1"
                   value={newVote.max_votes_per_user}
                   onChange={(e) => setNewVote(prev => ({ ...prev, max_votes_per_user: parseInt(e.target.value) || 1 }))}
                   className="mt-2"
                 />
               </div>

               <div>
                 <Label>Result visibility</Label>
                 <RadioGroup 
                   value={newVote.vote_result_visibility} 
                   onValueChange={(value: any) => setNewVote(prev => ({ ...prev, vote_result_visibility: value }))}
                   className="mt-3"
                 >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="always_visible" id="always" />
                    <Label htmlFor="always">Always visible</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="after_deadline" id="after" />
                    <Label htmlFor="after">After deadline</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="never" id="never" />
                    <Label htmlFor="never">Never visible</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateVote}
                disabled={!newVote.title.trim() || newVote.vote_options.filter(o => o.trim()).length < 2}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create Vote
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}) 