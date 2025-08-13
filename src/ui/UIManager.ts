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
    if (this.hasActiveProject()) {
      this.showProjectControl();
    } else {
      this.showTemplateSelection();
    }
  }

  /**
   * Show template selection panel (for blank workspace)
   */
  public showTemplateSelection(): void {
    this.templatePanel.show();
  }

  /**
   * Show project control panel (for active project)
   */
  public showProjectControl(): void {
    this.projectControlPanel.show();
  }

  /**
   * Update project status and refresh UI
   */
  public updateProjectStatus(status: ProjectStatus): void {
    this.currentProjectStatus = status;
    this.projectControlPanel.updateStatus(status);
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
  }
}
