import * as vscode from 'vscode';
import { TemplatePanel } from './TemplatePanel';
import { ProjectControlPanel, ProjectStatus } from './ProjectControlPanel';

export class UIManager {
  private static instance: UIManager;
  private templatePanel: TemplatePanel;
  private projectControlPanel: ProjectControlPanel;
  private currentProjectStatus: ProjectStatus | null = null;

  private constructor() {
    this.templatePanel = TemplatePanel.getInstance();
    this.projectControlPanel = ProjectControlPanel.getInstance();
    
    // Initialize the context key to false (no project running)
    vscode.commands.executeCommand('setContext', 'preview.isRunning', false);
  }

  public static getInstance(): UIManager {
    if (!UIManager.instance) {
      UIManager.instance = new UIManager();
    }
    return UIManager.instance;
  }

  /**
   * Show the appropriate UI based on current project state
   */
  public showAppropriateUI(): void {
    // Activate the preview sidebar container to show our webview views
    // The when clauses in package.json will automatically show the right view
    vscode.commands.executeCommand('workbench.view.extension.preview');
  }

  /**
   * Show template selection panel (for blank workspace)
   */
  public showTemplateSelection(): void {
    // Activate the preview sidebar container to show templates
    vscode.commands.executeCommand('workbench.view.extension.preview');
  }

  /**
   * Show project control panel (for active project)
   */
  public showProjectControl(): void {
    // Activate the preview sidebar container to show project control
    vscode.commands.executeCommand('workbench.view.extension.preview');
  }

  /**
   * Update project status and refresh UI
   */
  public updateProjectStatus(status: ProjectStatus): void {
    this.currentProjectStatus = status;
    this.projectControlPanel.updateStatus(status);
    
    // Set the context key that controls which view is shown
    vscode.commands.executeCommand('setContext', 'preview.isRunning', status.isRunning);
  }

  /**
   * Check if there's an active project
   */
  private hasActiveProject(): boolean {
    // This will be enhanced to check actual project state
    return this.currentProjectStatus?.isRunning || false;
  }

  /**
   * Get current project status
   */
  public getCurrentProjectStatus(): ProjectStatus | null {
    return this.currentProjectStatus;
  }

  /**
   * Reset project status (when project is stopped)
   */
  public resetProjectStatus(): void {
    this.currentProjectStatus = null;
    this.projectControlPanel.updateStatus({
      isRunning: false,
      port: null,
      url: null,
      framework: '',
      projectName: ''
    });
    
    // Set the context key to false when project is stopped
    vscode.commands.executeCommand('setContext', 'preview.isRunning', false);
  }
}
