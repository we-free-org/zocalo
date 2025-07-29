'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { 
  Vote as VoteIcon, 
  Calendar, 
  Users,
  CheckSquare,
  Clock,
  Trash2,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSpaceStore, useUserStore } from '@/stores'
import { Vote } from './types'
import { Comments } from '@/components/comments'
import { entityService } from '@/lib/entities'

interface VoteContentProps {
  vote: Vote | null
  onVoteUpdate?: (vote: Vote | null) => void
}

// Vote Details Component
function VoteDetails({ vote }: { vote: Vote }) {
  const userStore = useUserStore()
  const spaceStore = useSpaceStore()
  const [selectedOptions, setSelectedOptions] = useState<number[]>([])
  const [userVotes, setUserVotes] = useState<unknown[]>([])
  const [voteResults, setVoteResults] = useState<{ [key: number]: number }>({})
  const [isVoting, setIsVoting] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)

  const now = new Date()
  const deadline = vote.parsedContent?.vote_deadline ? new Date(vote.parsedContent.vote_deadline) : null
  const isExpired = deadline ? deadline < now : false

  // Load existing vote submissions and results
  useEffect(() => {
    const loadVoteData = async () => {
      if (!vote?.id) return

      try {
        // Load all vote submissions for this vote
        const voteSubmissions = await entityService.queryEntitiesWithContent({
          type: 'vote_submission',
          parent_id: vote.id,
          status: 'approved'
        })

        // Calculate results
        const results: { [key: number]: number } = {}
        vote.parsedContent.vote_options.forEach((_, index) => {
          results[index] = 0
        })

        let userHasVoted = false
        const userSubmissions: unknown[] = []

        voteSubmissions.forEach((submission: unknown) => {
          const content = (submission as Record<string, unknown>).parsedContent
          if ((content as Record<string, unknown>).choice_index !== undefined) {
            const choiceIndex = (content as Record<string, unknown>).choice_index as number
            results[choiceIndex] = (results[choiceIndex] || 0) + 1
          }

          // Check if current user has voted
          if (userStore.user?.id) {
            if (vote.parsedContent.vote_anonymous) {
              // For anonymous votes, check hashed user ID
              const userHash = generateUserIdHash(userStore.user.id, vote.id)
              if ((content as Record<string, unknown>).user_id_hash === userHash) {
                userHasVoted = true
                userSubmissions.push(submission)
              }
            } else {
              // For non-anonymous votes, check created_by
              if ((submission as Record<string, unknown>).created_by === userStore.user.id) {
                userHasVoted = true
                userSubmissions.push(submission)
              }
            }
          }
        })

        setVoteResults(results)
        setHasVoted(userHasVoted)
        setUserVotes(userSubmissions)

        // Set selected options based on user's previous votes
        if (userHasVoted) {
          const userChoices = userSubmissions.map(s => ((s as Record<string, unknown>).parsedContent as Record<string, unknown>).choice_index as number).filter(c => c !== undefined)
          setSelectedOptions(userChoices)
        }
      } catch (error) {
        console.error('Failed to load vote data:', error)
      }
    }

    loadVoteData()
  }, [vote?.id, userStore.user?.id])

  // Generate consistent hash for anonymous voting
  const generateUserIdHash = (userId: string, voteId: string): string => {
    // Simple hash function - in production, use a proper cryptographic hash
    const combined = userId + voteId
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  const handleOptionToggle = (optionIndex: number) => {
    if (hasVoted || isExpired) return

    setSelectedOptions(prev => {
      if (vote.parsedContent.vote_multiple_choice) {
        // Multiple choice - toggle selection
        if (prev.includes(optionIndex)) {
          return prev.filter(i => i !== optionIndex)
        } else {
          // Check max votes limit
          const maxVotes = vote.parsedContent.max_votes_per_user || 1
          if (prev.length >= maxVotes) {
            return prev // Don't add if at limit
          }
          return [...prev, optionIndex]
        }
      } else {
        // Single choice - replace selection
        return [optionIndex]
      }
    })
  }

  const handleCastVote = async () => {
    if (!userStore.user?.id || !spaceStore.currentSpaceId || selectedOptions.length === 0) return

    setIsVoting(true)
    try {
      // Create vote submissions for each selected option
      const submissions = await Promise.all(
        selectedOptions.map(async (choiceIndex) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const submissionData: any = {
            vote_id: vote.id,
            choice_index: choiceIndex,
            timestamp: new Date().toISOString()
          }

          // Add user hash for anonymous votes
          if (vote.parsedContent.vote_anonymous) {
            submissionData.user_id_hash = generateUserIdHash(userStore.user!.id, vote.id)
          }

          const entityData = {
            space_id: spaceStore.currentSpaceId!,
            type: 'vote_submission',
            parent_id: vote.id,
            parent_type: 'vote',
            title: `Vote submission for option ${choiceIndex + 1}`,
            content: submissionData,
            // Use null for anonymous votes, real user ID for non-anonymous
            created_by: vote.parsedContent.vote_anonymous 
              ? null 
              : userStore.user!.id
          }

          return entityService.createEntity(entityData)
        })
      )

      if (submissions.every(s => s !== null)) {
        // Reload vote data to show updated results
        window.location.reload() // Simple reload for now
      }
    } catch (error) {
      console.error('Failed to cast vote:', error)
    } finally {
      setIsVoting(false)
    }
  }

  const formatDeadline = (deadlineStr: string) => {
    const date = new Date(deadlineStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const timeRemaining = deadline ? deadline.getTime() - now.getTime() : null
  const formatTimeRemaining = (ms: number) => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} remaining`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} remaining`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} remaining`
    return 'Less than a minute remaining'
  }

  const getTotalVotes = () => {
    return Object.values(voteResults).reduce((sum, count) => sum + count, 0)
  }

  const getVotePercentage = (optionIndex: number) => {
    const total = getTotalVotes()
    if (total === 0) return 0
    return Math.round((voteResults[optionIndex] || 0) / total * 100)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Vote Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">{vote.title}</h1>
          {vote.summary && (
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{vote.summary}</p>
          )}
        </div>

        {/* Vote Status */}
        <div className="flex justify-center">
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${
            isExpired 
              ? 'bg-gray-100 text-gray-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            <Clock className="h-4 w-4" />
            <span>
              {isExpired ? 'Vote ended' : (timeRemaining && timeRemaining > 0 ? formatTimeRemaining(timeRemaining) : 'Active')}
            </span>
          </div>
        </div>

        {/* Vote Meta Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">Deadline</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {deadline ? formatDeadline(vote.parsedContent.vote_deadline!) : 'No deadline'}
            </p>
          </div>
          
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <CheckSquare className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">Options</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {vote.parsedContent.vote_options.length} choices
            </p>
          </div>
          
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">Votes</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {getTotalVotes()} total votes
            </p>
          </div>
        </div>

        {/* Vote Options */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Vote Options</h3>
          <div className="space-y-3">
            {vote.parsedContent.vote_options.map((option, index) => {
              const voteCount = voteResults[index] || 0
              const percentage = getVotePercentage(index)
              const isSelected = selectedOptions.includes(index)
              const isUserChoice = hasVoted && userVotes.some(v => ((v as Record<string, unknown>).parsedContent as Record<string, unknown>).choice_index === index)
              
              return (
                <div 
                  key={index} 
                  className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 
                    isUserChoice ? 'border-green-500 bg-green-50' :
                    'hover:bg-muted/30'
                  } ${hasVoted || isExpired ? 'cursor-default' : 'cursor-pointer'}`}
                  onClick={() => handleOptionToggle(index)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-blue-500 text-white' :
                        isUserChoice ? 'bg-green-500 text-white' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        <span className="text-sm font-medium">{String.fromCharCode(65 + index)}</span>
                      </div>
                      <span className="text-foreground font-medium">{option}</span>
                      {isUserChoice && (
                        <span className="text-xs text-green-600 font-medium">Your choice</span>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {voteCount} vote{voteCount !== 1 ? 's' : ''} ({percentage}%)
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isUserChoice ? 'bg-green-500' : 'bg-blue-600'
                      }`} 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Vote Action */}
        {!isExpired && !hasVoted && (
          <div className="text-center py-6">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleCastVote}
              disabled={selectedOptions.length === 0 || isVoting}
            >
              <VoteIcon className="h-4 w-4 mr-2" />
              {isVoting ? 'Casting Vote...' : `Cast Vote${selectedOptions.length > 1 ? 's' : ''}`}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              {vote.parsedContent.vote_multiple_choice ? 
                `Select up to ${vote.parsedContent.max_votes_per_user || 1} option${(vote.parsedContent.max_votes_per_user || 1) > 1 ? 's' : ''}` :
                'Select one option'
              }
            </p>
          </div>
        )}

        {hasVoted && !isExpired && (
          <div className="text-center py-6">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-green-100 text-green-700">
              <CheckSquare className="h-4 w-4" />
              <span>You have voted</span>
            </div>
          </div>
        )}

        {/* Additional Settings Info */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-foreground">Vote Settings</h4>
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>Max votes per user: {vote.parsedContent.max_votes_per_user}</div>
            <div>Result visibility: {vote.parsedContent.vote_result_visibility?.replace('_', ' ')}</div>
            <div>Scoring enabled: {vote.parsedContent.vote_scoring_enabled ? 'Yes' : 'No'}</div>
            <div>Multiple votes per option: {vote.parsedContent.allow_multiple_votes_per_option ? 'Yes' : 'No'}</div>
            <div>Anonymous voting: {vote.parsedContent.vote_anonymous ? 'Yes' : 'No'}</div>
            <div>Total participants: {getTotalVotes()}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Empty State for when no vote is selected
function EmptyVoteState() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-0">
      <div className="text-center">
        <div className="rounded-full bg-blue-100 p-6 mb-4 inline-block">
          <VoteIcon className="h-12 w-12 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No vote selected</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Select a vote from the sidebar to view its details and participate in the discussion
        </p>
      </div>
    </div>
  )
}

export const VoteContent = observer(({ vote, onVoteUpdate }: VoteContentProps) => {
  const userStore = useUserStore()
  const spaceStore = useSpaceStore()

  const handleDeleteVote = async () => {
    if (!vote || !userStore.user?.id) return
    
    if (confirm('Are you sure you want to delete this vote? This action cannot be undone.')) {
      try {
        const success = await entityService.deleteEntity(vote.id, userStore.user.id)
        
        if (success && onVoteUpdate) {
          onVoteUpdate(null)
        }
      } catch (error) {
        console.error('Exception deleting vote:', error)
      }
    }
  }

  // Check if user can delete (vote creator for now, will expand with role checking later)
  const canDelete = userStore.user && vote?.created_by === userStore.user.id

  if (!vote) {
    return <EmptyVoteState />
  }

  return (
    <div className="flex h-full">
      {/* Main Vote Details */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <VoteIcon className="h-5 w-5 text-blue-600" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">{vote.title}</h1>
                {vote.summary && (
                  <p className="text-sm text-muted-foreground">{vote.summary}</p>
                )}
              </div>
            </div>
            
            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={handleDeleteVote}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Vote
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Vote Details */}
        <VoteDetails vote={vote} />
      </div>

      {/* Comments Sidebar */}
      <div className="w-80 border-l bg-muted/30">
        <Comments 
          parentId={vote.id}
          parentType="vote"
          className="h-full"
        />
      </div>
    </div>
  )
}) 