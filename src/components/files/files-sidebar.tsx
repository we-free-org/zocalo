'use client'

import { useState, useEffect, useRef } from 'react'
import { observer } from 'mobx-react-lite'
import { Plus, File as FileIcon, Folder, FolderOpen, ChevronRight, ChevronDown, Upload, MoreVertical, Trash2, Edit, Move, FileUp } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { supabase } from '@/lib/supabase/client'
import { useSpaceStore, useUserStore } from '@/stores'
import { cn } from '@/lib/utils'
import { File, Folder as FolderType, FileTreeItem, FileTreeNode } from './types'

interface FilesSidebarProps {
  selectedFile: File | null
  onFileSelect: (file: File | null) => void
}

// Move Item Selector Component
interface MoveItemSelectorProps {
  files: FileTreeItem[]
  selectedItem: FileTreeItem | null
  onMove: (targetParentId: string | null) => void
  onCancel: () => void
}

function MoveItemSelector({ files, selectedItem, onMove, onCancel }: MoveItemSelectorProps) {
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null)

  if (!selectedItem) return null

  // Get only folders for the destination selector
  const folders = files.filter(file => 
    file.metadata?.entity_type === 'folder' || 
    (file as any).type === 'folder'
  )

  // Build folder hierarchy
  const buildFolderHierarchy = (parentId: string | null = null, level: number = 0): React.ReactElement[] => {
    const childFolders = folders.filter(folder => folder.parent_id === parentId)
    
    return childFolders.map(folder => {
      // Check if this folder should be disabled
      const isDisabled = 
        folder.id === selectedItem.id || // Can't move to itself
        isDescendantOf(selectedItem.id, folder.id) // Can't move to its own descendant

      const children = buildFolderHierarchy(folder.id, level + 1)
      
      return (
        <div key={folder.id}>
          <div
            className={cn(
              "flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-colors",
              "hover:bg-muted/50",
              selectedDestination === folder.id && "bg-orange-50 border border-orange-200",
              isDisabled && "opacity-50 cursor-not-allowed"
            )}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={isDisabled ? undefined : () => setSelectedDestination(folder.id)}
          >
            <Folder className="h-4 w-4 text-orange-600 flex-shrink-0" />
            <span className="text-sm truncate">{folder.title}</span>
            {isDisabled && (
              <span className="text-xs text-muted-foreground ml-auto">Can't move here</span>
            )}
          </div>
          {children}
        </div>
      )
    })
  }

  // Check if itemId is a descendant of parentId
  const isDescendantOf = (itemId: string, potentialParentId: string): boolean => {
    const item = files.find(f => f.id === itemId)
    if (!item || !item.parent_id) return false
    
    if (item.parent_id === potentialParentId) return true
    return isDescendantOf(item.parent_id, potentialParentId)
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Select destination folder for <strong>{selectedItem.title}</strong>
      </div>
      
      <div className="border rounded-lg p-2 max-h-60 overflow-y-auto">
        {/* Root option */}
        <div
          className={cn(
            "flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-colors",
            "hover:bg-muted/50",
            selectedDestination === null && "bg-orange-50 border border-orange-200"
          )}
          onClick={() => setSelectedDestination(null)}
        >
          <FileIcon className="h-4 w-4 text-orange-600 flex-shrink-0" />
          <span className="text-sm">Root (no folder)</span>
        </div>
        
        {/* Folder hierarchy */}
        {buildFolderHierarchy()}
        
        {folders.length === 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No folders available
          </div>
        )}
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={() => onMove(selectedDestination)}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          Move Here
        </Button>
      </div>
    </div>
  )
}

// File Tree Component
function FileTree({ 
  nodes, 
  selectedFile, 
  onFileSelect, 
  onToggle,
  onItemAction
}: {
  nodes: FileTreeNode[]
  selectedFile: File | null
  onFileSelect: (file: File | null) => void
  onToggle: (nodeId: string) => void
  onItemAction: (action: string, item: FileTreeItem) => void
}) {
  const isFile = (item: FileTreeItem): item is File => {
    // Check metadata first (most reliable)
    if (item.metadata?.entity_type) {
      return item.metadata.entity_type === 'file'
    }
    // Check the type field from database
    if ('type' in item && item.type) {
      return item.type === 'file'
    }
    // Fallback: check if it has file-specific properties
    return 'file_url' in item || 'file_type' in item || 'file_size' in item
  }

  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <div key={node.item.id}>
          <div
            className={cn(
              "flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group",
              selectedFile?.id === node.item.id && "bg-orange-50 border border-orange-200"
            )}
          >
            <div 
              className="flex items-center space-x-2 flex-1 cursor-pointer"
              onClick={() => {
                if (isFile(node.item)) {
                  onFileSelect(node.item)
                } else {
                  onToggle(node.item.id)
                }
              }}
            >
              {!isFile(node.item) && (
                <ChevronRight
                  className={cn(
                    "h-3 w-3 text-muted-foreground transition-transform",
                    node.isExpanded && "rotate-90"
                  )}
                />
              )}
              {isFile(node.item) ? (
                <FileIcon className="h-4 w-4 text-orange-600 flex-shrink-0" />
              ) : node.isExpanded ? (
                <FolderOpen className="h-4 w-4 text-orange-600 flex-shrink-0" />
              ) : (
                <Folder className="h-4 w-4 text-orange-600 flex-shrink-0" />
              )}
              <span className="text-sm truncate">{node.item.title}</span>
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
                <DropdownMenuItem onClick={() => onItemAction('rename', node.item)}>
                  <Edit className="h-3 w-3 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onItemAction('move', node.item)}>
                  <Move className="h-3 w-3 mr-2" />
                  Move
                </DropdownMenuItem>
                {!isFile(node.item) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onItemAction('upload', node.item)}>
                      <FileUp className="h-3 w-3 mr-2" />
                      Upload file to folder
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onItemAction('delete', node.item)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {!isFile(node.item) && node.isExpanded && node.children.length > 0 && (
            <div className="ml-4 mt-1">
              <FileTree
                nodes={node.children}
                selectedFile={selectedFile}
                onFileSelect={onFileSelect}
                onToggle={onToggle}
                onItemAction={onItemAction}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Empty State Component
function EmptyState({ onCreateFile, onCreateFolder, onUploadFile }: {
  onCreateFile: () => void
  onCreateFolder: () => void
  onUploadFile: () => void
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="rounded-full bg-orange-100 p-4 mb-4">
        <FileIcon className="h-8 w-8 text-orange-600" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No files yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Get started by creating your first file or folder to organize your content.
      </p>
      <div className="flex flex-col space-y-2 w-full max-w-xs">
        <Button onClick={onCreateFile} className="bg-orange-600 hover:bg-orange-700 text-white">
          <FileIcon className="h-4 w-4 mr-2" />
          Create File
        </Button>
        <Button variant="outline" onClick={onCreateFolder}>
          <Folder className="h-4 w-4 mr-2" />
          Create Folder
        </Button>
        <Button variant="outline" onClick={onUploadFile}>
          <Upload className="h-4 w-4 mr-2" />
          Upload File
        </Button>
      </div>
    </div>
  )
}

export const FilesSidebar = observer(({ selectedFile, onFileSelect }: FilesSidebarProps) => {
  const spaceStore = useSpaceStore()
  const userStore = useUserStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderUploadRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileTreeItem[]>([])
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [createType, setCreateType] = useState<'file' | 'folder'>('file')
  const [selectedItem, setSelectedItem] = useState<FileTreeItem | null>(null)
  const [uploadToFolder, setUploadToFolder] = useState<FileTreeItem | null>(null)
  const [newItem, setNewItem] = useState({
    title: '',
    summary: '',
    content: '',
    parent_id: null as string | null
  })
  const [renameTitle, setRenameTitle] = useState('')
  const [isMoveLoading, setIsMoveLoading] = useState(false)

  // Load files and folders
  useEffect(() => {
    const loadFiles = async () => {
      if (!spaceStore.currentSpaceId) {
        setFiles([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('entities')
          .select('id, type, title, summary, content, file_url, file_name, file_type, file_size, parent_id, metadata, created_at, created_by')
          .eq('space_id', spaceStore.currentSpaceId)
          .in('type', ['file', 'folder'])
          .eq('status', 'approved')
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Failed to load files:', error)
        } else {
          // Ensure we have the type information for proper categorization
          const processedData = (data || []).map(item => ({
            ...item,
            type: item.type, // Ensure type field is preserved
            metadata: {
              ...item.metadata,
              entity_type: item.type
            }
          }))
          setFiles(processedData)
        }
      } catch (error) {
        console.error('Exception loading files:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadFiles()
  }, [spaceStore.currentSpaceId])

  // Build file tree
  useEffect(() => {
    const buildTree = (items: FileTreeItem[], parentId: string | null = null): FileTreeNode[] => {
      return items
        .filter(item => item.parent_id === parentId)
        .map(item => ({
          item,
          children: buildTree(items, item.id),
          isExpanded: false
        }))
    }

    setFileTree(buildTree(files))
  }, [files])

  const handleToggleNode = (nodeId: string) => {
    const toggleNode = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes.map(node => {
        if (node.item.id === nodeId) {
          return { ...node, isExpanded: !node.isExpanded }
        }
        if (node.children.length > 0) {
          return { ...node, children: toggleNode(node.children) }
        }
        return node
      })
    }
    setFileTree(toggleNode(fileTree))
  }

  const handleCreateItem = async () => {
    if (!newItem.title.trim() || !userStore.user?.id) return

    try {
      const { data, error } = await supabase
        .from('entities')
        .insert({
          type: createType,
          space_id: spaceStore.currentSpaceId,
          title: newItem.title.trim(),
          summary: newItem.summary.trim() || null,
          content: createType === 'file' ? (newItem.content.trim() || null) : null,
          parent_id: newItem.parent_id,
          status: 'approved',
          created_by: userStore.user.id,
          metadata: {
            entity_type: createType
          }
        })
        .select('id, type, title, summary, content, file_url, file_name, file_type, file_size, parent_id, metadata, created_at, created_by')

      if (error) {
        console.error('Failed to create item:', error)
      } else if (data) {
        const processedData = data.map(item => ({
          ...item,
          metadata: {
            ...item.metadata,
            entity_type: item.type
          }
        }))
        setFiles(prev => [...prev, ...processedData])
        setNewItem({ title: '', summary: '', content: '', parent_id: null })
        setIsCreateDialogOpen(false)
      }
    } catch (error) {
      console.error('Exception creating item:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !userStore.user?.id) return

    setIsUploading(true)
    try {
      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${spaceStore.currentSpaceId}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Failed to upload file:', uploadError)
        return
      }

      // Store file path for signed URL generation
      // Create entity record
      const { data, error } = await supabase
        .from('entities')
        .insert({
          type: 'file',
          space_id: spaceStore.currentSpaceId,
          title: file.name,
          file_url: `files/${filePath}`, // Store bucket path for reference
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          parent_id: null, // TODO: Allow selecting parent folder
          status: 'approved',
          created_by: userStore.user.id,
          metadata: {
            entity_type: 'file',
            original_name: file.name,
            upload_path: filePath // This is what we use for signed URLs
          }
        })
        .select('id, type, title, summary, content, file_url, file_name, file_type, file_size, parent_id, metadata, created_at, created_by')

      if (error) {
        console.error('Failed to create file entity:', error)
      } else if (data) {
        const processedData = data.map(item => ({
          ...item,
          metadata: {
            ...item.metadata,
            entity_type: item.type
          }
        }))
        setFiles(prev => [...prev, ...processedData])
      }
    } catch (error) {
      console.error('Exception uploading file:', error)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleCreateFile = () => {
    setCreateType('file')
    setIsCreateDialogOpen(true)
  }

  const handleCreateFolder = () => {
    setCreateType('folder')
    setIsCreateDialogOpen(true)
  }

  const handleUploadFile = () => {
    setUploadToFolder(null)
    fileInputRef.current?.click()
  }

  const handleItemAction = (action: string, item: FileTreeItem) => {
    setSelectedItem(item)
    
    switch (action) {
      case 'rename':
        setRenameTitle(item.title)
        setIsRenameDialogOpen(true)
        break
      case 'move':
        setIsMoveDialogOpen(true)
        break
      case 'upload':
        setUploadToFolder(item)
        folderUploadRef.current?.click()
        break
      case 'delete':
        handleDeleteItem(item)
        break
    }
  }

  const handleDeleteItem = async (item: FileTreeItem) => {
    if (!userStore.user?.id) return
    
    try {
      const { error } = await supabase
        .from('entities')
        .update({ 
          status: 'deleted',
          deleted_by: userStore.user.id,
          deleted_at: new Date().toISOString()
        })
        .eq('id', item.id)
      
      if (error) {
        console.error('Failed to delete item:', error)
      } else {
        setFiles(prev => prev.filter(f => f.id !== item.id))
        if (selectedFile?.id === item.id) {
          onFileSelect(null)
        }
      }
    } catch (error) {
      console.error('Exception deleting item:', error)
    }
  }

  const handleRenameItem = async () => {
    if (!selectedItem || !renameTitle.trim()) return
    
    try {
      const { error } = await supabase
        .from('entities')
        .update({ title: renameTitle.trim() })
        .eq('id', selectedItem.id)
      
      if (error) {
        console.error('Failed to rename item:', error)
      } else {
        setFiles(prev => prev.map(f => 
          f.id === selectedItem.id ? { ...f, title: renameTitle.trim() } : f
        ))
        setIsRenameDialogOpen(false)
        setSelectedItem(null)
        setRenameTitle('')
      }
    } catch (error) {
      console.error('Exception renaming item:', error)
    }
  }

  const handleMoveItem = async (targetParentId: string | null) => {
    if (!selectedItem) return
    
    setIsMoveLoading(true)
    try {
      const { error } = await supabase
        .from('entities')
        .update({ parent_id: targetParentId })
        .eq('id', selectedItem.id)
      
      if (error) {
        console.error('Failed to move item:', error)
      } else {
        // Update local state
        setFiles(prev => prev.map(f => 
          f.id === selectedItem.id ? { ...f, parent_id: targetParentId } : f
        ))
        setIsMoveDialogOpen(false)
        setSelectedItem(null)
      }
    } catch (error) {
      console.error('Exception moving item:', error)
    } finally {
      setIsMoveLoading(false)
    }
  }

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !userStore.user?.id || !uploadToFolder) return

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${spaceStore.currentSpaceId}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Failed to upload file:', uploadError)
        return
      }

      const { data, error } = await supabase
        .from('entities')
        .insert({
          type: 'file',
          space_id: spaceStore.currentSpaceId,
          title: file.name,
          file_url: `files/${filePath}`, // Store bucket path for reference
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          parent_id: uploadToFolder.id,
          status: 'approved',
          created_by: userStore.user.id,
          metadata: { 
            entity_type: 'file', 
            original_name: file.name, 
            upload_path: filePath // This is what we use for signed URLs
          }
        })
        .select('id, type, title, summary, content, file_url, file_name, file_type, file_size, parent_id, metadata, created_at, created_by')

      if (error) {
        console.error('Failed to create file entity:', error)
      } else if (data) {
        const processedData = data.map(item => ({
          ...item,
          type: item.type,
          metadata: {
            ...item.metadata,
            entity_type: item.type
          }
        }))
        setFiles(prev => [...prev, ...processedData])
        setUploadToFolder(null)
      }
    } catch (error) {
      console.error('Exception uploading file to folder:', error)
    } finally {
      setIsUploading(false)
      if (folderUploadRef.current) {
        folderUploadRef.current.value = ''
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">Loading files...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
        accept="*/*"
      />
      <input
        ref={folderUploadRef}
        type="file"
        onChange={handleFolderUpload}
        className="hidden"
        accept="*/*"
      />

      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-foreground">Files</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={isUploading}>
                <Plus className="h-4 w-4 mr-1" />{isUploading ? 'Uploading...' : 'Add'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCreateFile}>
                <FileIcon className="h-4 w-4 mr-2" />
                New File
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreateFolder}>
                <Folder className="h-4 w-4 mr-2" />
                New Folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleUploadFile}>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <EmptyState onCreateFile={handleCreateFile} onCreateFolder={handleCreateFolder} onUploadFile={handleUploadFile} />
        ) : (
          <div className="p-4">
            <FileTree
              nodes={fileTree}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
              onToggle={handleToggleNode}
              onItemAction={handleItemAction}
            />
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New {createType === 'file' ? 'File' : 'Folder'}</DialogTitle>
            <DialogDescription>
              {createType === 'file' 
                ? 'Create a new text file in this space.' 
                : 'Create a new folder to organize your files.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Name</Label>
              <Input
                id="title"
                value={newItem.title}
                onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                placeholder={`Enter ${createType} name`}
              />
            </div>
            <div>
              <Label htmlFor="summary">Description (optional)</Label>
              <Input
                id="summary"
                value={newItem.summary}
                onChange={(e) => setNewItem(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Brief description"
              />
            </div>
            {createType === 'file' && (
              <div>
                <Label htmlFor="content">Content (optional)</Label>
                <Textarea
                  id="content"
                  value={newItem.content}
                  onChange={(e) => setNewItem(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="File content"
                  rows={4}
                />
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateItem}
                disabled={!newItem.title.trim()}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Create {createType === 'file' ? 'File' : 'Folder'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {selectedItem?.metadata?.entity_type || 'Item'}</DialogTitle>
            <DialogDescription>
              Enter a new name for this {selectedItem?.metadata?.entity_type || 'item'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rename-title">Name</Label>
              <Input
                id="rename-title"
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                placeholder="Enter new name"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRenameItem} className="bg-orange-600 hover:bg-orange-700 text-white">
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

              {/* Move Dialog */}
        <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Move {selectedItem?.title}</DialogTitle>
              <DialogDescription>
                Select where to move this {selectedItem?.metadata?.entity_type || 'item'}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <MoveItemSelector 
                files={files}
                selectedItem={selectedItem}
                onMove={handleMoveItem}
                onCancel={() => setIsMoveDialogOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
    </div>
  )
}) 