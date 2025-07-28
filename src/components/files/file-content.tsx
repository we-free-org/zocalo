'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { 
  Download, 
  Trash2, 
  File as FileIcon, 
  Image, 
  Video, 
  FileText,
  MessageCircle,
  Send
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase/client'
import { useSpaceStore, useUserStore } from '@/stores'
import { File } from './types'

interface FileContentProps {
  file: File | null
  onFileUpdate?: (file: File | null) => void
}

// File Viewer Component with Signed URLs
function FileViewer({ file }: { file: File }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)

  // Get signed URL for uploaded files
  useEffect(() => {
    const getSignedUrl = async () => {
      // Only get signed URL for uploaded files (not text content)
      if (!file.file_url || !file.metadata?.upload_path) return
      
      setIsLoadingUrl(true)
      setUrlError(null)
      
      try {
        console.log('Getting signed URL for:', file.metadata.upload_path)
        
        // Create signed URL directly from Supabase (valid for 60 seconds)
        const { data, error } = await supabase.storage
          .from('files')
          .createSignedUrl(file.metadata.upload_path, 60)

        if (error) {
          console.error('Failed to create signed URL:', error)
          setUrlError(error.message)
        } else if (data?.signedUrl) {
          console.log('Signed URL created successfully')
          setSignedUrl(data.signedUrl)
        }
      } catch (error) {
        console.error('Error getting signed URL:', error)
        setUrlError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setIsLoadingUrl(false)
      }
    }

    getSignedUrl()
  }, [file.file_url, file.metadata?.upload_path])

  const renderContent = () => {
    // If file has content (text-based), render it
    if (file.content) {
      // Check if it's markdown
      if (file.title.endsWith('.md') || file.file_type === 'text/markdown') {
        return (
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm">{file.content}</pre>
          </div>
        )
      }
      
      // Regular text
      return (
        <div className="font-mono text-sm">
          <pre className="whitespace-pre-wrap">{file.content}</pre>
        </div>
      )
    }

    // If file has URL (uploaded file), render based on type
    if (file.file_url) {
      const fileType = file.file_type?.toLowerCase() || ''
      
      // Show loading state while getting signed URL
      if (isLoadingUrl) {
        return (
          <div className="text-center py-12">
            <FileIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-lg font-medium mb-2">Loading file...</p>
            <p className="text-sm text-muted-foreground">Getting secure access to {file.title}</p>
          </div>
        )
      }

      // Show error if signed URL failed
      if (urlError) {
        return (
          <div className="text-center py-12">
            <FileIcon className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <p className="text-lg font-medium mb-2 text-red-600">Error loading file</p>
            <p className="text-sm text-muted-foreground">{urlError}</p>
          </div>
        )
      }

      // Use signed URL if available
      const fileUrl = signedUrl || file.file_url
      
      if (fileType.startsWith('image/')) {
        return (
          <div className="flex justify-center">
            <img 
              src={fileUrl} 
              alt={file.title}
              className="max-w-full h-auto rounded-lg shadow-lg"
              onError={() => setUrlError('Failed to load image')}
            />
          </div>
        )
      }
      
      if (fileType.startsWith('video/')) {
        return (
          <div className="flex justify-center">
            <video 
              controls 
              className="max-w-full h-auto rounded-lg shadow-lg"
            >
              <source src={fileUrl} type={fileType} />
              Your browser does not support the video tag.
            </video>
          </div>
        )
      }
      
      // For other file types, show download option with signed URL
      return (
        <div className="text-center py-12">
          <FileIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">{file.title}</p>
          <p className="text-sm text-muted-foreground mb-4">
            {file.file_type} • {file.file_size ? `${Math.round(file.file_size / 1024)} KB` : 'Unknown size'}
          </p>
          {signedUrl ? (
            <Button asChild>
              <a href={signedUrl} download={file.file_name || file.title}>
                <Download className="h-4 w-4 mr-2" />
                Download File
              </a>
            </Button>
          ) : (
            <Button disabled>
              <Download className="h-4 w-4 mr-2" />
              Getting download link...
            </Button>
          )}
        </div>
      )
    }

    // No content or URL
    return (
      <div className="text-center py-12">
        <FileIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-2">{file.title}</p>
        <p className="text-sm text-muted-foreground">No content available</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {renderContent()}
    </div>
  )
}

// Comments Sidebar Component
function CommentsSidebar({ file }: { file: File }) {
  const userStore = useUserStore()
  const spaceStore = useSpaceStore()
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoadingComments, setIsLoadingComments] = useState(false)

  // Load comments for the selected file
  useEffect(() => {
    const loadComments = async () => {
      if (!file?.id) {
        setComments([])
        return
      }
      
      setIsLoadingComments(true)
      try {
        const { data, error } = await supabase
          .from('entities')
          .select('id, content, created_at, created_by')
          .eq('type', 'comment')
          .eq('parent_id', file.id)
          .eq('status', 'approved')
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Failed to load comments:', error)
        } else if (data && data.length > 0) {
          // Fetch profiles for all comment authors
          const userIds = [...new Set(data.map(comment => comment.created_by))]
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url')
            .in('id', userIds)

          // Map profiles to comments
          const commentsWithProfiles = data.map(comment => ({
            ...comment,
            profiles: profilesData?.find(profile => profile.id === comment.created_by) || null
          }))
          
          setComments(commentsWithProfiles)
        } else {
          setComments([])
        }
      } catch (error) {
        console.error('Exception loading comments:', error)
      } finally {
        setIsLoadingComments(false)
      }
    }

    loadComments()
  }, [file?.id])

  const handleAddComment = async () => {
    if (!newComment.trim() || !file?.id || !userStore.user?.id) return

    try {
      const { data, error } = await supabase
        .from('entities')
        .insert({
          type: 'comment',
          parent_id: file.id,
          space_id: spaceStore.currentSpaceId,
          title: newComment.trim().substring(0, 100) + (newComment.trim().length > 100 ? '...' : ''),
          content: newComment.trim(),
          status: 'approved',
          created_by: userStore.user.id
        })
        .select('id, content, created_at, created_by')

      if (error) {
        console.error('Failed to add comment:', error)
      } else if (data) {
        // Fetch the user profile separately
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .eq('id', userStore.user.id)
          .single()

        // Add the comment with profile data
        const commentWithProfile = {
          ...data[0],
          profiles: profileData
        }
        
        setComments(prev => [...prev, commentWithProfile])
        setNewComment('')
      }
    } catch (error) {
      console.error('Exception adding comment:', error)
    }
  }

  return (
    <div className="w-80 border-l bg-muted/30 flex flex-col">
      {/* Comments Header */}
      <div className="border-b p-4">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-4 w-4 text-orange-600" />
          <h3 className="font-medium text-foreground text-sm">Comments</h3>
          <span className="text-xs text-muted-foreground">({comments.length})</span>
        </div>
      </div>
      
      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoadingComments ? (
          <div className="text-xs text-muted-foreground text-center py-4">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">No comments yet</div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="text-xs">
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
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
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-foreground">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
            disabled={!newComment.trim()}
            className="self-end"
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Empty State for when no file is selected
function EmptyFileState() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <FileIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No file selected</h3>
        <p className="text-sm text-muted-foreground">
          Select a file from the sidebar to view its content
        </p>
      </div>
    </div>
  )
}

export const FileContent = observer(({ file, onFileUpdate }: FileContentProps) => {
  const userStore = useUserStore()

  // Don't render anything for folders
  if (file && (file.metadata?.entity_type === 'folder' || (file as any).type === 'folder')) {
    return <EmptyFileState />
  }

  const handleDownload = async () => {
    if (!file) return
    
    if (file.file_url && file.metadata?.upload_path) {
      // For uploaded files, get signed URL for download
      try {
        const { data, error } = await supabase.storage
          .from('files')
          .createSignedUrl(file.metadata.upload_path, 60)

        if (error) {
          console.error('Failed to create download URL:', error)
          return
        }

        const link = document.createElement('a')
        link.href = data.signedUrl
        link.download = file.file_name || file.title
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (error) {
        console.error('Error downloading file:', error)
      }
    } else if (file.content) {
      // For text content, create a blob and download
      const blob = new Blob([file.content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.title.endsWith('.txt') ? file.title : `${file.title}.txt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

  const handleDelete = async () => {
    if (!file?.id || !userStore.user?.id) return
    
    if (confirm('Are you sure you want to delete this file?')) {
      try {
        const { error } = await supabase
          .from('entities')
          .update({ 
            status: 'deleted',
            deleted_by: userStore.user.id,
            deleted_at: new Date().toISOString()
          })
          .eq('id', file.id)

        if (error) {
          console.error('Failed to delete file:', error)
        } else {
          onFileUpdate?.(null) // Clear selection
          // Reload files
          window.location.reload()
        }
      } catch (error) {
        console.error('Exception deleting file:', error)
      }
    }
  }

  if (!file) {
    return <EmptyFileState />
  }

  return (
    <div className="flex h-full">
      {/* Main File Viewer */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {file.file_type?.startsWith('image/') ? (
                <Image className="h-5 w-5 text-orange-600" />
              ) : file.file_type?.startsWith('video/') ? (
                <Video className="h-5 w-5 text-orange-600" />
              ) : (
                <FileText className="h-5 w-5 text-orange-600" />
              )}
              <div>
                <h1 className="text-lg font-semibold text-foreground">{file.title}</h1>
                {file.summary && (
                  <p className="text-sm text-muted-foreground">{file.summary}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="hover:bg-orange-50 hover:border-orange-300"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="hover:text-red-600 hover:border-red-300"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* File Viewer */}
        <FileViewer file={file} />
      </div>

      {/* Comments Sidebar */}
      <CommentsSidebar file={file} />
    </div>
  )
}) 