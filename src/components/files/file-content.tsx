'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { 
  Download, 
  Trash2, 
  File as FileIcon, 
  Image, 
  Video, 
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { useSpaceStore, useUserStore } from '@/stores'
import { File } from './types'
import { Comments } from '@/components/comments'

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
      if (!file.parsedContent?.file_url || !file.parsedContent?.upload_path) return
      
      setIsLoadingUrl(true)
      setUrlError(null)
      
      try {
        console.log('Getting signed URL for:', file.parsedContent.upload_path)
        
        // Create signed URL directly from Supabase (valid for 60 seconds)
        const { data, error } = await supabase.storage
          .from('files')
          .createSignedUrl(file.parsedContent.upload_path, 60)

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
  }, [file.parsedContent?.file_url, file.parsedContent?.upload_path])

  const renderContent = () => {
    // If file has text content, render it
    if (file.metadata?.text_content) {
      // Check if it's markdown
      if (file.title.endsWith('.md') || file.parsedContent?.file_type === 'text/markdown') {
        return (
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm">{file.metadata.text_content}</pre>
          </div>
        )
      }
      
      // Regular text
      return (
        <div className="font-mono text-sm">
          <pre className="whitespace-pre-wrap">{file.metadata.text_content}</pre>
        </div>
      )
    }

    // If file has URL (uploaded file), render based on type
    if (file.parsedContent?.file_url) {
      const fileType = file.parsedContent?.file_type?.toLowerCase() || ''
      
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
      const fileUrl = signedUrl || file.parsedContent.file_url
      
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
            {file.parsedContent?.file_type} • {file.parsedContent?.file_size ? `${Math.round(file.parsedContent.file_size / 1024)} KB` : 'Unknown size'}
          </p>
          {signedUrl ? (
            <Button asChild>
              <a href={signedUrl} download={file.parsedContent?.file_name || file.title}>
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
  if (file && (file.metadata?.entity_type === 'folder' || (file as unknown as { type: string }).type === 'folder')) {
    return <EmptyFileState />
  }

  const handleDownload = async () => {
    if (!file) return
    
    if (file.parsedContent?.file_url && file.parsedContent?.upload_path) {
      // For uploaded files, get signed URL for download
      try {
        const { data, error } = await supabase.storage
          .from('files')
          .createSignedUrl(file.parsedContent.upload_path, 60)

        if (error) {
          console.error('Failed to create download URL:', error)
          return
        }

        const link = document.createElement('a')
        link.href = data.signedUrl
        link.download = file.parsedContent?.file_name || file.title
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (error) {
        console.error('Error downloading file:', error)
      }
    } else if (file.metadata?.text_content) {
      // For text content, create a blob and download
              const blob = new Blob([file.metadata.text_content], { type: 'text/plain' })
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
              {file.parsedContent?.file_type?.startsWith('image/') ? (
                <Image className="h-5 w-5 text-orange-600" />
              ) : file.parsedContent?.file_type?.startsWith('video/') ? (
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
      <Comments parentId={file.id} parentType="file" className="w-80 border-l bg-muted/30 flex flex-col" />
    </div>
  )
}) 