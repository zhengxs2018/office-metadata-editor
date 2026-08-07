export interface Workspace {
  id: string;
  name: string;
  directories: string[];
  activeTemplateId?: string;
  lastOpenedAt: number;
}

export interface AppState {
  currentView: 'workspace' | 'editor' | 'templates' | 'batch' | 'export' | 'settings';
  workspaces: Workspace[];
  activeWorkspaceId?: string;
  darkMode: boolean;
  mcpEnabled: boolean;
  language: 'zh-CN' | 'en-US';
}
