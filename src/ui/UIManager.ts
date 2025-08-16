import * as vscode from 'vscode';
import { TemplatePanel } from './TemplatePanel';
import { ProjectControlPanel } from './ProjectControlPanel';

export class UIManager {
  private static instance: UIManager;
  private templatePanel: TemplatePanel;
  private currentProjectStatus: any = null;

  private constructor() {
    this.templatePanel = TemplatePanel.getInstance();
    
    // Initialize the context key to false (no project running)
    vscode.commands.executeCommand('setContext', 'preview.isRunning', false);
    vscode.commands.executeCommand('setContext', 'preview.hasProject', false);
    
    // Listen for workspace changes to automatically update UI
    this.setupWorkspaceChangeListener();
    
    // Immediately detect workspace state and set context keys
    this.detectWorkspaceState();
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
    // First, detect the current workspace state
    this.detectWorkspaceState();
    
    // Activate the preview sidebar container to show our webview views
    // The when clauses in package.json will automatically show the right view
    vscode.commands.executeCommand('workbench.view.extension.preview');
  }

  /**
   * Detect if workspace has an existing project or is empty
   */
  private detectWorkspaceState(): void {
    console.log('UIManager: detectWorkspaceState called');
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      console.log('UIManager: No workspace folders found, setting template view');
      // No workspace - show templates
      this.setTemplateView();
      return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    console.log('UIManager: Workspace root:', workspaceRoot);
    
    // Check for common project indicators
    const hasProject = this.checkForExistingProject(workspaceRoot);
    console.log('UIManager: Has project:', hasProject);
    
    if (hasProject) {
      console.log('UIManager: Setting project control view');
      // Workspace has a project - show project control
      this.setProjectControlView();
    } else {
      console.log('UIManager: Setting template view');
      // Empty workspace - show templates
      this.setTemplateView();
    }
  }

  /**
   * Check if workspace contains an existing project
   */
  private checkForExistingProject(workspaceRoot: string): boolean {
    try {
      console.log('UIManager: Checking for existing project in:', workspaceRoot);
      
      // Check for package.json (Node.js projects)
      const packageJsonPath = require('path').join(workspaceRoot, 'package.json');
      console.log('UIManager: Checking for package.json at:', packageJsonPath);
      if (require('fs').existsSync(packageJsonPath)) {
        console.log('UIManager: Found package.json, project exists');
        return true;
      }

      // Check for other project indicators
      const files = require('fs').readdirSync(workspaceRoot);
      const projectIndicators = [
        'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
        'composer.json', 'requirements.txt', 'Cargo.toml', 'pom.xml',
        'build.gradle', 'Makefile', 'Dockerfile', '.gitignore',
        'src/', 'app/', 'lib/', 'bin/', 'dist/', 'build/'
      ];

      return files.some((file: string) => 
        projectIndicators.some(indicator => 
          file === indicator || file.startsWith(indicator.replace('/', ''))
        )
      );
    } catch (error) {
      console.log('UIManager: Error checking workspace state:', error);
      return false;
    }
  }

  /**
   * Set the UI to show templates (empty workspace)
   */
  private setTemplateView(): void {
    console.log('UIManager: Setting template view (empty workspace)');
    vscode.commands.executeCommand('setContext', 'preview.isRunning', false);
    vscode.commands.executeCommand('setContext', 'preview.hasProject', false);
    console.log('UIManager: Context keys set - preview.isRunning: false, preview.hasProject: false');
  }

  /**
   * Set the UI to show project control (existing project)
   */
  private setProjectControlView(): void {
    console.log('UIManager: Setting project control view (existing project)');
    vscode.commands.executeCommand('setContext', 'preview.isRunning', true);
    vscode.commands.executeCommand('setContext', 'preview.hasProject', true);
    console.log('UIManager: Context keys set - preview.isRunning: true, preview.hasProject: true');
  }

  /**
   * Setup listener for workspace changes
   */
  private setupWorkspaceChangeListener(): void {
    // Listen for workspace folder changes
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      console.log('UIManager: Workspace folders changed, updating UI');
      this.detectWorkspaceState();
    });

    // Listen for file system changes in the workspace
    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*');
    fileSystemWatcher.onDidCreate(() => {
      console.log('UIManager: File created, checking if project state changed');
      this.detectWorkspaceState();
    });
    fileSystemWatcher.onDidDelete(() => {
      console.log('UIManager: File deleted, checking if project state changed');
      this.detectWorkspaceState();
    });
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
    // Create and show the project control panel
    const extensionUri = vscode.extensions.getExtension('H10B.pistachio-vibe')?.extensionUri;
    if (extensionUri) {
      ProjectControlPanel.createOrShow(extensionUri);
    } else {
      vscode.window.showErrorMessage('Failed to get extension URI');
    }
  }

  /**
   * Update project status and refresh UI
   */
  public updateProjectStatus(status: any): void {
    this.currentProjectStatus = status;
    
    // Set the context key that controls which view is shown
    vscode.commands.executeCommand('setContext', 'preview.isRunning', status.isRunning);
    
    // Send status update to Project Control Panel if it exists
    if (ProjectControlPanel.currentView) {
      ProjectControlPanel.currentView.updateStatus({
        isRunning: status.isRunning,
        port: status.port,
        url: status.url,
        framework: status.framework,
        projectName: status.projectName
      });
    }
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
  public getCurrentProjectStatus(): any {
    return this.currentProjectStatus;
  }

  /**
   * Reset project status (when project is stopped)
   */
  public resetProjectStatus(): void {
    this.currentProjectStatus = null;
    
    // Set the context key to false when project is stopped
    vscode.commands.executeCommand('setContext', 'preview.isRunning', false);
  }
}
