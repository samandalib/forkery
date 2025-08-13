import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';
import * as http from 'http';
import detectPort from 'detect-port';

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

  // Project templates for quick start
  private projectTemplates: ProjectTemplate[] = [
    {
      name: 'Next.js App',
      description: 'Full-stack React framework with file-based routing',
      command: 'npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes',
      port: 3000,
      dependencies: ['next', 'react', 'react-dom']
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
    this.statusBarItem.command = 'preview.run';
    this.statusBarItem.tooltip = 'Click to start preview or create new project';
    
    // Create output channel
    this.outputChannel = vscode.window.createOutputChannel('Preview Logs');

    // Register commands
    this.registerCommands();
    
    // Initialize context key
    vscode.commands.executeCommand('setContext', 'preview.isRunning', false);
  }

  public initialize(): void {
    // Initialize the status bar after workspace is ready
    console.log('PreviewManager: Initializing...');
    this.updateStatusBar();
    console.log('PreviewManager: Initialization complete');
  }

  private registerCommands(): void {
    // These commands are already declared in package.json, so they should work
    // But we need to ensure they're properly bound to the instance methods
    vscode.commands.registerCommand('preview.run', this.startPreview.bind(this));
    vscode.commands.registerCommand('preview.stop', this.stopPreview.bind(this));
    vscode.commands.registerCommand('preview.restart', this.restartPreview.bind(this));
    vscode.commands.registerCommand('preview.createProject', this.createNewProject.bind(this));
  }

  private async createNewProject(): Promise<void> {
    // Check if workspace is empty
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    // Check if workspace already has content
    const files = fs.readdirSync(workspaceRoot);
    const hasContent = files.some(file => 
      !file.startsWith('.') && file !== '.git' && file !== 'node_modules'
    );

    if (hasContent) {
      const action = await vscode.window.showWarningMessage(
        'This workspace already contains files. Create project anyway?',
        'Yes', 'No'
      );
      if (action !== 'Yes') return;
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
  }

  private async executeProjectCreation(template: ProjectTemplate, workspaceRoot: string): Promise<void> {
    this.outputChannel.appendLine(`🚀 Creating new ${template.name} project...`);
    this.outputChannel.appendLine(`Command: ${template.command}`);
    this.outputChannel.appendLine(`Working directory: ${workspaceRoot}`);
    
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
      if (template.name.toLowerCase().includes('react')) {
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
    port: ${template.port},
    strictPort: true
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
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error('No workspace folder found');
    }

    const packageJsonPath = path.join(workspaceRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      // No project found - offer to create one
      const action = await vscode.window.showInformationMessage(
        'No project found in this workspace. Create a new project?',
        'Create Project', 'Cancel'
      );

      if (action === 'Create Project') {
        await this.createNewProject();
        // Try to detect again after creation
        if (fs.existsSync(packageJsonPath)) {
          return this.detectProjectConfig();
        } else {
          throw new Error('Project creation was cancelled or failed');
        }
      } else {
        throw new Error('No package.json found in workspace');
      }
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const scripts = packageJson.scripts || {};

    // Determine framework
    let framework = 'generic';
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (dependencies.next) framework = 'next';
    else if (dependencies.vite) framework = 'vite';
    else if (dependencies.gatsby) framework = 'gatsby';
    else if (dependencies.astro) framework = 'astro';
    else if (dependencies['@remix-run/react']) framework = 'remix';

    // Determine script to run
    let script = 'dev';
    if (scripts.dev) script = 'dev';
    else if (scripts.start) script = 'start';
    else if (scripts.serve) script = 'serve';

    // Determine package manager
    let packageManager = 'npm';
    if (fs.existsSync(path.join(workspaceRoot, 'yarn.lock'))) packageManager = 'yarn';
    else if (fs.existsSync(path.join(workspaceRoot, 'pnpm-lock.yaml'))) packageManager = 'pnpm';

    // Determine default port
    let port = 3000;
    switch (framework) {
      case 'vite': port = 5173; break;
      case 'next': port = 3000; break;
      case 'gatsby': port = 8000; break;
      case 'astro': port = 4321; break;
      case 'remix': port = 3000; break;
      default: port = 3000;
    }

    // Check if custom port is configured
    const config = vscode.workspace.getConfiguration('preview');
    const customPort = config.get<number>('port');
    if (customPort) {
      port = customPort;
    }

    return { framework, port, script, packageManager };
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

  private async findAvailablePort(desiredPort: number): Promise<number> {
    try {
      const availablePort = await detectPort(desiredPort);
      return availablePort;
    } catch (error) {
      this.outputChannel.appendLine(`Port detection failed: ${error}`);
      return desiredPort;
    }
  }

  private async startPreview(): Promise<void> {
    try {
      if (this.status.isRunning || this.status.isStarting) {
        return;
      }

      this.status.isStarting = true;
      this.updateStatusBar();

      // Detect project configuration
      this.config = await this.detectProjectConfig();
      
      // Check dependencies
      await this.checkDependencies();

      // Find available port
      const port = await this.findAvailablePort(this.config.port);
      this.status.port = port;
      this.status.url = `http://localhost:${port}`;

      // Start the development server
      await this.spawnProcess(port);

    } catch (error) {
      this.outputChannel.appendLine(`Error starting preview: ${error}`);
      vscode.window.showErrorMessage(`Failed to start preview: ${error}`);
      this.status.isStarting = false;
      this.updateStatusBar();
    }
  }

  private async spawnProcess(port: number): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot || !this.config) return;

    const command = this.config.packageManager;
    const args = this.config.packageManager === 'yarn' 
      ? [this.config.script]
      : ['run', this.config.script];

    this.outputChannel.appendLine(`Starting ${this.config.framework} server on port ${port}...`);
    this.outputChannel.appendLine(`Command: ${command} ${args.join(' ')}`);
    this.outputChannel.appendLine(`Working directory: ${workspaceRoot}`);
    this.outputChannel.appendLine(`Script to run: ${this.config.script}`);
    this.outputChannel.appendLine(`Expected port: ${port}`);
    this.outputChannel.appendLine(`Vite config will use strictPort: true to force this port`);

    const childProcess = child_process.spawn(command, args, {
      cwd: workspaceRoot,
      stdio: 'pipe',
      shell: true
    });

    this.status.process = childProcess;
    
    // Flag to prevent multiple ready signal calls
    let serverReadyCalled = false;

    // Capture output
    childProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      this.outputChannel.appendLine(`[STDOUT] ${output}`);
      
      // Check for ready signals
      if (this.isServerReady(output, this.config?.framework) && !serverReadyCalled) {
        serverReadyCalled = true;
        this.outputChannel.appendLine('✅ Server ready signal detected!');
        
        // For Vite, extract the actual port from the output
        if (this.config?.framework === 'vite') {
          const portMatch = output.match(/Local:\s+http:\/\/localhost:(\d+)/);
          if (portMatch) {
            const actualPort = parseInt(portMatch[1]);
            this.outputChannel.appendLine(`🔄 Vite is running on port ${actualPort}, updating configuration...`);
            this.status.port = actualPort;
            this.status.url = `http://localhost:${actualPort}`;
          }
        }
        
        this.onServerReady(this.status.port || port);
      }
    });

    childProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      this.outputChannel.appendLine(`[STDERR] ${output}`);
    });

    childProcess.on('error', (error) => {
      this.outputChannel.appendLine(`[ERROR] Process error: ${error.message}`);
    });

    childProcess.on('close', (code) => {
      this.outputChannel.appendLine(`[EXIT] Process exited with code ${code}`);
      this.status.process = null;
      this.status.isRunning = false;
      this.status.isStarting = false;
      this.updateStatusBar();
    });

    // Wait for server to be ready
    // Note: We don't need to wait here since we're already listening for ready signals
    // The server ready detection happens in the stdout listener
  }

  private isServerReady(output: string, framework?: string): boolean {
    const lowerOutput = output.toLowerCase();
    
    switch (framework) {
      case 'next':
        return lowerOutput.includes('ready') || lowerOutput.includes('started server');
      case 'vite':
        return lowerOutput.includes('ready') || lowerOutput.includes('local:');
      case 'gatsby':
        return lowerOutput.includes('gatsby develop') && lowerOutput.includes('ready');
      case 'astro':
        return lowerOutput.includes('astro dev') && lowerOutput.includes('ready');
      case 'remix':
        return lowerOutput.includes('remix dev') && lowerOutput.includes('ready');
      default:
        return lowerOutput.includes('ready') || lowerOutput.includes('started') || lowerOutput.includes('listening');
    }
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
    
    this.updateStatusBar();
    this.openPreview();
    
    this.outputChannel.appendLine(`✅ Preview server ready on http://localhost:${port}`);
    vscode.window.showInformationMessage(`Preview started on port ${port}`);
  }

  private openPreview(): void {
    if (!this.status.url) return;

    const config = vscode.workspace.getConfiguration('preview');
    const browserMode = config.get<string>('browserMode', 'in-editor');

    if (browserMode === 'in-editor') {
      // Try to open in Simple Browser
      vscode.commands.executeCommand('simpleBrowser.show', this.status.url);
    } else {
      // Open in external browser
      vscode.env.openExternal(vscode.Uri.parse(this.status.url));
    }
  }

  private stopPreview(): void {
    if (this.status.process) {
      this.status.process.kill('SIGTERM');
      this.status.process = null;
    }

    this.status.isRunning = false;
    this.status.isStarting = false;
    this.status.port = null;
    this.status.url = null;
    
    // Update context key for command palette
    vscode.commands.executeCommand('setContext', 'preview.isRunning', false);
    
    this.updateStatusBar();
    this.outputChannel.appendLine('Preview server stopped');
    vscode.window.showInformationMessage('Preview stopped');
  }

  private async restartPreview(): Promise<void> {
    this.stopPreview();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
    await this.startPreview();
  }

  private updateStatusBar(): void {
    console.log('PreviewManager: updateStatusBar called');
    
    if (this.status.isStarting) {
      this.statusBarItem.text = '⟳ Starting...';
      this.statusBarItem.tooltip = 'Preview server is starting...';
      this.statusBarItem.command = 'preview.stop';
    } else if (this.status.isRunning) {
      this.statusBarItem.text = `● Preview: Running on :${this.status.port}`;
      this.statusBarItem.tooltip = `Preview running on ${this.status.url}\nClick to stop`;
      this.statusBarItem.command = 'preview.stop';
    } else {
      // Check if project exists
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      const hasProject = workspaceRoot && fs.existsSync(path.join(workspaceRoot, 'package.json'));
      
      console.log('PreviewManager: Workspace root:', workspaceRoot);
      console.log('PreviewManager: Has project:', hasProject);
      
      if (!hasProject) {
        this.statusBarItem.text = '🚀 New Project';
        this.statusBarItem.tooltip = 'Click to create a new project from scratch';
        this.statusBarItem.command = 'preview.createProject';
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
        this.statusBarItem.command = 'preview.run';
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
