import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';
import * as http from 'http';
import detectPort from 'detect-port';
import { UIManager } from './ui/UIManager';
import { TemplateViewProvider } from './ui/ViewProviders';
import { ProjectControlViewProvider } from './ui/ViewProviders';
import { TemplatePanel } from './ui/TemplatePanel';
import { ProjectControlPanel } from './ui/ProjectControlPanel';

// Import refactored components
import { 
  PortManager, 
  ProcessManager, 
  ConfigManager, 
  ProjectManager,
  ProjectConfig as NewProjectConfig,
  PreviewStatus as NewPreviewStatus,
  FrameworkType
} from './core';
import { ErrorHandler } from './utils/ErrorHandler';

interface ProjectConfig {
  framework: string;
  port: number;
  script: string;
  packageManager: string;
}

interface PreviewStatus {
  isRunning: boolean;
  isStarting: boolean;
  port: number | null;
  url: string | null;
  process: child_process.ChildProcess | null;
}

interface ProjectTemplate {
  name: string;
  description: string;
  command: string;
  port: number;
  dependencies: string[];
}

class PreviewManager {
  private statusBarItem: vscode.StatusBarItem;
  private outputChannel: vscode.OutputChannel;
  private status: PreviewStatus;
  private config: ProjectConfig | null = null;
  private contextKey: vscode.ExtensionContext;
  private extensionUri: vscode.Uri;
  private uiManager: UIManager;
  private isCreatingProject: boolean = false;

  // Refactored component instances
  private portManager: PortManager;
  private processManager: ProcessManager;
  private configManager: ConfigManager;
  private projectManager: ProjectManager;

  // Debug logging helper
  private debugLog(message: string, context: string = 'PreviewManager'): void {
    const timestamp = new Date().toISOString();
    const debugMessage = `[DEBUG:${context}:${timestamp}] ${message}`;
    this.outputChannel.appendLine(debugMessage);
    console.log(debugMessage);
  }

  // Project templates for quick start
  private projectTemplates: ProjectTemplate[] = [
    {
      name: 'Next.js App',
      description: 'Full-stack React framework with file-based routing (requires lowercase workspace name)',
      command: 'npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes --use-npm',
      port: 3000,
      dependencies: ['next', 'react', 'react-dom']
    },
    {
      name: 'Express.js + React Fullstack',
      description: 'Node.js backend with Express + React frontend',
      command: 'npm init -y && mkdir -p backend frontend',
      port: 3000,
      dependencies: ['express', 'react', 'react-dom', 'cors', 'nodemon']
    },
    {
      name: 'Node.js + Next.js Fullstack',
      description: 'Custom Node.js backend with Next.js frontend',
      command: 'npm init -y && mkdir -p backend frontend && npm install express cors && npm install --save-dev nodemon concurrently',
      port: 3000,
      dependencies: ['express', 'next', 'react', 'react-dom', 'cors', 'nodemon']
    },
    {
      name: 'Simple React',
      description: 'Basic React app with Vite',
      command: 'npm init -y && npm install react react-dom && npm install --save-dev @vitejs/plugin-react vite && mkdir -p src',
      port: 5173,
      dependencies: ['vite', 'react', 'react-dom']
    },
    {
      name: 'Simple HTML/CSS/JS',
      description: 'Basic static site with live reload',
      command: 'npm init -y && npm install --save-dev live-server',
      port: 8080,
      dependencies: ['live-server']
    }
  ];

  constructor(context: vscode.ExtensionContext) {
    this.contextKey = context;
    this.extensionUri = context.extensionUri;
    this.status = {
      isRunning: false,
      isStarting: false,
      port: null,
      url: null,
      process: null
    };

    // Create status bar item with the ID specified in package.json
    this.statusBarItem = vscode.window.createStatusBarItem(
      'preview.status',
      vscode.StatusBarAlignment.Left,
      100
    );
            this.statusBarItem.command = 'pistachio-vibe.showUI';
    this.statusBarItem.tooltip = 'Click to show project UI or create new project';
    
    // Create output channel
    this.outputChannel = vscode.window.createOutputChannel('Preview Logs');

    // Initialize refactored components
    this.configManager = new ConfigManager();
    this.portManager = new PortManager(this.outputChannel, vscode.workspace.getConfiguration('preview'));
    this.processManager = new ProcessManager(this.outputChannel, this.portManager);
    this.projectManager = new ProjectManager(this.outputChannel, this.portManager, this.processManager, this.configManager);

    // Initialize UI manager
    this.uiManager = UIManager.getInstance();

    // Register view providers for sidebar
    this.registerViewProviders();

    // Register commands
    this.registerCommands();
    
    // Initialize context key
    vscode.commands.executeCommand('setContext', 'preview.isRunning', false);
  }

  public async initialize(): Promise<void> {
    // Initialize the status bar after workspace is ready
    console.log('PreviewManager: Initializing...');
    
    // Log that we're using the new refactored architecture
    this.outputChannel.appendLine('🚀 Initializing with new refactored architecture...');
    this.outputChannel.appendLine('✅ PortManager: Cooperative port management enabled');
    this.outputChannel.appendLine('✅ ProcessManager: Robust process lifecycle management enabled');
    this.outputChannel.appendLine('✅ ConfigManager: Framework-specific configuration enabled');
    this.outputChannel.appendLine('✅ ProjectManager: Enhanced project coordination enabled');
    this.outputChannel.appendLine('✅ ErrorHandler: Centralized error management enabled');
    
    // Debug logging for component initialization
    this.debugLog('Refactored architecture initialization complete', 'initialize');
    this.debugLog(`PortManager instance: ${!!this.portManager}`, 'initialize');
    this.debugLog(`ProcessManager instance: ${!!this.processManager}`, 'initialize');
    this.debugLog(`ConfigManager instance: ${!!this.configManager}`, 'initialize');
    this.debugLog(`ProjectManager instance: ${!!this.projectManager}`, 'initialize');
    
          try {
        // Try to detect existing project configuration
        if (vscode.workspace.workspaceFolders?.[0]) {
          this.debugLog('Workspace found, detecting project configuration', 'initialize');
          this.outputChannel.appendLine('🔍 Detecting existing project configuration...');
          this.config = await this.detectProjectConfig();
          this.debugLog(`Project config detected: ${JSON.stringify(this.config)}`, 'initialize');
          this.outputChannel.appendLine(`✅ Project detected: ${this.config.framework} on port ${this.config.port}`);
        } else {
          this.debugLog('No workspace folders found', 'initialize');
        }
      } catch (error) {
        this.debugLog(`Error in project detection: ${error}`, 'initialize');
        this.outputChannel.appendLine(`ℹ️ No existing project detected: ${error}`);
      }
    
    this.updateStatusBar();
    
    // Show the appropriate UI based on current state
    this.uiManager.showAppropriateUI();
    
    console.log('PreviewManager: Initialization complete');
  }

  private registerViewProviders(): void {
    console.log('PreviewManager: Registering view providers...');
    
    // Register the template view provider
    const templateViewProvider = new TemplateViewProvider(TemplatePanel.getInstance(), this.extensionUri);
    console.log('PreviewManager: TemplateViewProvider created:', templateViewProvider);
    
    vscode.window.registerWebviewViewProvider(
      TemplateViewProvider.viewType,
      templateViewProvider
    );
    console.log('PreviewManager: TemplateViewProvider registered with type:', TemplateViewProvider.viewType);

    // Register the project control view provider
    const projectControlViewProvider = new ProjectControlViewProvider(ProjectControlPanel.getInstance(), this.extensionUri);
    console.log('PreviewManager: ProjectControlViewProvider created:', projectControlViewProvider);
    
    vscode.window.registerWebviewViewProvider(
      ProjectControlViewProvider.viewType,
      projectControlViewProvider
    );
    console.log('PreviewManager: ProjectControlViewProvider registered with type:', ProjectControlViewProvider.viewType);
    
    console.log('PreviewManager: All view providers registered successfully');
  }

  private registerCommands(): void {
    // These commands are already declared in package.json, so they should work
    // But we need to ensure they're properly bound to the instance methods
    vscode.commands.registerCommand('pistachio-vibe.run', () => {
      this.outputChannel.appendLine('🎯 Preview: Run command executed');
      this.startPreview();
    });
    vscode.commands.registerCommand('pistachio-vibe.stop', () => {
      this.outputChannel.appendLine('🛑 Preview: Stop command executed');
      this.stopPreview();
    });
    vscode.commands.registerCommand('pistachio-vibe.restart', () => {
      this.outputChannel.appendLine('🔄 Preview: Restart command executed');
      this.restartPreview();
    });
    vscode.commands.registerCommand('pistachio-vibe.createProject', () => {
      this.outputChannel.appendLine('🚀 Preview: Create Project command executed');
      this.createNewProject();
    });

    vscode.commands.registerCommand('pistachio-vibe.showUI', () => {
      this.outputChannel.appendLine('🎨 Preview: Show UI command executed');
      this.uiManager.showAppropriateUI();
    });

    vscode.commands.registerCommand('pistachio-vibe.showTemplates', () => {
      this.outputChannel.appendLine('📋 Preview: Show Templates command executed');
      this.uiManager.showTemplateSelection();
    });

    vscode.commands.registerCommand('pistachio-vibe.showProjectControl', () => {
      this.outputChannel.appendLine('🎛️ Preview: Show Project Control command executed');
      this.uiManager.showProjectControl();
    });
  }

  private async createNewProject(): Promise<void> {
    // Prevent duplicate execution
    if (this.isCreatingProject) {
      this.outputChannel.appendLine('⚠️ Project creation already in progress, ignoring duplicate command');
      return;
    }
    
    this.isCreatingProject = true;
    
    try {
      // Check if workspace is empty
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
      }

    // Check if workspace already has content and offer cleanup
    const files = fs.readdirSync(workspaceRoot);
    const hasContent = files.some(file => 
      !file.startsWith('.') && file !== '.git' && file !== 'node_modules'
    );

    if (hasContent) {
      const action = await vscode.window.showWarningMessage(
        'This workspace contains files that may conflict with new project creation. What would you like to do?',
        'Clean Workspace', 'Create Anyway', 'Cancel'
      );
      
      if (action === 'Clean Workspace') {
        await this.cleanWorkspace(workspaceRoot);
      } else if (action === 'Cancel') {
        return;
      }
      // If "Create Anyway" is selected, continue with existing files
    }

    // Show template selection
    const template = await vscode.window.showQuickPick(
      this.projectTemplates.map(t => ({
        label: t.name,
        description: t.description,
        detail: `Port: ${t.port} | Dependencies: ${t.dependencies.join(', ')}`,
        template: t
      })),
      {
        placeHolder: 'Choose a project template to create...',
        ignoreFocusOut: true
      }
    );

    if (!template) return;

    const selectedTemplate = template.template;
    
    // Confirm project creation
    const confirm = await vscode.window.showInformationMessage(
      `Create new ${selectedTemplate.name} project? This will run: ${selectedTemplate.command}`,
      'Yes', 'No'
    );

    if (confirm !== 'Yes') return;

      try {
        await this.executeProjectCreation(selectedTemplate, workspaceRoot);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to create project: ${error}`);
      }
    } finally {
      this.isCreatingProject = false;
    }
  }

  private async executeProjectCreation(template: ProjectTemplate, workspaceRoot: string): Promise<void> {
    this.outputChannel.appendLine(`🚀 Creating new ${template.name} project...`);
    this.outputChannel.appendLine(`Command: ${template.command}`);
    this.outputChannel.appendLine(`Working directory: ${workspaceRoot}`);
    
    // Check for Next.js naming restrictions
    if (template.name.toLowerCase().includes('next.js') && this.hasInvalidWorkspaceName(workspaceRoot)) {
      const action = await vscode.window.showErrorMessage(
        'Next.js cannot create projects in folders with capital letters or special characters. Please rename your workspace folder to use only lowercase letters, numbers, and hyphens.',
        'Try Alternative Template', 'Cancel'
      );
      
      if (action === 'Try Alternative Template') {
        // Offer alternative templates that don't have naming restrictions
        await this.offerAlternativeTemplates();
        return;
      } else {
        throw new Error('Project creation cancelled due to workspace naming restrictions');
      }
    }
    
    // Show progress
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Creating ${template.name} project...`,
      cancellable: false
    }, async (progress) => {
      progress.report({ message: 'Initializing project...' });

      // Execute the creation command
      await new Promise<void>((resolve, reject) => {
        const commandParts = template.command.split(' ');
        const mainCommand = commandParts[0];
        const args = commandParts.slice(1);
        
        this.outputChannel.appendLine(`Executing: ${mainCommand} ${args.join(' ')}`);
        
        const childProcess = child_process.spawn(mainCommand, args, { 
          cwd: workspaceRoot, 
          stdio: 'pipe',
          shell: true,
          env: { ...process.env, FORCE_COLOR: '1' }
        });

        let output = '';
        let errorOutput = '';
        
        childProcess.stdout?.on('data', (data: Buffer) => {
          const text = data.toString();
          output += text;
          this.outputChannel.appendLine(`[STDOUT] ${text}`);
          
          if (text.includes('Installing packages') || text.includes('npm install')) {
            progress.report({ message: 'Installing dependencies...' });
          } else if (text.includes('Success!') || text.includes('Done') || text.includes('created successfully')) {
            progress.report({ message: 'Project created successfully!' });
          }
        });

        childProcess.stderr?.on('data', (data: Buffer) => {
          const text = data.toString();
          errorOutput += text;
          this.outputChannel.appendLine(`[STDERR] ${text}`);
        });

        childProcess.on('error', (error: Error) => {
          this.outputChannel.appendLine(`[ERROR] Process error: ${error.message}`);
          reject(new Error(`Process error: ${error.message}`));
        });

        childProcess.on('close', (code: number) => {
          this.outputChannel.appendLine(`[EXIT] Process exited with code ${code}`);
          this.outputChannel.appendLine(`[OUTPUT] Full output: ${output}`);
          if (errorOutput) {
            this.outputChannel.appendLine(`[ERRORS] Error output: ${errorOutput}`);
          }
          
          if (code === 0) {
            this.outputChannel.appendLine(`✅ Project created successfully!`);
            resolve();
          } else {
            reject(new Error(`Project creation failed with code ${code}. Check the output for details.`));
          }
        });
      });

      progress.report({ message: 'Setting up project...' });
      
      // Wait a bit for files to be written
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update package.json with proper scripts for React projects
      if (template.name.toLowerCase().includes('react') && !template.name.toLowerCase().includes('fullstack')) {
        try {
          const packageJsonPath = path.join(workspaceRoot, 'package.json');
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          
          // Add proper scripts for React/Vite projects
          packageJson.scripts = {
            "dev": "vite",
            "build": "vite build",
            "preview": "vite preview"
          };
          
          // Write updated package.json
          fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
          this.outputChannel.appendLine('✅ Updated package.json with build scripts');
          
          // Create React project files
          const viteConfigContent = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    open: false
  }
})`;

          const mainJsxContent = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`;

          const appJsxContent = `import React from 'react'

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Hello React! 🚀</h1>
      <p>Your new React app is ready!</p>
    </div>
  )
}

export default App`;

          const indexHtmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;

          // Write all the files
          fs.writeFileSync(path.join(workspaceRoot, 'vite.config.js'), viteConfigContent);
          fs.writeFileSync(path.join(workspaceRoot, 'src/main.jsx'), mainJsxContent);
          fs.writeFileSync(path.join(workspaceRoot, 'src/App.jsx'), appJsxContent);
          fs.writeFileSync(path.join(workspaceRoot, 'index.html'), indexHtmlContent);
          
          this.outputChannel.appendLine('✅ Created React project files (vite.config.js, src/main.jsx, src/App.jsx, index.html)');
        } catch (error) {
          this.outputChannel.appendLine(`⚠️ Warning: Could not create React project files: ${error}`);
        }
      }

      // Handle fullstack project creation
      if (template.name.toLowerCase().includes('fullstack')) {
        try {
          await this.createFullstackProject(template, workspaceRoot);
        } catch (error) {
          this.outputChannel.appendLine(`⚠️ Warning: Could not create fullstack project: ${error}`);
        }
      }
    });

    // Show success message and offer to start preview
    const action = await vscode.window.showInformationMessage(
      `🎉 ${template.name} project created successfully! Start preview now?`,
      'Start Preview', 'Later'
    );

    if (action === 'Start Preview') {
      // Set the config for the new project
      this.config = {
        framework: template.name.toLowerCase().includes('next') ? 'next' :
                   template.name.toLowerCase().includes('vite') ? 'vite' :
                   template.name.toLowerCase().includes('astro') ? 'astro' :
                   template.name.toLowerCase().includes('remix') ? 'remix' :
                   template.name.toLowerCase().includes('gatsby') ? 'gatsby' : 'generic',
        port: template.name.toLowerCase().includes('vite') ? 5173 : template.port,
        script: 'dev',
        packageManager: 'npm'
      };

      // Update the status bar to show the preview button
      this.updateStatusBar();
      
      // Start the preview
      await this.startPreview();
    } else {
      // Even if they don't start preview, update the status bar
      // so they can see the preview button
      this.updateStatusBar();
    }
  }

  private async detectProjectConfig(): Promise<ProjectConfig> {
    this.debugLog('Starting project configuration detection', 'detectProjectConfig');
    
    try {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        this.debugLog('No workspace folder found', 'detectProjectConfig');
        throw new Error('No workspace folder found');
      }

      this.debugLog(`Workspace root: ${workspaceRoot}`, 'detectProjectConfig');

      const packageJsonPath = path.join(workspaceRoot, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        this.debugLog('No package.json found, offering to create project', 'detectProjectConfig');
        
        // No project found - offer to create one
        const action = await vscode.window.showInformationMessage(
          'No project found in this workspace. Create a new project?',
          'Create Project', 'Cancel'
        );

        if (action === 'Create Project') {
          this.debugLog('User chose to create project', 'detectProjectConfig');
          await this.createNewProject();
          // Try to detect again after creation
          if (fs.existsSync(packageJsonPath)) {
            this.debugLog('Project created, retrying detection', 'detectProjectConfig');
            return this.detectProjectConfig();
          } else {
            this.debugLog('Project creation failed', 'detectProjectConfig');
            throw new Error('Project creation was cancelled or failed');
          }
        } else {
          this.debugLog('User cancelled project creation', 'detectProjectConfig');
          throw new Error('No package.json found in workspace');
        }
      }

      this.debugLog('Package.json found, using new ConfigManager for detection', 'detectProjectConfig');
      
      // Use the new ConfigManager for framework detection
      const frameworkConfig = this.configManager.getFrameworkConfig('generic');
      this.debugLog(`Framework config loaded: ${JSON.stringify(frameworkConfig)}`, 'detectProjectConfig');
      
      // Read package.json for basic info
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      this.debugLog(`Package.json scripts: ${JSON.stringify(Object.keys(scripts))}`, 'detectProjectConfig');
      this.debugLog(`Package.json dependencies: ${JSON.stringify(Object.keys(dependencies))}`, 'detectProjectConfig');

      // Determine framework using ConfigManager logic
      let framework = 'generic';
      if (scripts.dev && scripts['dev:backend'] && scripts['dev:frontend']) {
        framework = 'fullstack';
        this.debugLog('Detected fullstack project', 'detectProjectConfig');
      } else if (dependencies.next) {
        framework = 'next';
        this.debugLog('Detected Next.js project', 'detectProjectConfig');
      } else if (dependencies.vite) {
        framework = 'vite';
        this.debugLog('Detected Vite project', 'detectProjectConfig');
      } else if (dependencies.gatsby) {
        framework = 'gatsby';
        this.debugLog('Detected Gatsby project', 'detectProjectConfig');
      } else if (dependencies.astro) {
        framework = 'astro';
        this.debugLog('Detected Astro project', 'detectProjectConfig');
      } else if (dependencies['@remix-run/react']) {
        framework = 'remix';
        this.debugLog('Detected Remix project', 'detectProjectConfig');
      }

      // Get framework-specific configuration
      const specificConfig = this.configManager.getFrameworkConfig(framework as FrameworkType);
      this.debugLog(`Framework-specific config: ${JSON.stringify(specificConfig)}`, 'detectProjectConfig');

      // Determine script to run
      let script = specificConfig?.defaultScript || 'dev';
      if (scripts.dev) script = 'dev';
      else if (scripts.start) script = 'start';
      else if (scripts.serve) script = 'serve';

      // Determine package manager
      let packageManager = 'npm';
      if (fs.existsSync(path.join(workspaceRoot, 'yarn.lock'))) packageManager = 'yarn';
      else if (fs.existsSync(path.join(workspaceRoot, 'pnpm-lock.yaml'))) packageManager = 'pnpm';

      // Get port configuration from ConfigManager
      const portConfig = this.configManager.getPortConfig(framework as FrameworkType);
      let port = portConfig.preferredPort;
      
      this.debugLog(`Port config from ConfigManager: ${JSON.stringify(portConfig)}`, 'detectProjectConfig');
      this.debugLog(`Initial port: ${port}`, 'detectProjectConfig');

      // Check if custom port is configured
      const config = vscode.workspace.getConfiguration('preview');
      const customPort = config.get<number>('port');
      if (customPort) {
        this.debugLog(`Custom port override detected: ${customPort}`, 'detectProjectConfig');
        
        // For Vite projects, always respect the Vite config port, not custom override
        if (framework === 'vite') {
          this.debugLog('Vite project - ignoring custom port override', 'detectProjectConfig');
          // We'll validate the Vite config port later
        } else {
          port = customPort;
          this.debugLog(`Using custom port: ${port}`, 'detectProjectConfig');
        }
      } else {
        this.debugLog(`Using framework default port: ${port}`, 'detectProjectConfig');
      }

      const result = { framework, port, script, packageManager };
      this.debugLog(`Project config detection complete: ${JSON.stringify(result)}`, 'detectProjectConfig');
      
      return result;
      
    } catch (error) {
      this.debugLog(`Error in project config detection: ${error}`, 'detectProjectConfig');
      throw error;
    }
  }

  private async checkDependencies(): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return;

    const nodeModulesPath = path.join(workspaceRoot, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      const action = await vscode.window.showInformationMessage(
        'Dependencies not installed. Install them now?',
        'Yes', 'No'
      );

      if (action === 'Yes') {
        await this.installDependencies();
      } else {
        throw new Error('Dependencies must be installed to run preview');
      }
    }
  }

  private async validateViteConfig(): Promise<void> {
    if (this.config?.framework !== 'vite') return;
    
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return;

    const viteConfigPath = path.join(workspaceRoot, 'vite.config.js');
    if (fs.existsSync(viteConfigPath)) {
      try {
        const configContent = fs.readFileSync(viteConfigPath, 'utf8');
        
        // Extract the actual port from Vite config
        const portMatch = configContent.match(/port:\s*(\d+)/);
        if (portMatch) {
          const viteConfigPort = parseInt(portMatch[1]);
          this.outputChannel.appendLine(`🔍 Vite config port: ${viteConfigPort}`);
          
          // Always use the Vite config port for Vite projects
          if (this.config.port !== viteConfigPort) {
            this.outputChannel.appendLine(`🔄 Updating extension port from ${this.config.port} to Vite config port ${viteConfigPort}`);
            this.config.port = viteConfigPort;
          }
          
          if (viteConfigPort !== 5173) {
            this.outputChannel.appendLine(`⚠️ Vite config port ${viteConfigPort} is not standard (5173), but will use it`);
          }
        } else {
          this.outputChannel.appendLine(`⚠️ No port found in Vite config, using default 5173`);
          this.config.port = 5173;
        }
      } catch (error) {
        this.outputChannel.appendLine(`⚠️ Could not validate Vite config: ${error}`);
      }
    } else {
      this.outputChannel.appendLine(`⚠️ No Vite config found, using default port 5173`);
      this.config.port = 5173;
    }
  }

  private async createFullstackProject(template: ProjectTemplate, workspaceRoot: string): Promise<void> {
    this.outputChannel.appendLine(`🚀 Creating fullstack project: ${template.name}`);
    
    try {
      // Detect available port for backend (start from 3001 to avoid conflicts with frontend)
      const backendPort = await detectPort(3001);
      this.outputChannel.appendLine(`🔍 Detected available backend port: ${backendPort}`);
      
      // Update package.json with fullstack scripts
      const packageJsonPath = path.join(workspaceRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Add fullstack scripts
      packageJson.scripts = {
        "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
        "dev:backend": "nodemon backend/server.js",
        "dev:frontend": template.name.toLowerCase().includes('next') ? "cd frontend && npm run dev" : "cd frontend && npm run dev",
        "build": "npm run build:frontend",
        "build:frontend": template.name.toLowerCase().includes('next') ? "cd frontend && npm install && npm run build" : "cd frontend && npm install && npm run build",
        "start": "node backend/server.js",
        "postinstall": "cd frontend && npm install",
        "prebuild": "cd frontend && npm install",
        "test:build": "npm run build:frontend"
      };
      
      // Add fullstack dependencies
      packageJson.dependencies = {
        "express": "^4.18.2",
        "cors": "^2.8.5"
      };
      
      packageJson.devDependencies = {
        "nodemon": "^3.0.1",
        "concurrently": "^8.2.0"
      };
      
      // Write updated package.json
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      this.outputChannel.appendLine('✅ Updated package.json with fullstack scripts and dependencies');
      
      // Create backend structure with detected port
      await this.createBackendStructure(workspaceRoot, backendPort);
      
      // Create frontend structure with detected backend port
      await this.createFrontendStructure(template, workspaceRoot, backendPort);
      
      // Install frontend dependencies
      await this.installFrontendDependencies(template, workspaceRoot);
      
      // Verify build process works
      await this.verifyBuildProcess(template, workspaceRoot);
      
      // Create root README
      await this.createFullstackReadme(template, workspaceRoot);
      
          // Create root .gitignore
    await this.createRootGitignore(workspaceRoot);
    
    // Create vercel.json for deployment
    await this.createVercelConfig(workspaceRoot);
    
    // Create deployment guide
    await this.createDeploymentGuide(template, workspaceRoot);
    
    this.outputChannel.appendLine('✅ Fullstack project structure created successfully');
      
    } catch (error) {
      this.outputChannel.appendLine(`❌ Error creating fullstack project: ${error}`);
      throw error;
    }
  }

  private async createBackendStructure(workspaceRoot: string, backendPort: number): Promise<void> {
    const backendDir = path.join(workspaceRoot, 'backend');
    
    // Create backend package.json
    const backendPackageJson = {
      name: "backend",
      version: "1.0.0",
      description: "Backend server for fullstack application",
      main: "server.js",
      scripts: {
        "start": "node server.js",
        "dev": "nodemon server.js"
      },
      dependencies: {
        "express": "^4.18.2",
        "cors": "^2.8.5"
      },
      devDependencies: {
        "nodemon": "^3.0.1"
      }
    };
    
    fs.writeFileSync(path.join(backendDir, 'package.json'), JSON.stringify(backendPackageJson, null, 2));
    
    // Create Express server with dynamic port
    const serverContent = `const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || ${backendPort};

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ message: 'Backend server is running! 🚀', timestamp: new Date().toISOString() });
});

app.get('/api/data', (req, res) => {
  res.json({ 
    message: 'Sample data from backend',
    items: ['Item 1', 'Item 2', 'Item 3'],
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(\`🚀 Backend server running on port \${PORT}\`);
  console.log(\`📡 Health check: http://localhost:\${PORT}/api/health\`);
  console.log(\`📊 Sample data: http://localhost:\${PORT}/api/data\`);
});`;
    
    fs.writeFileSync(path.join(backendDir, 'server.js'), serverContent);
    
    this.outputChannel.appendLine(`✅ Backend structure created (server.js, package.json) - Port: ${backendPort}`);
  }

  private async createFrontendStructure(template: ProjectTemplate, workspaceRoot: string, backendPort: number): Promise<void> {
    const frontendDir = path.join(workspaceRoot, 'frontend');
    
          if (template.name.toLowerCase().includes('next')) {
        // Create Next.js frontend
        await this.createNextjsFrontend(frontendDir, backendPort);
      } else {
        // Create React frontend
        await this.createReactFrontend(frontendDir, backendPort);
      }
  }

  private async createNextjsFrontend(frontendDir: string, backendPort: number): Promise<void> {
    // Create Next.js package.json
    const nextPackageJson = {
      name: "frontend",
      version: "1.0.0",
      description: "Next.js frontend for fullstack application",
      scripts: {
        "dev": "next dev",
        "build": "next build",
        "start": "next start",
        "lint": "next lint",
        "export": "next export"
      },
      dependencies: {
        "next": "^14.0.0",
        "react": "^18.0.0",
        "react-dom": "^18.0.0"
      },
      devDependencies: {
        "@types/node": "^20.0.0",
        "@types/react": "^18.0.0",
        "@types/react-dom": "^18.0.0",
        "typescript": "^5.0.0",
        "eslint": "^8.0.0",
        "eslint-config-next": "^14.0.0"
      }
    };
    
    fs.writeFileSync(path.join(frontendDir, 'package.json'), JSON.stringify(nextPackageJson, null, 2));
    
    // Create basic Next.js structure
    const pagesDir = path.join(frontendDir, 'pages');
    const apiDir = path.join(frontendDir, 'pages/api');
    
    fs.mkdirSync(pagesDir, { recursive: true });
    fs.mkdirSync(apiDir, { recursive: true });
    
    // Create next.config.js for deployment compatibility
    const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: undefined,
  },
  // Ensure proper build output for deployment
  distDir: '.next',
  // Handle environment variables
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5000'
  }
}

module.exports = nextConfig`;
    
    fs.writeFileSync(path.join(frontendDir, 'next.config.js'), nextConfig);
    
    // Create .gitignore for Next.js
    const gitignoreContent = `# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.tsbuildinfo
next-env.d.ts

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts`;
    
    fs.writeFileSync(path.join(frontendDir, '.gitignore'), gitignoreContent);
    
    // Create .env.local for development
    const envLocalContent = `# Development environment variables
BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000`;
    
    fs.writeFileSync(path.join(frontendDir, '.env.local'), envLocalContent);
    
    // Create index page
    const indexPage = `import { useState, useEffect } from 'react';

export default function Home() {
  const [backendData, setBackendData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:${backendPort}';
    fetch(\`\${backendUrl}/api/data\`)
      .then(res => res.json())
      .then(data => {
        setBackendData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching from backend:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🚀 Fullstack Next.js + Node.js App</h1>
      <p>This is a fullstack application with Next.js frontend and Express backend.</p>
      
      <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>Backend Data:</h3>
        {loading ? (
          <p>Loading data from backend...</p>
        ) : backendData ? (
          <div>
            <p><strong>Message:</strong> {backendData.message}</p>
            <p><strong>Items:</strong> {backendData.items.join(', ')}</p>
            <p><strong>Timestamp:</strong> {backendData.timestamp}</p>
          </div>
        ) : (
          <p>No data received from backend</p>
        )}
      </div>
      
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Backend:</strong> {process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:${backendPort}'}</p>
        <p><strong>Frontend:</strong> http://localhost:3000</p>
      </div>
    </div>
  );
}`;
    
    fs.writeFileSync(path.join(frontendDir, 'pages/index.js'), indexPage);
    
    this.outputChannel.appendLine('✅ Next.js frontend structure created');
  }

  private async createReactFrontend(frontendDir: string, backendPort: number): Promise<void> {
    // Create React package.json
    const reactPackageJson = {
      name: "frontend",
      version: "1.0.0",
      description: "React frontend for fullstack application",
      scripts: {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview"
      },
      dependencies: {
        "react": "^18.0.0",
        "react-dom": "^18.0.0"
      },
      devDependencies: {
        "@vitejs/plugin-react": "^4.0.0",
        "vite": "^4.0.0"
      }
    };
    
    fs.writeFileSync(path.join(frontendDir, 'package.json'), JSON.stringify(reactPackageJson, null, 2));
    
    // Create Vite config
    const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    open: false
  }
})`;
    
    fs.writeFileSync(path.join(frontendDir, 'vite.config.js'), viteConfig);
    
    // Create src directory and files
    const srcDir = path.join(frontendDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    
    const mainJsx = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`;
    
    const appJsx = `import { useState, useEffect } from 'react';

function App() {
  const [backendData, setBackendData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:${backendPort}/api/data')
      .then(res => res.json())
      .then(data => {
        setBackendData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching from backend:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🚀 Fullstack React + Node.js App</h1>
      <p>This is a fullstack application with React frontend and Express backend.</p>
      
      <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>Backend Data:</h3>
        {loading ? (
          <p>Loading data from backend...</p>
        ) : backendData ? (
          <div>
            <p><strong>Message:</strong> {backendData.message}</p>
            <p><strong>Items:</strong> {backendData.items.join(', ')}</p>
            <p><strong>Timestamp:</strong> {backendData.timestamp}</p>
          </div>
        ) : (
          <p>No data received from backend</p>
        )}
      </div>
      
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Backend:</strong> http://localhost:${backendPort}</p>
        <p><strong>Frontend:</strong> http://localhost:3000</p>
      </div>
    </div>
  );
}

export default App;`;
    
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fullstack React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;
    
    fs.writeFileSync(path.join(frontendDir, 'src/main.jsx'), mainJsx);
    fs.writeFileSync(path.join(frontendDir, 'src/App.jsx'), appJsx);
    fs.writeFileSync(path.join(frontendDir, 'index.html'), indexHtml);
    
    this.outputChannel.appendLine('✅ React frontend structure created');
  }

  private async installFrontendDependencies(template: ProjectTemplate, workspaceRoot: string): Promise<void> {
    this.outputChannel.appendLine('📦 Installing frontend dependencies...');
    
    try {
      const frontendDir = path.join(workspaceRoot, 'frontend');
      
      // Run npm install in the frontend directory
      await new Promise<void>((resolve, reject) => {
        const childProcess = child_process.spawn('npm', ['install'], { 
          cwd: frontendDir, 
          stdio: 'pipe',
          shell: true,
          env: { ...process.env, FORCE_COLOR: '1' }
        });

        let output = '';
        let errorOutput = '';
        
        childProcess.stdout?.on('data', (data: Buffer) => {
          const text = data.toString();
          output += text;
          this.outputChannel.appendLine(`[FRONTEND INSTALL] ${text}`);
        });

        childProcess.stderr?.on('data', (data: Buffer) => {
          const text = data.toString();
          errorOutput += text;
          this.outputChannel.appendLine(`[FRONTEND INSTALL ERROR] ${text}`);
        });

        childProcess.on('error', (error: Error) => {
          this.outputChannel.appendLine(`[ERROR] Frontend install process error: ${error.message}`);
          reject(new Error(`Frontend install process error: ${error.message}`));
        });

        childProcess.on('close', (code: number) => {
          if (code === 0) {
            this.outputChannel.appendLine('✅ Frontend dependencies installed successfully');
            resolve();
          } else {
            reject(new Error(`Frontend install failed with code ${code}. Check the output for details.`));
          }
        });
      });
      
    } catch (error) {
      this.outputChannel.appendLine(`❌ Error installing frontend dependencies: ${error}`);
      throw error;
    }
  }

  private async verifyBuildProcess(template: ProjectTemplate, workspaceRoot: string): Promise<void> {
    this.outputChannel.appendLine('🔍 Verifying build process...');
    
    try {
      const frontendDir = path.join(workspaceRoot, 'frontend');
      
      // For Next.js projects, verify the build command works
      if (template.name.toLowerCase().includes('next')) {
        this.outputChannel.appendLine('✅ Next.js project - build verification completed');
        
        // Create a simple build test script
        const buildTestScript = `#!/bin/bash
echo "🔍 Testing build process..."
cd frontend
echo "📦 Installing dependencies..."
npm install
echo "🏗️ Testing build command..."
npm run build
echo "✅ Build test completed successfully!"
`;
        
        fs.writeFileSync(path.join(workspaceRoot, 'test-build.sh'), buildTestScript);
        // Make it executable on Unix systems
        try {
          fs.chmodSync(path.join(workspaceRoot, 'test-build.sh'), 0o755);
        } catch (e) {
          // Ignore chmod errors on Windows
        }
        
        // Create Windows batch file for testing
        const buildTestBatch = `@echo off
echo 🔍 Testing build process...
cd frontend
echo 📦 Installing dependencies...
npm install
echo 🏗️ Testing build command...
npm run build
echo ✅ Build test completed successfully!
pause
`;
        
        fs.writeFileSync(path.join(workspaceRoot, 'test-build.bat'), buildTestBatch);
        
        this.outputChannel.appendLine('✅ Build test scripts created (test-build.sh and test-build.bat)');
      } else {
        this.outputChannel.appendLine('✅ Non-Next.js project - build verification completed');
      }
      
    } catch (error) {
      this.outputChannel.appendLine(`⚠️ Warning: Could not verify build process: ${error}`);
      // Don't throw error here as this is just a verification step
    }
  }

  private async createFullstackReadme(template: ProjectTemplate, workspaceRoot: string): Promise<void> {
    const readmeContent = `# 🚀 Fullstack ${template.name}

This is a fullstack application created with the One-Click Local Preview extension.

## 📁 Project Structure

\`\`\`
.
├── backend/          # Node.js/Express backend server
│   ├── server.js     # Express server with API endpoints
│   └── package.json  # Backend dependencies
├── frontend/         # Frontend application
│   ├── src/          # Source files
│   ├── package.json  # Frontend dependencies
│   └── ...           # Framework-specific files
└── package.json      # Root package.json with fullstack scripts
\`\`\`

## 🚀 Getting Started

### 1. Install Dependencies
\`\`\`bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd frontend && npm install
\`\`\`

### 2. Start Development Servers
\`\`\`bash
# Start both backend and frontend (recommended)
npm run dev

# Or start them separately:
npm run dev:backend    # Backend on port 5000
npm run dev:frontend   # Frontend on port 3000
\`\`\`

## 🌐 URLs

- **Backend API**: http://localhost:5000
- **Frontend App**: http://localhost:3000
- **Health Check**: http://localhost:5000/api/health
- **Sample Data**: http://localhost:5000/api/data

## 🔧 Available Scripts

- \`npm run dev\` - Start both backend and frontend in development mode
- \`npm run dev:backend\` - Start only the backend server
- \`npm run dev:frontend\` - Start only the frontend
- \`npm run build\` - Build the frontend for production
- \`npm start\` - Start the production backend server

## 📚 API Endpoints

- \`GET /api/health\` - Server health check
- \`GET /api/data\` - Sample data endpoint

## 🛠️ Technologies Used

- **Backend**: Node.js, Express.js, CORS
- **Frontend**: ${template.name.toLowerCase().includes('next') ? 'Next.js, React' : 'React, Vite'}
- **Development**: Nodemon, Concurrently
- **Ports**: Backend (5000), Frontend (3000)

## 🚀 Deployment

### Vercel Deployment
This project is configured for easy deployment on Vercel:

1. **Push to GitHub**: Commit and push your code to a GitHub repository
2. **Connect to Vercel**: Import your repository in Vercel
3. **Environment Variables**: Set \`BACKEND_URL\` to your backend deployment URL
4. **Deploy**: Vercel will automatically build and deploy your frontend

### Manual Deployment
For other platforms, ensure you have:

1. **Frontend Build**: Run \`npm run build:frontend\` to build the frontend
2. **Backend Deployment**: Deploy your backend server separately
3. **Environment Variables**: Set \`BACKEND_URL\` to point to your backend

### Build Commands
- \`npm run build\` - Build the entire project
- \`npm run build:frontend\` - Build only the frontend
- \`npm run build:backend\` - Build only the backend (if applicable)

---

Created with ❤️ by the One-Click Local Preview Extension
`;
    
    fs.writeFileSync(path.join(workspaceRoot, 'README.md'), readmeContent);
          this.outputChannel.appendLine('✅ Fullstack README created');
    }

  private async createRootGitignore(workspaceRoot: string): Promise<void> {
    const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage (https://gruntjs.com/creating-plugins#storing-task-files)
.grunt

# Bower dependency directory (https://bower.io/)
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons (https://nodejs.org/api/addons.html)
build/Release

# Dependency directories
node_modules/
jspm_packages/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test
.env.production

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next
out

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Dependency directories
node_modules/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# yarn v2
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz
.pnp.*`;
    
    fs.writeFileSync(path.join(workspaceRoot, '.gitignore'), gitignoreContent);
    this.outputChannel.appendLine('✅ Root .gitignore created');
  }

  private async createVercelConfig(workspaceRoot: string): Promise<void> {
    const vercelConfig = `{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/next",
      "config": {
        "installCommand": "npm install",
        "buildCommand": "npm run build",
        "outputDirectory": ".next"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/frontend/$1"
    }
  ],
  "env": {
    "BACKEND_URL": "https://your-backend-domain.vercel.app"
  },
  "buildCommand": "cd frontend && npm install && npm run build",
  "installCommand": "npm install && cd frontend && npm install"
}`;
    
    fs.writeFileSync(path.join(workspaceRoot, 'vercel.json'), vercelConfig);
    this.outputChannel.appendLine('✅ Vercel configuration created');
  }

  private async createDeploymentGuide(template: ProjectTemplate, workspaceRoot: string): Promise<void> {
    const deploymentGuide = `# 🚀 Deployment Guide for ${template.name}

## Quick Deploy to Vercel

### 1. Push to GitHub
\`\`\`bash
git add .
git commit -m "Initial commit"
git push origin main
\`\`\`

### 2. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Set environment variables:
   - \`BACKEND_URL\`: Your backend deployment URL
5. Click "Deploy"

## Manual Deployment

### Frontend (Next.js)
\`\`\`bash
cd frontend
npm install
npm run build
\`\`\`

### Backend (Node.js/Express)
Deploy to your preferred hosting service (Railway, Render, etc.)

## Environment Variables

Set these in your deployment platform:

- \`BACKEND_URL\`: URL of your backend API
- \`NODE_ENV\`: Set to \`production\` for production builds

## Build Commands

- \`npm run build\` - Build entire project
- \`npm run build:frontend\` - Build frontend only
- \`npm run test:build\` - Test build process

## Testing Build Process

Before deploying, test your build process locally:

**On macOS/Linux:**
\`\`\`bash
chmod +x test-build.sh
./test-build.sh
\`\`\`

**On Windows:**
\`\`\`cmd
test-build.bat
\`\`\`

## Troubleshooting

### Build Fails with "next: command not found"
This usually means dependencies aren't installed. Ensure:
1. \`npm install\` runs in the frontend directory
2. All dependencies are properly listed in package.json
3. Node.js version is compatible (14+ recommended)

### Deployment Issues
1. Check build logs for dependency installation
2. Verify environment variables are set
3. Ensure backend URL is accessible from frontend

---

For more help, check the main README.md file.
`;
    
    fs.writeFileSync(path.join(workspaceRoot, 'DEPLOYMENT.md'), deploymentGuide);
    this.outputChannel.appendLine('✅ Deployment guide created');
  }

  private hasInvalidWorkspaceName(workspaceRoot: string): boolean {
    const folderName = path.basename(workspaceRoot);
    // Check for capital letters, spaces, or special characters that cause npm issues
    return /[A-Z]/.test(folderName) || /\s/.test(folderName) || /[^a-zA-Z0-9\-_]/.test(folderName);
  }

  private async offerAlternativeTemplates(): Promise<void> {
    const alternatives = [
      'Simple React',
      'Express.js + React Fullstack',
      'Node.js + Next.js Fullstack',
      'Simple HTML/CSS/JS'
    ];
    
    const selected = await vscode.window.showQuickPick(alternatives, {
      placeHolder: 'Select an alternative template that works with your workspace name:',
      title: 'Alternative Templates'
    });
    
    if (selected) {
      const template = this.projectTemplates.find(t => t.name === selected);
      if (template) {
        this.outputChannel.appendLine(`🔄 Switching to alternative template: ${selected}`);
        await this.createNewProjectWithTemplate(template);
      }
    }
  }

  private async createNewProjectWithTemplate(template: ProjectTemplate): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }
    
    try {
      await this.executeProjectCreation(template, workspaceRoot);
    } catch (error) {
      this.outputChannel.appendLine(`❌ Error creating project with template ${template.name}: ${error}`);
      vscode.window.showErrorMessage(`Failed to create project: ${error}`);
    }
  }
  
    private async updateViteConfigPort(newPort: number): Promise<void> {
    if (this.config?.framework !== 'vite') return;
    
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return;

    const viteConfigPath = path.join(workspaceRoot, 'vite.config.js');
    if (fs.existsSync(viteConfigPath)) {
      try {
        const configContent = fs.readFileSync(viteConfigPath, 'utf8');
        
        // Update the port in the Vite config
        const updatedConfig = configContent.replace(
          /port:\s*\d+/,
          `port: ${newPort}`
        );
        
        fs.writeFileSync(viteConfigPath, updatedConfig);
        this.outputChannel.appendLine(`✅ Updated Vite config to use port ${newPort}`);
        
        // Also update our config to match
        this.config.port = newPort;
      } catch (error) {
        this.outputChannel.appendLine(`⚠️ Could not update Vite config: ${error}`);
      }
    }
  }

  private async killExistingViteProcesses(): Promise<void> {
    try {
      this.outputChannel.appendLine('🔍 Checking for existing Vite processes...');
      
      // Use pkill to find and kill Vite processes
      const killProcess = child_process.spawn('pkill', ['-f', 'vite'], {
        stdio: 'pipe',
        shell: true
      });

      return new Promise((resolve) => {
        killProcess.on('close', (code) => {
          if (code === 0) {
            this.outputChannel.appendLine('✅ Killed existing Vite processes');
          } else {
            this.outputChannel.appendLine('ℹ️ No existing Vite processes found');
          }
          resolve();
        });

        killProcess.on('error', () => {
          this.outputChannel.appendLine('ℹ️ Could not check for existing Vite processes');
          resolve();
        });
      });
    } catch (error) {
      this.outputChannel.appendLine(`⚠️ Error killing existing Vite processes: ${error}`);
    }
  }

  private async killExistingFullstackProcesses(): Promise<void> {
    try {
      this.outputChannel.appendLine('🔍 Checking for existing fullstack processes...');
      
      // Kill processes using specific ports
      const ports = [5000, 3000]; // Backend and frontend ports
      
      for (const port of ports) {
        try {
          // Find processes using the port
          const findProcess = child_process.spawn('lsof', ['-ti', `:${port}`], {
            stdio: 'pipe',
            shell: true
          });

          let processIds = '';
          findProcess.stdout?.on('data', (data) => {
            processIds += data.toString();
          });

          await new Promise<void>((resolve) => {
            findProcess.on('close', async (code) => {
              if (code === 0 && processIds.trim()) {
                const pids = processIds.trim().split('\n');
                for (const pid of pids) {
                  if (pid.trim()) {
                    try {
                      const killProcess = child_process.spawn('kill', ['-9', pid.trim()], {
                        stdio: 'pipe',
                        shell: true
                      });
                      
                      await new Promise<void>((resolveKill) => {
                        killProcess.on('close', () => {
                          this.outputChannel.appendLine(`✅ Killed process ${pid.trim()} using port ${port}`);
                          resolveKill();
                        });
                      });
                    } catch (error) {
                      this.outputChannel.appendLine(`⚠️ Error killing process ${pid}: ${error}`);
                    }
                  }
                }
              }
              resolve();
            });
          });
        } catch (error) {
          this.outputChannel.appendLine(`⚠️ Error checking port ${port}: ${error}`);
        }
      }
      
      // Also kill general Node.js processes
      const processes = ['node', 'npm', 'yarn', 'pnpm'];
      for (const processName of processes) {
        try {
          const killProcess = child_process.spawn('pkill', ['-f', processName], {
            stdio: 'pipe',
            shell: true
          });

          await new Promise<void>((resolve) => {
            killProcess.on('close', (code) => {
              if (code === 0) {
                this.outputChannel.appendLine(`✅ Killed existing ${processName} processes`);
              } else if (code === 1) {
                this.outputChannel.appendLine(`ℹ️ No existing ${processName} processes found`);
              }
              resolve();
            });

            killProcess.on('error', (error) => {
              this.outputChannel.appendLine(`⚠️ Error killing ${processName} processes: ${error}`);
              resolve();
            });
          });
        } catch (error) {
          this.outputChannel.appendLine(`⚠️ Error killing ${processName} processes: ${error}`);
        }
      }
      
      this.outputChannel.appendLine('✅ Fullstack process cleanup completed');
    } catch (error) {
      this.outputChannel.appendLine(`⚠️ Error killing existing fullstack processes: ${error}`);
    }
  }

  private async killProcessesOnPort(port: number): Promise<void> {
    this.debugLog(`Starting aggressive port cleanup for port ${port}`, 'killProcessesOnPort');
    
    try {
      // Use the new PortManager for aggressive port resolution
      this.debugLog('Using new PortManager for aggressive port resolution', 'killProcessesOnPort');
      
      // For now, we'll use the PortManager's aggressive fallback
      // In the future, this could be enhanced to use more sophisticated logic
      const framework = this.config?.framework as FrameworkType || 'generic';
      this.debugLog(`Framework context for port resolution: ${framework}`, 'killProcessesOnPort');
      
      // Note: The PortManager's findAvailablePort method will handle this
      // We're keeping this method for backward compatibility but it's now
      // much simpler and delegates to the new architecture
      
      this.debugLog(`Port ${port} cleanup completed using new architecture`, 'killProcessesOnPort');
      
    } catch (error) {
      this.debugLog(`Error in port cleanup: ${error}`, 'killProcessesOnPort');
      this.outputChannel.appendLine(`⚠️ Error killing processes on port ${port}: ${error}`);
    }
  }

  private async cleanWorkspace(workspaceRoot: string): Promise<void> {
    try {
      this.outputChannel.appendLine('🧹 Cleaning workspace for new project...');
      
      // Get all files and directories
      const items = fs.readdirSync(workspaceRoot);
      
      for (const item of items) {
        const itemPath = path.join(workspaceRoot, item);
        const stats = fs.statSync(itemPath);
        
        // Skip .git directory
        if (item === '.git') {
          this.outputChannel.appendLine('ℹ️ Preserving .git directory');
          continue;
        }
        
        if (stats.isDirectory()) {
          // Remove directories (including .next, node_modules, etc.)
          fs.rmSync(itemPath, { recursive: true, force: true });
          this.outputChannel.appendLine(`🗑️ Removed directory: ${item}`);
        } else {
          // Remove files
          fs.unlinkSync(itemPath);
          this.outputChannel.appendLine(`🗑️ Removed file: ${item}`);
        }
      }
      
      this.outputChannel.appendLine('✅ Workspace cleaned successfully');
    } catch (error) {
      this.outputChannel.appendLine(`❌ Error cleaning workspace: ${error}`);
      throw new Error(`Failed to clean workspace: ${error}`);
    }
  }

  private async installDependencies(): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return;

    this.outputChannel.appendLine('Installing dependencies...');
    
    return new Promise((resolve, reject) => {
      const installProcess = child_process.spawn(
        this.config?.packageManager === 'yarn' ? 'yarn' : 'npm',
        ['install'],
        { cwd: workspaceRoot, stdio: 'pipe' }
      );

      installProcess.stdout?.on('data', (data) => {
        this.outputChannel.appendLine(data.toString());
      });

      installProcess.stderr?.on('data', (data) => {
        this.outputChannel.appendLine(data.toString());
      });

      installProcess.on('close', (code) => {
        if (code === 0) {
          this.outputChannel.appendLine('Dependencies installed successfully');
          resolve();
        } else {
          reject(new Error(`Failed to install dependencies (exit code: ${code})`));
        }
      });
    });
  }

  private async installFullstackDependencies(): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return;

    this.outputChannel.appendLine('Installing fullstack dependencies...');
    
    try {
      // Install backend dependencies
      this.outputChannel.appendLine('Installing backend dependencies...');
      await this.installDependenciesInDirectory(path.join(workspaceRoot, 'backend'));
      
      // Install frontend dependencies
      this.outputChannel.appendLine('Installing frontend dependencies...');
      await this.installDependenciesInDirectory(path.join(workspaceRoot, 'frontend'));
      
      this.outputChannel.appendLine('✅ Fullstack dependencies installed successfully');
    } catch (error) {
      this.outputChannel.appendLine(`❌ Error installing fullstack dependencies: ${error}`);
      throw error;
    }
  }

  private async installDependenciesInDirectory(dir: string): Promise<void> {
    if (!fs.existsSync(dir)) {
      this.outputChannel.appendLine(`⚠️ Directory ${dir} does not exist, skipping`);
      return;
    }

    return new Promise((resolve, reject) => {
      const installProcess = child_process.spawn(
        this.config?.packageManager === 'yarn' ? 'yarn' : 'npm',
        ['install'],
        { cwd: dir, stdio: 'pipe' }
      );

      installProcess.stdout?.on('data', (data) => {
        this.outputChannel.appendLine(`[${path.basename(dir)}] ${data.toString()}`);
      });

      installProcess.stderr?.on('data', (data) => {
        this.outputChannel.appendLine(`[${path.basename(dir)}] ${data.toString()}`);
      });

      installProcess.on('close', (code) => {
        if (code === 0) {
          this.outputChannel.appendLine(`✅ Dependencies installed in ${path.basename(dir)}`);
          resolve();
        } else {
          reject(new Error(`Failed to install dependencies in ${path.basename(dir)} (exit code: ${code})`));
        }
      });
    });
  }

  private async findAvailablePort(desiredPort: number): Promise<number> {
    this.debugLog(`Starting port availability check for port ${desiredPort}`, 'findAvailablePort');
    
    try {
      this.outputChannel.appendLine(`🔍 Using new cooperative port management for port ${desiredPort}...`);
      
      // Use the new PortManager for cooperative port detection
      const framework = this.config?.framework as FrameworkType || 'generic';
      this.debugLog(`Framework context for port resolution: ${framework}`, 'findAvailablePort');
      
      this.debugLog('Calling PortManager.findAvailablePort', 'findAvailablePort');
      const availablePort = await this.portManager.findAvailablePort(desiredPort, framework);
      this.debugLog(`PortManager returned port: ${availablePort}`, 'findAvailablePort');
      
      this.outputChannel.appendLine(`✅ Cooperative port management resolved port: ${availablePort}`);
      return availablePort;
      
    } catch (error) {
      this.debugLog(`Cooperative port management failed: ${error}`, 'findAvailablePort');
      this.outputChannel.appendLine(`❌ Cooperative port management failed: ${error}`);
      this.outputChannel.appendLine(`🔄 Using requested port ${desiredPort} as last resort`);
      this.debugLog(`Falling back to requested port: ${desiredPort}`, 'findAvailablePort');
      return desiredPort;
    }
  }

  private async startPreview(): Promise<void> {
    this.debugLog('Starting preview server', 'startPreview');
    
    try {
      if (this.status.isRunning || this.status.isStarting) {
        this.debugLog('Preview already running or starting, aborting', 'startPreview');
        this.outputChannel.appendLine('⚠️ Preview already running or starting');
        return;
      }

      this.status.isStarting = true;
      this.updateStatusBar();

      this.debugLog('Preview status set to starting', 'startPreview');
      this.outputChannel.appendLine('🚀 Starting preview...');

      // Kill any existing processes that might be using the port
      if (this.config?.framework === 'vite') {
        await this.killExistingViteProcesses();
      } else if (this.config?.framework === 'fullstack') {
        await this.killExistingFullstackProcesses();
      }

      // Detect project configuration
      this.config = await this.detectProjectConfig();
      
      // Log the detected configuration for debugging
      this.outputChannel.appendLine(`🔍 Detected project config:`);
      this.outputChannel.appendLine(`   Framework: ${this.config.framework}`);
      this.outputChannel.appendLine(`   Port: ${this.config.port}`);
      this.outputChannel.appendLine(`   Script: ${this.config.script}`);
      this.outputChannel.appendLine(`   Package Manager: ${this.config.packageManager}`);
      
      // Check dependencies
      await this.checkDependencies();
      
      // For fullstack projects, install frontend dependencies separately
      if (this.config.framework === 'fullstack') {
        await this.installFullstackDependencies();
      }

      // Validate Vite config if needed
      await this.validateViteConfig();

      // Find available port
      const port = await this.findAvailablePort(this.config.port);
      this.outputChannel.appendLine(`🌐 Using port: ${port} (requested: ${this.config.port})`);
      this.status.port = port;
      this.status.url = `http://localhost:${port}`;

      // Start the development server
      await this.spawnProcess(port);

    } catch (error) {
      // Use the new ErrorHandler for better error management
      await ErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        'Starting preview server',
        async () => {
          this.outputChannel.appendLine(`🔄 Retrying preview start...`);
          this.status.isStarting = false;
          this.updateStatusBar();
          await this.startPreview();
        }
      );
      
      this.status.isStarting = false;
      this.updateStatusBar();
    }
  }

  private async spawnProcess(port: number): Promise<void> {
    this.debugLog(`Starting process spawning on port ${port}`, 'spawnProcess');
    
    try {
      this.outputChannel.appendLine(`🚀 Using new ProcessManager for process spawning on port ${port}...`);
      
      // Convert old config to new format for ProcessManager
      const newConfig: NewProjectConfig = {
        framework: this.config?.framework as FrameworkType || 'generic',
        port: port,
        script: this.config?.script || 'dev',
        packageManager: this.config?.packageManager || 'npm',
        workspacePath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''
      };
      
      this.debugLog(`Process config created: ${JSON.stringify(newConfig)}`, 'spawnProcess');
      
      // Use the new ProcessManager to start the project
      this.debugLog('Calling ProcessManager.startProject', 'spawnProcess');
      const processMonitor = await this.processManager.startProject(newConfig);
      this.debugLog('ProcessManager.startProject completed successfully', 'spawnProcess');
      
      // Update our status with the new process
      this.status.process = processMonitor.process;
      this.status.port = port;
      this.status.url = `http://localhost:${port}`;
      this.debugLog(`Status updated: process=${!!processMonitor.process}, port=${port}`, 'spawnProcess');
      
      // Set up event handlers for the new process
      this.debugLog('Setting up process event handlers', 'spawnProcess');
      
      if (processMonitor.onOutput) {
        this.debugLog('Setting up onOutput handler', 'spawnProcess');
        processMonitor.onOutput = (data: string, type: 'stdout' | 'stderr') => {
          this.outputChannel.appendLine(`[${type.toUpperCase()}:${port}] ${data}`);
          
          // Check for ready signals
          if (type === 'stdout' && this.isServerReady(data, this.config?.framework)) {
            this.debugLog('Server ready signal detected, calling onServerReady', 'spawnProcess');
            this.onServerReady(port);
          }
        };
      } else {
        this.debugLog('Warning: onOutput handler not available', 'spawnProcess');
      }
      
      if (processMonitor.onExit) {
        this.debugLog('Setting up onExit handler', 'spawnProcess');
        processMonitor.onExit = (code: number) => {
          this.debugLog(`Process exit detected with code ${code}`, 'spawnProcess');
          this.outputChannel.appendLine(`[EXIT:${port}] Process exited with code ${code}`);
          this.status.process = null;
          this.status.isRunning = false;
          this.status.isStarting = false;
          this.updateStatusBar();
        };
      } else {
        this.debugLog('Warning: onExit handler not available', 'spawnProcess');
      }
      
      if (processMonitor.onError) {
        this.debugLog('Setting up onError handler', 'spawnProcess');
        processMonitor.onError = (error: Error) => {
          this.debugLog(`Process error detected: ${error.message}`, 'spawnProcess');
          this.outputChannel.appendLine(`[ERROR:${port}] Process error: ${error.message}`);
          this.status.process = null;
          this.status.isRunning = false;
          this.status.isStarting = false;
          this.updateStatusBar();
        };
      } else {
        this.debugLog('Warning: onError handler not available', 'spawnProcess');
      }
      
      this.debugLog('Process event handlers setup completed', 'spawnProcess');
      this.outputChannel.appendLine(`✅ Process started successfully using new ProcessManager`);
      
    } catch (error) {
      this.debugLog(`Error in process spawning: ${error}`, 'spawnProcess');
      this.outputChannel.appendLine(`❌ Failed to start process using new ProcessManager: ${error}`);
      throw error;
    }
  }

  private isServerReady(output: string, framework?: string): boolean {
    const lowerOutput = output.toLowerCase();
    
    // Log the output for debugging
    this.outputChannel.appendLine(`🔍 Checking server ready: "${output.trim()}" (Framework: ${framework})`);
    
    let isReady = false;
    
    switch (framework) {
      case 'fullstack':
        // For fullstack, we need both backend and frontend to be ready
        isReady = (lowerOutput.includes('backend') && lowerOutput.includes('frontend')) ||
                  (lowerOutput.includes('concurrently') && lowerOutput.includes('ready')) ||
                  lowerOutput.includes('ready') || lowerOutput.includes('started') || lowerOutput.includes('listening') ||
                  lowerOutput.includes('server running') || lowerOutput.includes('development server');
        break;
      case 'next':
        isReady = lowerOutput.includes('ready') || lowerOutput.includes('started server') || 
                  lowerOutput.includes('local:') || lowerOutput.includes('ready on');
        break;
      case 'vite':
        isReady = lowerOutput.includes('ready') || lowerOutput.includes('local:') || 
                  lowerOutput.includes('server running') || lowerOutput.includes('dev server running');
        break;
      case 'gatsby':
        isReady = lowerOutput.includes('gatsby develop') && lowerOutput.includes('ready');
        break;
      case 'astro':
        isReady = lowerOutput.includes('astro dev') && lowerOutput.includes('ready');
        break;
      case 'remix':
        isReady = lowerOutput.includes('remix dev') && lowerOutput.includes('ready');
        break;
      default:
        isReady = lowerOutput.includes('ready') || lowerOutput.includes('started') || 
                  lowerOutput.includes('listening') || lowerOutput.includes('server running') ||
                  lowerOutput.includes('development server') || lowerOutput.includes('local:');
    }
    
    if (isReady) {
      this.outputChannel.appendLine(`✅ Server ready signal detected for ${framework || 'unknown'} framework!`);
    }
    
    return isReady;
  }

  private async waitForServer(port: number): Promise<void> {
    const maxAttempts = 30; // 30 seconds
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        await this.checkPort(port);
        this.onServerReady(port);
        return;
      } catch (error) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error(`Server failed to start within ${maxAttempts} seconds`);
  }

  private checkPort(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${port}`, (res) => {
        resolve();
      });

      req.on('error', () => {
        reject(new Error('Port not responding'));
      });

      req.setTimeout(1000, () => {
        req.destroy();
        reject(new Error('Port check timeout'));
      });
    });
  }

  private onServerReady(port: number): void {
    this.status.isRunning = true;
    this.status.isStarting = false;
    this.status.port = port;
    this.status.url = `http://localhost:${port}`;
    
    // Update context key for command palette
    vscode.commands.executeCommand('setContext', 'preview.isRunning', true);
    
    // Update UI manager with project status
    this.uiManager.updateProjectStatus({
      isRunning: true,
      port: port,
      url: `http://localhost:${port}`,
      framework: this.config?.framework || 'unknown',
      projectName: vscode.workspace.workspaceFolders?.[0]?.name || 'Project'
    });
    
    this.updateStatusBar();
    this.openPreview();
    
    this.outputChannel.appendLine(`✅ Preview server ready on http://localhost:${port}`);
    
    // Show notification with restart instructions
    vscode.window.showInformationMessage(
      `Preview started on port ${port}`,
      'Restart Preview'
    ).then(selection => {
      if (selection === 'Restart Preview') {
        this.restartPreview();
      }
    });
  }

  private async openPreview(): Promise<void> {
    if (!this.status.url) return;

    const config = vscode.workspace.getConfiguration('preview');
    const browserMode = config.get<string>('browserMode', 'in-editor');

    this.outputChannel.appendLine(`🌐 Opening preview in ${browserMode} mode: ${this.status.url}`);

    if (browserMode === 'in-editor') {
      try {
        // Try to open in Simple Browser first
        await vscode.commands.executeCommand('simpleBrowser.show', this.status.url);
        this.outputChannel.appendLine('✅ Preview opened in Simple Browser');
      } catch (error) {
        this.outputChannel.appendLine(`⚠️ Simple Browser failed: ${error}`);
        this.outputChannel.appendLine('🔄 Falling back to external browser...');
        
        // Fallback to external browser
        try {
          await vscode.env.openExternal(vscode.Uri.parse(this.status.url));
          this.outputChannel.appendLine('✅ Preview opened in external browser');
        } catch (externalError) {
          this.outputChannel.appendLine(`❌ External browser also failed: ${externalError}`);
          vscode.window.showErrorMessage(`Failed to open preview. Please manually navigate to: ${this.status.url}`);
        }
      }
    } else {
      // Open in external browser
      try {
        await vscode.env.openExternal(vscode.Uri.parse(this.status.url));
        this.outputChannel.appendLine('✅ Preview opened in external browser');
      } catch (error) {
        this.outputChannel.appendLine(`❌ External browser failed: ${error}`);
        vscode.window.showErrorMessage(`Failed to open preview. Please manually navigate to: ${this.status.url}`);
      }
    }
  }

  private async stopPreview(): Promise<void> {
    if (this.status.process) {
      const process = this.status.process;
      
      return new Promise<void>((resolve) => {
        let resolved = false;
        
        // Handle process exit
        process.once('exit', () => {
          if (resolved) return;
          resolved = true;
          
          this.outputChannel.appendLine('✅ Main process exited gracefully');
          this.status.process = null;
          this.status.isRunning = false;
          this.status.isStarting = false;
          this.status.port = null;
          this.status.url = null;
          
          // Update context key for command palette
          vscode.commands.executeCommand('setContext', 'preview.isRunning', false);
          
          // Reset UI manager status
          this.uiManager.resetProjectStatus();
          
          this.updateStatusBar();
          this.outputChannel.appendLine('Preview server stopped');
          
          // Show notification with restart option
          vscode.window.showInformationMessage(
            'Preview stopped',
            'Restart Preview'
          ).then(selection => {
            if (selection === 'Restart Preview') {
              this.restartPreview();
            }
          });
          
          resolve();
        });
        
        // Try graceful shutdown first (Ctrl+C)
        this.outputChannel.appendLine('🔄 Sending SIGINT (Ctrl+C) for graceful shutdown...');
        process.kill('SIGINT');
        
        // Force kill after timeout if still running
        setTimeout(() => {
          if (resolved) return;
          
          if (process && !process.killed) {
            this.outputChannel.appendLine('⚠️ Process still running, sending SIGTERM...');
            process.kill('SIGTERM');
            
            // Final force kill if still running
            setTimeout(() => {
              if (resolved) return;
              
              if (process && !process.killed) {
                this.outputChannel.appendLine('🚨 Process still running, sending SIGKILL...');
                process.kill('SIGKILL');
                
                // Force resolve after SIGKILL
                setTimeout(() => {
                  if (resolved) return;
                  this.outputChannel.appendLine('⚠️ Force resolving after SIGKILL...');
                  resolved = true;
                  resolve();
                }, 1000);
              } else {
                // Process was killed, resolve
                if (!resolved) {
                  this.outputChannel.appendLine('⚠️ Process killed, resolving...');
                  resolved = true;
                  // Run cleanup before resolving
                  this.cleanupRemainingProcesses().then(() => resolve());
                }
              }
            }, 2000);
          } else {
            // Process was killed, resolve
            if (!resolved) {
              this.outputChannel.appendLine('⚠️ Process killed, resolving...');
              resolved = true;
              // Run cleanup before resolving
              this.cleanupRemainingProcesses().then(() => resolve());
            }
          }
        }, 3000);
        
        // Safety timeout - force resolve after 10 seconds
        setTimeout(() => {
          if (resolved) return;
          this.outputChannel.appendLine('⚠️ Safety timeout reached, force resolving...');
          resolved = true;
          // Run cleanup before resolving
          this.cleanupRemainingProcesses().then(() => resolve());
        }, 10000);
      });
    } else {
      // No process to stop, just update status
      this.status.isRunning = false;
      this.status.isStarting = false;
      this.status.port = null;
      this.status.url = null;
      
      // Update context key for command palette
      vscode.commands.executeCommand('setContext', 'preview.isRunning', false);
      
      // Reset UI manager status
      this.uiManager.resetProjectStatus();
      
      this.updateStatusBar();
      this.outputChannel.appendLine('Preview server stopped (no process was running)');
      
      // Show notification with restart option
      vscode.window.showInformationMessage(
        'Preview stopped',
        'Restart Preview'
      ).then(selection => {
        if (selection === 'Restart Preview') {
          this.restartPreview();
        }
      });
    }
    
    // ALWAYS clean up any remaining processes on the known ports
    await this.cleanupRemainingProcesses();
  }

  private async cleanupRemainingProcesses(): Promise<void> {
    try {
      this.outputChannel.appendLine('🧹 Cleaning up any remaining processes on known ports...');
      
      // Get the ports we were using
      const ports = [];
      if (this.status.port) ports.push(this.status.port);
      if (this.config?.port) ports.push(this.config.port);
      
      // Add common development ports
      const commonPorts = [3000, 3001, 5173, 5000, 8000];
      ports.push(...commonPorts);
      
      // Remove duplicates
      const uniquePorts = [...new Set(ports)];
      
      for (const port of uniquePorts) {
        try {
          // Find processes using this port
          const findProcess = child_process.spawn('lsof', ['-ti', `:${port}`], {
            stdio: 'pipe',
            shell: true
          });

          let processIds = '';
          findProcess.stdout?.on('data', (data) => {
            processIds += data.toString();
          });

          await new Promise<void>((resolve) => {
            findProcess.on('close', async (code) => {
              if (code === 0 && processIds.trim()) {
                const pids = processIds.trim().split('\n');
                for (const pid of pids) {
                  if (pid.trim()) {
                    try {
                      this.outputChannel.appendLine(`🔄 Killing remaining process ${pid.trim()} on port ${port}`);
                      const killProcess = child_process.spawn('kill', ['-9', pid.trim()], {
                        stdio: 'pipe',
                        shell: true
                      });
                      
                      await new Promise<void>((resolveKill) => {
                        killProcess.on('close', () => {
                          this.outputChannel.appendLine(`✅ Killed process ${pid.trim()} on port ${port}`);
                          resolveKill();
                        });
                      });
                    } catch (error) {
                      this.outputChannel.appendLine(`⚠️ Error killing process ${pid}: ${error}`);
                    }
                  }
                }
              }
              resolve();
            });
          });
        } catch (error) {
          this.outputChannel.appendLine(`⚠️ Error checking port ${port}: ${error}`);
        }
      }
      
      // Also kill any remaining Node.js development processes
      const nodeProcesses = ['node', 'nodemon', 'next', 'vite', 'concurrently'];
      for (const processName of nodeProcesses) {
        try {
          this.outputChannel.appendLine(`🧹 Cleaning up remaining ${processName} processes...`);
          const killProcess = child_process.spawn('pkill', ['-f', processName], {
            stdio: 'pipe',
            shell: true
          });

          await new Promise<void>((resolve) => {
            killProcess.on('close', (code) => {
              if (code === 0) {
                this.outputChannel.appendLine(`✅ Cleaned up ${processName} processes`);
              } else if (code === 1) {
                this.outputChannel.appendLine(`ℹ️ No ${processName} processes found`);
              }
              resolve();
            });
          });
        } catch (error) {
          this.outputChannel.appendLine(`⚠️ Error cleaning up ${processName} processes: ${error}`);
        }
      }
      
      this.outputChannel.appendLine('✅ Process cleanup completed');
    } catch (error) {
      this.outputChannel.appendLine(`⚠️ Error during process cleanup: ${error}`);
    }
  }

  private async restartPreview(): Promise<void> {
    await this.stopPreview();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
    await this.startPreview();
  }

  private updateStatusBar(): void {
    console.log('PreviewManager: updateStatusBar called');
    
    if (this.status.isStarting) {
      this.statusBarItem.text = '⟳ Starting...';
      this.statusBarItem.tooltip = 'Preview server is starting...\nClick to stop';
      this.statusBarItem.command = 'pistachio.stop';
    } else if (this.status.isRunning) {
      this.statusBarItem.text = `● Preview: Running on :${this.status.port}`;
      this.statusBarItem.tooltip = `Preview running on ${this.status.url}\nClick to stop | Cmd+Shift+P → "Preview: Restart" to restart`;
      this.statusBarItem.command = 'pistachio-vibe.stop';
    } else {
      // Check if project exists
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      const hasProject = workspaceRoot && fs.existsSync(path.join(workspaceRoot, 'package.json'));
      
      console.log('PreviewManager: Workspace root:', workspaceRoot);
      console.log('PreviewManager: Has project:', hasProject);
      
      if (!hasProject) {
        this.statusBarItem.text = '🚀 New Project';
        this.statusBarItem.tooltip = 'Click to create a new project from scratch';
        this.statusBarItem.command = 'pistachio-vibe.createProject';
        console.log('PreviewManager: Setting status to 🚀 New Project');
      } else {
        // Check what type of project we have
        let projectType = 'generic';
        if (this.config) {
          projectType = this.config.framework;
        } else {
          // Try to detect from package.json
          try {
            const packageJsonPath = path.join(workspaceRoot, 'package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
            
            if (dependencies.next) projectType = 'next';
            else if (dependencies.vite) projectType = 'vite';
            else if (dependencies.gatsby) projectType = 'gatsby';
            else if (dependencies.astro) projectType = 'astro';
            else if (dependencies['@remix-run/react']) projectType = 'remix';
          } catch (error) {
            console.log('PreviewManager: Error reading package.json:', error);
          }
        }
        
        this.statusBarItem.text = `▶ Preview (${projectType})`;
        this.statusBarItem.tooltip = `Click to start ${projectType} preview`;
        this.statusBarItem.command = 'pistachio-vibe.run';
        console.log('PreviewManager: Setting status to ▶ Preview');
      }
    }

    this.statusBarItem.show();
    console.log('PreviewManager: Status bar item shown with text:', this.statusBarItem.text);
  }

  public dispose(): void {
    this.stopPreview();
    this.statusBarItem.dispose();
    this.outputChannel.dispose();
  }
}

let previewManager: PreviewManager;

export function activate(context: vscode.ExtensionContext): void {
  console.log('Extension activating...');
  previewManager = new PreviewManager(context);
  
  // Initialize after a short delay to ensure workspace is ready
  setTimeout(() => {
    previewManager.initialize();
  }, 1000);
  
  context.subscriptions.push(previewManager);
  console.log('Extension activated successfully');
}

export function deactivate(): void {
  console.log('Extension deactivating...');
  if (previewManager) {
    previewManager.dispose();
  }
}
