'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { MessageCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useSpaceStore, useUserStore } from '@/stores'
import { entityService } from '@/lib/entities'

interface Comment {
  id: string
  content: string
  created_at: string
  created_by: string | null
  profiles?: {
    id: string
    first_name: string
    last_name: string
    avatar_url: string
  } | null
}

interface CommentsProps {
  parentId: string
  parentType: 'file' | 'event' | 'vote' | 'project_task'
  className?: string
}

export const Comments = observer(({ parentId, parentType, className = '' }: CommentsProps) => {
  const userStore = useUserStore()
  const spaceStore = useSpaceStore()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isAddingComment, setIsAddingComment] = useState(false)

  // Load comments for the parent entity
  useEffect(() => {
    const loadComments = async () => {
      if (!parentId) {
        setComments([])
        return
      }
      
      setIsLoadingComments(true)
      try {
        const commentEntities = await entityService.queryEntitiesWithContent({
          type: 'comment',
          parent_id: parentId,
          status: 'approved',
          order_by: 'created_at',
          order_direction: 'asc'
        })

        if (commentEntities.length > 0) {
          // Get unique user IDs for profile lookup (filter out nulls)
          const userIds = [...new Set(commentEntities.map(comment => comment.created_by).filter(Boolean))]
          
          // Fetch profiles - using direct supabase call since profiles aren't entities
          const { supabase } = await import('@/lib/supabase/client')
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url')
            .in('id', userIds)

          // Map comments with profiles
          const commentsWithProfiles: Comment[] = commentEntities.map(comment => ({
            id: comment.id,
            content: (comment.parsedContent as any)?.content || comment.metadata?.text_content || '',
            created_at: comment.created_at,
            created_by: comment.created_by,
            profiles: profilesData?.find(profile => profile.id === comment.created_by) || null
          }))
          
          setComments(commentsWithProfiles)
        } else {
          setComments([])
        }
      } catch (error) {
        console.error('Exception loading comments:', error)
        setComments([])
      } finally {
        setIsLoadingComments(false)
      }
    }

    loadComments()
  }, [parentId])

  const handleAddComment = async () => {
    if (!newComment.trim() || !parentId || !userStore.user?.id || !spaceStore.currentSpaceId) return

    setIsAddingComment(true)
    try {

      const commentEntity = await entityService.createEntity({
        space_id: spaceStore.currentSpaceId,
        type: 'comment',
        parent_id: parentId,
        parent_type: parentType,
        title: newComment.trim().substring(0, 100) + (newComment.trim().length > 100 ? '...' : ''),
        summary: null,
        content: {
          content: newComment.trim()
        },
        created_by: userStore.user.id
      })

      if (commentEntity) {
        // Get user profile for the new comment
        const { supabase } = await import('@/lib/supabase/client')
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .eq('id', userStore.user.id)
          .single()

        // Add the comment to local state
        const newCommentWithProfile: Comment = {
          id: commentEntity.id,
          content: newComment.trim(),
          created_at: commentEntity.created_at,
          created_by: commentEntity.created_by,
          profiles: profileData
        }
        
        setComments(prev => [...prev, newCommentWithProfile])
        setNewComment('')
      }
    } catch (error) {
      console.error('Exception adding comment:', error)
    } finally {
      setIsAddingComment(false)
    }
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Comments Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-foreground text-sm">Comments</h3>
          <span className="text-xs text-muted-foreground">({comments.length})</span>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingComments ? (
          <div className="text-xs text-muted-foreground text-center py-4">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">No comments yet</div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="text-xs">
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-orange-600">
                    {comment.profiles?.first_name?.[0] || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1 mb-1">
                    <span className="font-medium text-foreground">
                      {comment.profiles?.first_name} {comment.profiles?.last_name}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-foreground">{comment.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Add Comment */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 min-h-[60px] text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleAddComment()
              }
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddComment}
            disabled={!newComment.trim() || isAddingComment}
            className="self-end"
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}) 