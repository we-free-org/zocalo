// Main entry point for the Projects app
export { ProjectsMain as default } from './components/ProjectsMain'
export { ProjectsMain } from './components/ProjectsMain'

// Export all types
export * from './types'

// Export all schema helpers
export * from './schemas'

// App configuration (for future app registry)
export const projectsAppConfig = {
  id: 'projects',
  name: 'Projects & Tasks',
  description: 'Kanban-style project management with tasks',
  version: '1.0.0',
  category: 'marketplace',
  
  // Entity schemas this app provides
  schemas: [
    {
      type: 'project',
      name: 'Project',
      description: 'Project container for organizing tasks'
    },
    {
      type: 'project_list', 
      name: 'Project List',
      description: 'Kanban columns for organizing tasks'
    },
    {
      type: 'project_task',
      name: 'Project Task', 
      description: 'Individual tasks that can be organized in lists'
    }
  ],
  
  // Navigation entries
  navigation: [
    {
      id: 'projects',
      label: 'Projects',
      icon: 'FolderKanban',
      path: '/dashboard/app/projects'
    }
  ],
  
  // Dependencies on shared components
  dependencies: [
    'comments', // Uses shared comments component
    'activity'  // Logs to shared activity system
  ],
  
  // Permissions required
  permissions: [
    'entities.create',
    'entities.read', 
    'entities.update',
    'entities.delete'
  ]
} 