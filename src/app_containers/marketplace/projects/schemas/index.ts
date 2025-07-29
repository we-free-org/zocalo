import { entityService } from '@/lib/entities'
import { ProjectEntityData, ProjectListEntityData, ProjectTaskEntityData } from '../types'

// Helper functions to work with project entities using the entity service

// Project entity helpers
export async function createProject(
  spaceId: string,
  createdBy: string,
  projectData: ProjectEntityData
) {
  return entityService.createEntity({
    space_id: spaceId,
    type: 'project',
    title: projectData.title,
    summary: projectData.description,
    content: projectData,
    created_by: createdBy,
    status: 'approved'
  })
}

export async function getProject(projectId: string) {
  return entityService.getEntityWithContent<ProjectEntityData>(projectId)
}

export async function getProjectsInSpace(spaceId: string) {
  return entityService.queryEntitiesWithContent<ProjectEntityData>({
    space_id: spaceId,
    type: 'project',
    status: 'approved',
    order_by: 'created_at',
    order_direction: 'desc'
  })
}

export async function updateProject(
  projectId: string,
  editedBy: string,
  updates: Partial<ProjectEntityData>
) {
  const currentProject = await getProject(projectId)
  if (!currentProject) return null

  const updatedContent = { ...currentProject.parsedContent, ...updates }
  
  return entityService.updateEntity(projectId, {
    title: updatedContent.title,
    summary: updatedContent.description,
    content: updatedContent,
    edited_by: editedBy
  })
}

// Project list entity helpers
export async function createProjectList(
  spaceId: string,
  createdBy: string,
  listData: ProjectListEntityData
) {
  return entityService.createEntity({
    space_id: spaceId,
    type: 'project_list',
    parent_id: listData.project_id,
    parent_type: 'project',
    title: listData.title,
    summary: listData.description,
    content: listData,
    created_by: createdBy,
    status: 'approved'
  })
}

export async function getProjectLists(projectId: string) {
  return entityService.queryEntitiesWithContent<ProjectListEntityData>({
    parent_id: projectId,
    type: 'project_list',
    status: 'approved',
    order_by: 'created_at',
    order_direction: 'asc'
  })
}

export async function updateProjectList(
  listId: string,
  editedBy: string,
  updates: Partial<ProjectListEntityData>
) {
  const currentList = await entityService.getEntityWithContent<ProjectListEntityData>(listId)
  if (!currentList) return null

  const updatedContent = { ...currentList.parsedContent, ...updates }
  
  return entityService.updateEntity(listId, {
    title: updatedContent.title,
    summary: updatedContent.description,
    content: updatedContent,
    edited_by: editedBy
  })
}

// Project task entity helpers
export async function createProjectTask(
  spaceId: string,
  createdBy: string,
  taskData: ProjectTaskEntityData,
  parentTaskId?: string
) {
  let parentId: string
  let parentType: string

  if (parentTaskId) {
    // This is a subtask
    parentId = parentTaskId
    parentType = 'project_task'
  } else if (taskData.list_id) {
    // This is a regular task in a list
    parentId = taskData.list_id
    parentType = 'project_list'
  } else {
    // This is a task directly in a project
    parentId = taskData.project_id
    parentType = 'project'
  }

  return entityService.createEntity({
    space_id: spaceId,
    type: 'project_task',
    parent_id: parentId,
    parent_type: parentType,
    title: taskData.title,
    summary: taskData.description,
    content: taskData,
    created_by: createdBy,
    status: 'approved'
  })
}

export async function getProjectTasks(projectId: string) {
  return entityService.queryEntitiesWithContent<ProjectTaskEntityData>({
    type: 'project_task',
    status: 'approved',
    order_by: 'created_at',
    order_direction: 'asc'
  }).then(tasks => 
    tasks.filter(task => task.parsedContent.project_id === projectId)
  )
}

export async function getListTasks(listId: string) {
  return entityService.queryEntitiesWithContent<ProjectTaskEntityData>({
    parent_id: listId,
    type: 'project_task',
    status: 'approved',
    order_by: 'created_at',
    order_direction: 'asc'
  })
}

export async function updateProjectTask(
  taskId: string,
  editedBy: string,
  updates: Partial<ProjectTaskEntityData>
) {
  const currentTask = await entityService.getEntityWithContent<ProjectTaskEntityData>(taskId)
  if (!currentTask) return null

  const updatedContent = { ...currentTask.parsedContent, ...updates }
  
  // Update parent if list changed
  const updateData: any = {
    title: updatedContent.title,
    summary: updatedContent.description,
    content: updatedContent,
    edited_by: editedBy
  }

  // If list_id changed, update the parent_id
  if (updates.list_id !== undefined && updates.list_id !== currentTask.parsedContent.list_id) {
    await entityService.moveEntity(
      taskId, 
      updates.list_id || updatedContent.project_id, 
      editedBy
    )
  }

  return entityService.updateEntity(taskId, updateData)
}

export async function moveTask(
  taskId: string,
  newListId: string | null,
  newPosition: number,
  editedBy: string
) {
  const task = await entityService.getEntityWithContent<ProjectTaskEntityData>(taskId)
  if (!task) return false

  const updatedContent = {
    ...task.parsedContent,
    list_id: newListId,
    position: newPosition
  }

  // Move the entity to new parent
  await entityService.moveEntity(taskId, newListId, editedBy)
  
  // Update the content with new position
  await entityService.updateEntity(taskId, {
    content: updatedContent,
    edited_by: editedBy
  })

  return true
}

export async function deleteProject(projectId: string, deletedBy: string) {
  return entityService.deleteEntity(projectId, deletedBy)
}

export async function deleteProjectList(listId: string, deletedBy: string) {
  return entityService.deleteEntity(listId, deletedBy)
}

export async function deleteProjectTask(taskId: string, deletedBy: string) {
  return entityService.deleteEntity(taskId, deletedBy)
} 