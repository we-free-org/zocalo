interface BaseEntity {
  id: string
  title: string
  summary?: string
  parent_id?: string | null // Allow both null and undefined to match database
  metadata?: any
  created_at: string
  created_by: string
}

export interface File extends BaseEntity {
  type?: 'file'
  content?: string
  file_url?: string
  file_name?: string
  file_type?: string
  file_size?: number
}

export interface Folder extends BaseEntity {
  type?: 'folder'
}

export type FileTreeItem = File | Folder

export interface FileTreeNode {
  item: FileTreeItem
  children: FileTreeNode[]
  isExpanded: boolean
} 