'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  PointerSensor,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { KanbanList } from './KanbanList'
import { TaskDetailsModal } from './TaskDetailsModal'
import { TaskCard } from './TaskCard'
import { ProjectListEntity, ProjectTaskEntity, CreateListFormData, KanbanBoardProps, PROJECTS_HIGHLIGHT_COLOR } from '../types'
import { getProjectLists, createProjectList, getProjectTasks, updateProjectList } from '../schemas'
import { useStore } from '@/stores'

export function KanbanBoard({ projectId, spaceId }: KanbanBoardProps) {
  const { userStore } = useStore()
  const [lists, setLists] = useState<ProjectListEntity[]>([])
  const [tasks, setTasks] = useState<ProjectTaskEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [createListDialogOpen, setCreateListDialogOpen] = useState(false)
  const [createListFormData, setCreateListFormData] = useState<CreateListFormData>({
    title: '',
    description: '',
    color: '#e5e7eb',
    list_type: 'custom'
  })
  const [selectedTask, setSelectedTask] = useState<ProjectTaskEntity | null>(null)
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false)
  
  // Drag and drop state
  const [activeList, setActiveList] = useState<ProjectListEntity | null>(null)
  const [activeTask, setActiveTask] = useState<ProjectTaskEntity | null>(null)

  const currentUser = userStore.user

  // Configure sensors for better drag and drop experience
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 8,
      },
    })
  )

  useEffect(() => {
    if (projectId) {
      loadProjectData()
    }
  }, [projectId])

  const loadProjectData = async () => {
    try {
      setLoading(true)
      const [listsData, tasksData] = await Promise.all([
        getProjectLists(projectId),
        getProjectTasks(projectId)
      ])
      
      // Sort lists by position
      const sortedLists = listsData.sort((a, b) => 
        (a.parsedContent.position || 0) - (b.parsedContent.position || 0)
      )
      
      setLists(sortedLists)
      setTasks(tasksData)
    } catch (error) {
      console.error('Failed to load project data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateList = async () => {
    if (!currentUser || !createListFormData.title.trim()) return

    try {
      const listData = {
        title: createListFormData.title.trim(),
        description: createListFormData.description?.trim(),
        position: lists.length,
        project_id: projectId,
        color: createListFormData.color,
        list_type: createListFormData.list_type,
        settings: {
          auto_archive: false,
          collapsed: false
        }
      }

      const newList = await createProjectList(spaceId, currentUser.id, listData)
      if (newList) {
        const listEntity: ProjectListEntity = {
          ...newList,
          parsedContent: listData
        }
        
        setLists(prev => [...prev, listEntity])
        setCreateListDialogOpen(false)
        setCreateListFormData({
          title: '',
          description: '',
          color: '#e5e7eb',
          list_type: 'custom'
        })
      }
    } catch (error) {
      console.error('Failed to create list:', error)
    }
  }

  const handleTaskCreate = async (listId: string, title: string) => {
    if (!currentUser || !title.trim()) return

    try {
      const { createProjectTask } = await import('../schemas')
      
      // Get tasks for this list to determine position
      const listTasks = tasks.filter(task => task.parsedContent.list_id === listId)
      
      const taskData = {
        title: title.trim(),
        status: 'todo' as const,
        priority: 'medium' as const,
        position: listTasks.length,
        project_id: projectId,
        list_id: listId
      }

      const newTask = await createProjectTask(spaceId, currentUser.id, taskData)
      if (newTask) {
        const taskEntity: ProjectTaskEntity = {
          ...newTask,
          parsedContent: taskData
        }
        
        setTasks(prev => [...prev, taskEntity])
      }
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  const handleTaskUpdate = async (taskId: string, updates: Partial<ProjectTaskEntity['parsedContent']>) => {
    if (!currentUser) return

    try {
      const { updateProjectTask } = await import('../schemas')
      
      await updateProjectTask(taskId, currentUser.id, updates)
      
      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, parsedContent: { ...task.parsedContent, ...updates } }
          : task
      ))
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const handleTaskMove = async (taskId: string, newListId: string, newPosition: number) => {
    if (!currentUser) return

    try {
      const { moveTask } = await import('../schemas')
      
      await moveTask(taskId, newListId, newPosition, currentUser.id)
      
      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              parsedContent: { 
                ...task.parsedContent, 
                list_id: newListId, 
                position: newPosition 
              },
              parent_id: newListId
            }
          : task
      ))
    } catch (error) {
      console.error('Failed to move task:', error)
    }
  }

  // Task details handlers
  const handleTaskClick = (task: ProjectTaskEntity) => {
    setSelectedTask(task)
    setTaskDetailsOpen(true)
  }

  const handleSubtaskClick = (subtask: ProjectTaskEntity) => {
    setSelectedTask(subtask)
    setTaskDetailsOpen(true)
  }

  const handleListUpdate = async (listId: string, updates: Partial<ProjectListEntity['parsedContent']>) => {
    if (!currentUser) return

    try {
      await updateProjectList(listId, currentUser.id, updates)
      
      // Update local state
      setLists(prev => prev.map(list => 
        list.id === listId 
          ? { ...list, title: updates.title || list.title, parsedContent: { ...list.parsedContent, ...updates } }
          : list
      ))
    } catch (error) {
      console.error('Failed to update list:', error)
    }
  }

  const handleCreateSubtask = async (parentTaskId: string, title: string) => {
    if (!currentUser || !title.trim()) return

    try {
      const { createProjectTask } = await import('../schemas')
      
      const subtaskData = {
        title: title.trim(),
        status: 'todo' as const,
        priority: 'medium' as const,
        position: 0,
        project_id: projectId,
        list_id: undefined, // Subtasks don't belong to lists directly
      }

      const newSubtask = await createProjectTask(spaceId, currentUser.id, subtaskData, parentTaskId)
      if (newSubtask) {
        const subtaskEntity: ProjectTaskEntity = {
          ...newSubtask,
          parsedContent: subtaskData
        }
        
        setTasks(prev => [...prev, subtaskEntity])
      }
    } catch (error) {
      console.error('Failed to create subtask:', error)
    }
  }

  const getSubtasks = (taskId: string) => {
    return tasks.filter(task => task.parent_id === taskId && !task.parsedContent.list_id)
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const activeId = active.id as string

    // Check if dragging a list
    const list = lists.find(l => l.id === activeId)
    if (list) {
      setActiveList(list)
      return
    }

    // Check if dragging a task
    const task = tasks.find(t => t.id === activeId)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Handle task dragging over different lists
    if (activeTask && overId !== activeId) {
      const activeTask = tasks.find(t => t.id === activeId)
      if (!activeTask) return

      // Check if dropping over a list
      const overList = lists.find(l => l.id === overId)
      if (overList && activeTask.parsedContent.list_id !== overId) {
        // Move task to different list temporarily (visual feedback)
        setTasks(prev => prev.map(task => 
          task.id === activeId 
            ? { 
                ...task, 
                parsedContent: { 
                  ...task.parsedContent, 
                  list_id: overId
                }
              }
            : task
        ))
      }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveList(null)
    setActiveTask(null)

    if (!over || !currentUser) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    // Handle list reordering
    if (activeList) {
      const oldIndex = lists.findIndex(list => list.id === activeId)
      const newIndex = lists.findIndex(list => list.id === overId)

      if (oldIndex !== newIndex) {
        const newLists = arrayMove(lists, oldIndex, newIndex)
        setLists(newLists)

        // Update positions in database
        try {
          const updatePromises = newLists.map((list, index) => 
            updateProjectList(list.id, currentUser.id, { position: index })
          )
          await Promise.all(updatePromises)
        } catch (error) {
          console.error('Failed to reorder lists:', error)
          // Revert on error
          setLists(lists)
        }
      }
      return
    }

    // Handle task movement
    if (activeTask) {
      const activeTaskData = tasks.find(t => t.id === activeId)
      if (!activeTaskData) return

      // Check if dropping over a list
      const overList = lists.find(l => l.id === overId)
      if (overList) {
        const targetListId = overList.id
        const targetTasks = tasks.filter(task => task.parsedContent.list_id === targetListId)
        const newPosition = targetTasks.length

        if (activeTaskData.parsedContent.list_id !== targetListId) {
          await handleTaskMove(activeId, targetListId, newPosition)
        }
        return
      }

      // Check if dropping over another task (reordering within list)
      const overTask = tasks.find(t => t.id === overId)
      if (overTask && activeTaskData.parsedContent.list_id === overTask.parsedContent.list_id) {
        const listId = activeTaskData.parsedContent.list_id
        if (listId) {
          const listTasks = tasks.filter(task => task.parsedContent.list_id === listId)
          const oldIndex = listTasks.findIndex(task => task.id === activeId)
          const newIndex = listTasks.findIndex(task => task.id === overId)

          if (oldIndex !== newIndex) {
            await handleTaskMove(activeId, listId, newIndex)
          }
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading kanban board...</p>
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        {lists.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md">
              <div className="text-muted-foreground">No lists yet</div>
              <p className="text-sm text-muted-foreground">
                Create your first list to start organizing tasks.
              </p>
              <Button 
                onClick={() => setCreateListDialogOpen(true)} 
                size="sm" 
                className="gap-2"
                style={{ backgroundColor: PROJECTS_HIGHLIGHT_COLOR }}
              >
                <Plus className="w-4 h-4" />
                Add List
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 p-4 h-full">
            <SortableContext items={lists.map(list => list.id)} strategy={horizontalListSortingStrategy}>
              {lists.map((list) => {
                const listTasks = tasks.filter(task => task.parsedContent.list_id === list.id)
                return (
                  <KanbanList
                    key={list.id}
                    list={list}
                    tasks={listTasks}
                    onTaskCreate={handleTaskCreate}
                    onTaskUpdate={handleTaskUpdate}
                    onTaskClick={handleTaskClick}
                    onListUpdate={handleListUpdate}
                  />
                )
              })}
            </SortableContext>
            
            {/* Add List Button as Next Column */}
            <div className="w-80 flex-shrink-0">
              <Dialog open={createListDialogOpen} onOpenChange={setCreateListDialogOpen}>
                <DialogTrigger asChild>
                  <div 
                    className="h-full min-h-[200px] border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors hover:bg-muted/50"
                    style={{ borderColor: PROJECTS_HIGHLIGHT_COLOR + '40' }}
                  >
                    <div className="text-center space-y-2">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center mx-auto"
                        style={{ backgroundColor: PROJECTS_HIGHLIGHT_COLOR + '20' }}
                      >
                        <Plus 
                          className="w-5 h-5" 
                          style={{ color: PROJECTS_HIGHLIGHT_COLOR }}
                        />
                      </div>
                      <div 
                        className="font-medium"
                        style={{ color: PROJECTS_HIGHLIGHT_COLOR }}
                      >
                        Add List
                      </div>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[50%] max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New List</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="list-title">List Name</Label>
                      <Input
                        id="list-title"
                        placeholder="Enter list name..."
                        value={createListFormData.title}
                        onChange={(e) => setCreateListFormData(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="list-type">List Type</Label>
                      <Select 
                        value={createListFormData.list_type} 
                        onValueChange={(value) => setCreateListFormData(prev => ({ ...prev, list_type: value as 'todo' | 'in_progress' | 'review' | 'done' | 'custom' }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="list-color">Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="list-color"
                          value={createListFormData.color}
                          onChange={(e) => setCreateListFormData(prev => ({ ...prev, color: e.target.value }))}
                          className="w-8 h-8 rounded border"
                        />
                        <span className="text-sm text-muted-foreground">{createListFormData.color}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCreateListDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateList}
                      disabled={!createListFormData.title.trim()}
                      style={{ backgroundColor: PROJECTS_HIGHLIGHT_COLOR }}
                    >
                      Create List
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
        
        {/* Drag Overlays for visual feedback */}
        <DragOverlay>
          {activeList ? (
            <div className="w-80 opacity-90">
              <div 
                className="bg-card border rounded-lg p-4 shadow-lg"
                style={{ backgroundColor: activeList.parsedContent.color || '#f3f4f6' }}
              >
                <h3 className="font-medium text-sm">{activeList.title}</h3>
              </div>
            </div>
          ) : activeTask ? (
            <div className="w-72 opacity-90">
              <TaskCard
                task={activeTask}
                onUpdate={() => {}}
                onTaskClick={() => {}}
                isDragOverlay={true}
              />
            </div>
          ) : null}
        </DragOverlay>
      </div>
      
      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTask}
        isOpen={taskDetailsOpen}
        onClose={() => {
          setTaskDetailsOpen(false)
          setSelectedTask(null)
        }}
        onUpdate={handleTaskUpdate}
        onCreateSubtask={handleCreateSubtask}
        subtasks={selectedTask ? getSubtasks(selectedTask.id) : []}
        onSubtaskClick={handleSubtaskClick}
      />
    </DndContext>
  )
} 