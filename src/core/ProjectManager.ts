import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { 
  ProjectConfig, 
  PreviewStatus, 
  FrameworkType,
  ProjectCreationResult 
} from '../types/ProjectTypes';
import { ProcessMonitor } from '../types/ProcessTypes';
import { PortManager } from './PortManager';
import { ProcessManager } from './ProcessManager';
import { ConfigManager } from './ConfigManager';

/**
 * Manages project lifecycle and coordinates between core components
 */
export class ProjectManager {
  private outputChannel: vscode.OutputChannel;
  private portManager: PortManager;
  private processManager: ProcessManager;
  private configManager: ConfigManager;
  private currentProject: ProjectConfig | null = null;
  private currentStatus: PreviewStatus = {
    isRunning: false,
    isStarting: false,
    port: null,
    url: null,
    process: null,
    framework: 'generic',
    projectName: 'Unknown'
  };

  constructor(
    outputChannel: vscode.OutputChannel,
    portManager: PortManager,
    processManager: ProcessManager,
    configManager: ConfigManager
  ) {
    this.outputChannel = outputChannel;
    this.portManager = portManager;
    this.processManager = processManager;
    this.configManager = configManager;
  }

  /**
   * Initialize the project manager
   */
  async initialize(): Promise<void> {
    this.outputChannel.appendLine('🚀 Initializing ProjectManager...');
    
    try {
      // Try to detect existing project configuration
      if (vscode.workspace.workspaceFolders?.[0]) {
        this.outputChannel.appendLine('🔍 Detecting existing project configuration...');
        this.currentProject = await this.detectProjectConfig();
        this.outputChannel.appendLine(`✅ Project detected: ${this.currentProject.framework} on port ${this.currentProject.port}`);
        
        // Update status
        this.currentStatus.framework = this.currentProject.framework;
        this.currentStatus.projectName = vscode.workspace.workspaceFolders[0].name;
      }
    } catch (error) {
      this.outputChannel.appendLine(`ℹ️ No existing project detected: ${error}`);
    }
    
    this.outputChannel.appendLine('✅ ProjectManager initialization complete');
  }

  /**
   * Start preview for the current project
   */
  async startPreview(): Promise<void> {
    try {
      if (this.currentStatus.isRunning || this.currentStatus.isStarting) {
        this.outputChannel.appendLine('⚠️ Preview already running or starting');
        return;
      }

      if (!this.currentProject) {
        throw new Error('No project configuration available');
      }

      this.currentStatus.isStarting = true;
      this.updateStatusBar();

      this.outputChannel.appendLine('🚀 Starting preview...');

      // Start the project using ProcessManager
      const processMonitor = await this.processManager.startProject(this.currentProject);
      
      // Update status
      this.currentStatus.isRunning = true;
      this.currentStatus.isStarting = false;
      this.currentStatus.port = processMonitor.process.pid ? this.currentProject.port : null;
      this.currentStatus.url = this.currentStatus.port ? `http://localhost:${this.currentStatus.port}` : null;
      this.currentStatus.process = processMonitor.process;

      // Update context key for command palette
      vscode.commands.executeCommand('setContext', 'preview.isRunning', true);
      
      this.updateStatusBar();
      this.openPreview();

      this.outputChannel.appendLine(`✅ Preview server ready on ${this.currentStatus.url}`);

    } catch (error) {
      this.outputChannel.appendLine(`❌ Error starting preview: ${error}`);
      vscode.window.showErrorMessage(`Failed to start preview: ${error}`);
      
      this.currentStatus.isStarting = false;
      this.updateStatusBar();
    }
  }

  /**
   * Stop the current preview
   */
  async stopPreview(): Promise<void> {
    try {
      if (!this.currentStatus.isRunning) {
        this.outputChannel.appendLine('⚠️ No preview running');
        return;
      }

      this.outputChannel.appendLine('🛑 Stopping preview...');

      if (this.currentStatus.port) {
        await this.processManager.stopProject(this.currentStatus.port);
      }

      // Reset status
      this.currentStatus.isRunning = false;
      this.currentStatus.isStarting = false;
      this.currentStatus.port = null;
      this.currentStatus.url = null;
      this.currentStatus.process = null;

      // Update context key for command palette
      vscode.commands.executeCommand('setContext', 'preview.isRunning', false);
      
      this.updateStatusBar();
      this.outputChannel.appendLine('Preview server stopped');

    } catch (error) {
      this.outputChannel.appendLine(`❌ Error stopping preview: ${error}`);
      vscode.window.showErrorMessage(`Failed to stop preview: ${error}`);
    }
  }

  /**
   * Restart the current preview
   */
  async restartPreview(): Promise<void> {
    this.outputChannel.appendLine('🔄 Restarting preview...');
    await this.stopPreview();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
    await this.startPreview();
  }

  /**
   * Check if there's an active project
   */
  hasActiveProject(): boolean {
    return this.currentProject !== null;
  }

  /**
   * Get current project configuration
   */
  getCurrentProject(): ProjectConfig | null {
    return this.currentProject;
  }

  /**
   * Get current preview status
   */
  getCurrentStatus(): PreviewStatus {
    return { ...this.currentStatus };
  }

  /**
   * Detect project configuration from workspace
   */
  private async detectProjectConfig(): Promise<ProjectConfig> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error('No workspace folder found');
    }

    const packageJsonPath = path.join(workspaceRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('No package.json found in workspace');
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const scripts = packageJson.scripts || {};

    // Determine framework
    const framework = this.detectFramework(packageJson);
    
    // Determine script to run
    const script = this.determineScript(scripts, framework);
    
    // Determine package manager
    const packageManager = this.detectPackageManager(workspaceRoot);
    
    // Determine default port
    const port = this.determineDefaultPort(framework);

    return {
      framework,
      port,
      script,
      packageManager,
      workspacePath: workspaceRoot
    };
  }

  /**
   * Detect framework from package.json
   */
  private detectFramework(packageJson: any): FrameworkType {
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Check for fullstack projects first
    if (this.isFullstackProject(packageJson)) {
      return 'fullstack';
    }
    
    // Check for specific frameworks
    if (dependencies.next) return 'next';
    if (dependencies.vite) return 'vite';
    if (dependencies.gatsby) return 'gatsby';
    if (dependencies.astro) return 'astro';
    if (dependencies['@remix-run/react']) return 'remix';
    
    return 'generic';
  }

  /**
   * Check if project is fullstack
   */
  private isFullstackProject(packageJson: any): boolean {
    const scripts = packageJson.scripts || {};
    return scripts.dev && scripts['dev:backend'] && scripts['dev:frontend'];
  }

  /**
   * Determine which script to run
   */
  private determineScript(scripts: any, framework: FrameworkType): string {
    // Check for framework-specific scripts first
    switch (framework) {
      case 'next':
        return scripts.dev || scripts.start || 'dev';
      case 'vite':
        return scripts.dev || 'dev';
      case 'gatsby':
        return scripts.develop || 'develop';
      case 'astro':
        return scripts.dev || 'dev';
      case 'remix':
        return scripts.dev || 'dev';
      case 'fullstack':
        return scripts.dev || 'dev';
      default:
        return scripts.dev || scripts.start || 'dev';
    }
  }

  /**
   * Detect package manager from workspace
   */
  private detectPackageManager(workspaceRoot: string): string {
    if (fs.existsSync(path.join(workspaceRoot, 'yarn.lock'))) return 'yarn';
    if (fs.existsSync(path.join(workspaceRoot, 'pnpm-lock.yaml'))) return 'pnpm';
    return 'npm';
  }

  /**
   * Determine default port for framework
   */
  private determineDefaultPort(framework: FrameworkType): number {
    const frameworkConfig = this.configManager.getFrameworkConfig(framework);
    return frameworkConfig?.defaultPort || 3000;
  }

  /**
   * Update status bar
   */
  private updateStatusBar(): void {
    // This will be implemented when we refactor the UI components
    // For now, we'll just log the status
    this.outputChannel.appendLine(`📊 Status updated: ${JSON.stringify(this.currentStatus, null, 2)}`);
  }

  /**
   * Open preview in browser
   */
  private async openPreview(): Promise<void> {
    if (!this.currentStatus.url) return;

    const extConfig = this.configManager.getExtensionConfig();
    const browserMode = extConfig.browserMode;

    this.outputChannel.appendLine(`🌐 Opening preview in ${browserMode} mode: ${this.currentStatus.url}`);

    if (browserMode === 'in-editor') {
      try {
        // Try to open in Simple Browser first
        await vscode.commands.executeCommand('simpleBrowser.show', this.currentStatus.url);
        this.outputChannel.appendLine('✅ Preview opened in Simple Browser');
      } catch (error) {
        this.outputChannel.appendLine(`⚠️ Simple Browser failed: ${error}`);
        this.outputChannel.appendLine('🔄 Falling back to external browser...');
        
        // Fallback to external browser
        try {
          await vscode.env.openExternal(vscode.Uri.parse(this.currentStatus.url));
          this.outputChannel.appendLine('✅ Preview opened in external browser');
        } catch (externalError) {
          this.outputChannel.appendLine(`❌ External browser also failed: ${externalError}`);
          vscode.window.showErrorMessage(`Failed to open preview. Please manually navigate to: ${this.currentStatus.url}`);
        }
      }
    } else {
      // Open in external browser
      try {
        await vscode.env.openExternal(vscode.Uri.parse(this.currentStatus.url));
        this.outputChannel.appendLine('✅ Preview opened in external browser');
      } catch (error) {
        this.outputChannel.appendLine(`❌ External browser failed: ${error}`);
        vscode.window.showErrorMessage(`Failed to open preview. Please manually navigate to: ${this.currentStatus.url}`);
      }
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.outputChannel.appendLine('🧹 Cleaning up ProjectManager...');
    
    // Stop any running previews
    if (this.currentStatus.isRunning) {
      this.stopPreview().catch(error => {
        this.outputChannel.appendLine(`⚠️ Error stopping preview during cleanup: ${error}`);
      });
    }
    
    // Clear references
    this.currentProject = null;
    this.currentStatus = {
      isRunning: false,
      isStarting: false,
      port: null,
      url: null,
      process: null,
      framework: 'generic',
      projectName: 'Unknown'
    };
  }
}
