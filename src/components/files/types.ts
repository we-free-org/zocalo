import { Entity, FileEntityData, FolderEntityData } from '@/lib/entities'

// File entity with parsed content
export interface File extends Entity {
  type: 'file'
  parsedContent: FileEntityData
}

// Folder entity with parsed content
export interface Folder extends Entity {
  type: 'folder'
  parsedContent: FolderEntityData
}

export type FileTreeItem = File | Folder

export interface FileTreeNode {
  item: FileTreeItem
  children: FileTreeNode[]
  isExpanded: boolean
}

// Helper function to check if an item is a file
export function isFile(item: FileTreeItem): item is File {
  return item.type === 'file'
}

// Helper function to check if an item is a folder
export function isFolder(item: FileTreeItem): item is Folder {
  return item.type === 'folder'
} 