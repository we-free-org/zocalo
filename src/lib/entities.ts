import { supabase } from '@/lib/supabase/client'

// Base entity interface matching the cleaned up database structure
export interface Entity {
  id: string
  space_id: string
  type: string
  parent_id?: string | null
  parent_type?: string | null
  title: string
  summary?: string | null
  content?: string | null // JSON string containing entity-specific data
  metadata: Record<string, any>
  status: 'approved' | 'deleted' | 'pending_approval' | 'draft'
  encryption_type: 'none' | 'instance_key' | 'e2ee'
  is_edited: boolean
  edited_at?: string | null
  edited_by?: string | null
  deleted_by?: string | null
  deleted_at?: string | null
  thread_count: number
  last_activity_at: string
  created_by: string | null // Allow null for anonymous submissions
  created_at: string
  updated_at: string
}

// Entity schema interface
export interface EntitySchema {
  id: string
  type: string
  version: string
  name: string
  description?: string
  schema: Record<string, any> // JSON Schema
  is_active: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
}

// Typed entity data for specific entity types
export interface FileEntityData {
  file_url: string
  file_name: string
  file_type: string
  file_size?: number
  upload_path?: string
  original_name?: string
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface FolderEntityData {
  // Folders only need title and summary which are in the base entity
}

export interface EventEntityData {
  event_start: string
  event_end?: string
  event_location?: string
  event_link?: string
  participants?: string[]
  notes?: string
}

export interface VoteEntityData {
  vote_options: string[]
  vote_deadline?: string
  vote_multiple_choice: boolean
  vote_anonymous: boolean
  max_votes_per_user?: number
  vote_scoring_enabled?: boolean
  vote_result_visibility?: 'always_visible' | 'after_deadline' | 'never'
  allow_multiple_votes_per_option?: boolean
}

export interface CommentEntityData {
  content: string
}

// Generic entity creation input
export interface CreateEntityInput {
  space_id: string
  type: string
  parent_id?: string | null
  parent_type?: string | null
  title: string
  summary?: string | null
  content?: any // Entity-specific data that will be JSON serialized
  metadata?: Record<string, any>
  status?: 'approved' | 'deleted' | 'pending_approval' | 'draft'
  encryption_type?: 'none' | 'instance_key' | 'e2ee'
  created_by: string | null // Allow null for anonymous submissions
}

// Entity update input
export interface UpdateEntityInput {
  title?: string
  summary?: string | null
  content?: any // Entity-specific data that will be JSON serialized
  metadata?: Record<string, any>
  status?: 'approved' | 'deleted' | 'pending_approval' | 'draft'
  encryption_type?: 'none' | 'instance_key' | 'e2ee'
  edited_by: string
}

// Entity query filters
export interface EntityQueryFilters {
  space_id?: string
  type?: string | string[]
  parent_id?: string | null
  status?: string | string[]
  created_by?: string
  limit?: number
  offset?: number
  order_by?: 'created_at' | 'updated_at' | 'last_activity_at' | 'title'
  order_direction?: 'asc' | 'desc'
}

class EntityService {
  // Get entity schema for a specific type
  async getEntitySchema(type: string): Promise<EntitySchema | null> {
    const { data, error } = await supabase
      .from('entity_schemas')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error(`Failed to get schema for type ${type}:`, error)
      return null
    }

    return data
  }

  // Get all active entity schemas
  async getAllEntitySchemas(): Promise<EntitySchema[]> {
    const { data, error } = await supabase
      .from('entity_schemas')
      .select('*')
      .eq('is_active', true)
      .order('type')

    if (error) {
      console.error('Failed to get entity schemas:', error)
      return []
    }

    return data || []
  }

  // Validate entity content against schema
  private validateEntityContent(type: string, content: any, schema: EntitySchema): boolean {
    // Basic validation - in a real app you'd want a proper JSON Schema validator
    const requiredFields = schema.schema.required || []
    
    for (const field of requiredFields) {
      if (!content || content[field] === undefined || content[field] === null || content[field] === '') {
        console.error(`Required field ${field} missing for entity type ${type}`)
        return false
      }
    }
    
    return true
  }

  // Parse entity content from JSON string
  private parseEntityContent(entity: Entity): any {
    if (!entity.content) return {}
    
    try {
      return JSON.parse(entity.content)
    } catch (error) {
      console.error('Failed to parse entity content:', error)
      return {}
    }
  }

  // Create a new entity
  async createEntity(input: CreateEntityInput): Promise<Entity | null> {
    // Get schema for validation
    const schema = await this.getEntitySchema(input.type)
    if (!schema) {
      console.error(`No schema found for entity type: ${input.type}`)
      return null
    }

    // Validate content against schema
    if (input.content && !this.validateEntityContent(input.type, input.content, schema)) {
      return null
    }

    // Serialize content to JSON
    const contentJson = input.content ? JSON.stringify(input.content) : null
    


    const { data, error } = await supabase
      .from('entities')
      .insert({
        space_id: input.space_id,
        type: input.type,
        parent_id: input.parent_id || null,
        parent_type: input.parent_type || null,
        title: input.title,
        summary: input.summary || null,
        content: contentJson,
        metadata: input.metadata || {},
        status: input.status || 'approved',
        encryption_type: input.encryption_type || 'none',
        created_by: input.created_by,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create entity:', error)
      return null
    }

    return data
  }

  // Get entity by ID
  async getEntity(id: string): Promise<Entity | null> {
    const { data, error } = await supabase
      .from('entities')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Failed to get entity:', error)
      return null
    }

    return data
  }

  // Get entity with parsed content
  async getEntityWithContent<T = any>(id: string): Promise<(Entity & { parsedContent: T }) | null> {
    const entity = await this.getEntity(id)
    if (!entity) return null

    const parsedContent = this.parseEntityContent(entity)
    return { ...entity, parsedContent }
  }

  // Query entities with filters
  async queryEntities(filters: EntityQueryFilters = {}): Promise<Entity[]> {
    let query = supabase.from('entities').select('*')

    // Apply filters
    if (filters.space_id) {
      query = query.eq('space_id', filters.space_id)
    }

    if (filters.type) {
      if (Array.isArray(filters.type)) {
        query = query.in('type', filters.type)
      } else {
        query = query.eq('type', filters.type)
      }
    }

    if (filters.parent_id !== undefined) {
      if (filters.parent_id === null) {
        query = query.is('parent_id', null)
      } else {
        query = query.eq('parent_id', filters.parent_id)
      }
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }

    if (filters.created_by) {
      query = query.eq('created_by', filters.created_by)
    }

    // Apply ordering
    const orderBy = filters.order_by || 'created_at'
    const orderDirection = filters.order_direction || 'desc'
    query = query.order(orderBy, { ascending: orderDirection === 'asc' })

    // Apply pagination
    if (filters.limit) {
      query = query.limit(filters.limit)
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to query entities:', error)
      return []
    }

    return data || []
  }

  // Query entities with parsed content
  async queryEntitiesWithContent<T = any>(filters: EntityQueryFilters = {}): Promise<(Entity & { parsedContent: T })[]> {
    const entities = await this.queryEntities(filters)
    return entities.map(entity => ({
      ...entity,
      parsedContent: this.parseEntityContent(entity)
    }))
  }

  // Update entity
  async updateEntity(id: string, input: UpdateEntityInput): Promise<Entity | null> {
    const entity = await this.getEntity(id)
    if (!entity) {
      console.error('Entity not found:', id)
      return null
    }

    // Get schema for validation if content is being updated
    if (input.content !== undefined) {
      const schema = await this.getEntitySchema(entity.type)
      if (!schema) {
        console.error(`No schema found for entity type: ${entity.type}`)
        return null
      }

      // Validate content against schema
      if (input.content && !this.validateEntityContent(entity.type, input.content, schema)) {
        return null
      }
    }

    // Prepare update data
    const updateData: any = {
      edited_by: input.edited_by,
      edited_at: new Date().toISOString(),
      is_edited: true,
    }

    if (input.title !== undefined) updateData.title = input.title
    if (input.summary !== undefined) updateData.summary = input.summary
    if (input.content !== undefined) {
      updateData.content = input.content ? JSON.stringify(input.content) : null
    }
    if (input.metadata !== undefined) updateData.metadata = input.metadata
    if (input.status !== undefined) updateData.status = input.status
    if (input.encryption_type !== undefined) updateData.encryption_type = input.encryption_type

    const { data, error } = await supabase
      .from('entities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update entity:', error)
      return null
    }

    return data
  }

  // Soft delete entity
  async deleteEntity(id: string, deletedBy: string): Promise<boolean> {
    const { error } = await supabase
      .from('entities')
      .update({
        status: 'deleted',
        deleted_by: deletedBy,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Failed to delete entity:', error)
      return false
    }

    return true
  }

  // Hard delete entity (permanent)
  async permanentlyDeleteEntity(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('entities')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to permanently delete entity:', error)
      return false
    }

    return true
  }

  // Get children of an entity
  async getEntityChildren(parentId: string, filters: Omit<EntityQueryFilters, 'parent_id'> = {}): Promise<Entity[]> {
    return this.queryEntities({ ...filters, parent_id: parentId })
  }

  // Get children with parsed content
  async getEntityChildrenWithContent<T = any>(parentId: string, filters: Omit<EntityQueryFilters, 'parent_id'> = {}): Promise<(Entity & { parsedContent: T })[]> {
    return this.queryEntitiesWithContent({ ...filters, parent_id: parentId })
  }

  // Move entity to different parent
  async moveEntity(id: string, newParentId: string | null, editedBy: string): Promise<boolean> {
    const { error } = await supabase
      .from('entities')
      .update({
        parent_id: newParentId,
        edited_by: editedBy,
        edited_at: new Date().toISOString(),
        is_edited: true,
      })
      .eq('id', id)

    if (error) {
      console.error('Failed to move entity:', error)
      return false
    }

    return true
  }

  // Helper methods for specific entity types

  // File-specific helpers
  async createFile(input: Omit<CreateEntityInput, 'type' | 'content'> & { content: FileEntityData }): Promise<Entity | null> {
    return this.createEntity({ ...input, type: 'file' })
  }

  async createFolder(input: Omit<CreateEntityInput, 'type' | 'content'> & { content?: FolderEntityData }): Promise<Entity | null> {
    return this.createEntity({ ...input, type: 'folder', content: {} })
  }

  async getFilesInFolder(folderId: string | null, spaceId: string): Promise<(Entity & { parsedContent: FileEntityData | FolderEntityData })[]> {
    return this.queryEntitiesWithContent({
      space_id: spaceId,
      parent_id: folderId,
      type: ['file', 'folder'],
      status: 'approved',
      order_by: 'created_at',
      order_direction: 'asc'
    })
  }
}

// Export singleton instance
export const entityService = new EntityService() 