import { Entity, VoteEntityData } from '@/lib/entities'

// Vote entity with parsed content
export interface Vote extends Entity {
  type: 'vote'
  parsedContent: VoteEntityData
}

export interface VoteOption {
  id: string
  vote_id: string
  option_text: string
  votes_count: number
  created_at: string
}

export interface VoteSubmission {
  id: string
  vote_id: string
  option_id: string
  user_id: string
  score?: number // for scoring-enabled votes
  created_at: string
}

export type VoteTreeItem = Vote

export interface VoteTreeNode {
  item: VoteTreeItem
  children: VoteTreeNode[]
  isExpanded: boolean
} 