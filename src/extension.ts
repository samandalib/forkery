/**
 * 🚀 Pistachio Vibe Extension - Main Extension File
 * 
 * @author Pistachio Vibe Team
 * @version 1.0.24-DeploymentDiagnostic
 */

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
  terminal?: vscode.Terminal;
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


  // Project templates for quick start
  private projectTemplates: ProjectTemplate[] = [
    {
      name: 'Next.js App',
      description: 'Full-stack React framework with file-based routing (creates in clean directory)',
      command: 'npx create-next-app@latest my-nextjs-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes --use-npm',
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
      command: 'npm init -y && mkdir -p backend frontend',
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
    
    // Initialize the status bar
    this.updateStatusBar();
    
    // Check if we have a workspace
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      console.log('PreviewManager: Workspace found, detecting project configuration');
        this.outputChannel.appendLine('🔍 Detecting existing project configuration...');
      
      try {
        this.config = await this.detectProjectConfig();
        this.outputChannel.appendLine('✅ Project configuration detected');
        this.updateStatusBar();
    } catch (error) {
      this.outputChannel.appendLine(`ℹ️ No existing project detected: ${error}`);
      }
    }
  }

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
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // Detect framework based on dependencies and scripts
    let framework = 'generic';
    let defaultPort = 3000;
    let defaultScript = 'dev';

    if (dependencies.next) {
      framework = 'next';
      defaultPort = 3000;
      defaultScript = 'dev';
    } else if (dependencies.vite) {
      framework = 'vite';
      defaultPort = 5173;
      defaultScript = 'dev';
    } else if (dependencies.express && (dependencies.react || dependencies['react-dom'])) {
      framework = 'fullstack';
      defaultPort = 3000;
      defaultScript = 'dev';
    } else if (dependencies['live-server']) {
      framework = 'static';
      defaultPort = 8080;
      defaultScript = 'start';
    }

    // Smart script detection - find the best available script
    let script = this.findBestAvailableScript(scripts, defaultScript, framework);
    
    if (!script) {
      // No suitable script found, provide helpful error
      const availableScripts = Object.keys(scripts);
      if (availableScripts.length === 0) {
        throw new Error(`No npm scripts found in package.json. Please add a script to start your project (e.g., "dev", "start", or "serve").`);
      } else {
        throw new Error(`No suitable start script found. Available scripts: ${availableScripts.join(', ')}. Please add a "dev" or "start" script to your package.json.`);
      }
    }

    // Check if there's a custom port in scripts
    let port = defaultPort;
    if (scripts[script]) {
      const portMatch = scripts[script].match(/--port\s+(\d+)/);
      if (portMatch) {
        port = parseInt(portMatch[1]);
      }
    }

    return {
      framework,
      port,
      script: script,
      packageManager: 'npm'
    };
  }

  private findBestAvailableScript(scripts: any, defaultScript: string, framework: string): string | null {
    // Priority order for scripts
    const scriptPriority = [
      defaultScript,           // First try the framework-specific default
      'dev',                   // Common development script
      'start',                 // Common start script
      'serve',                 // Common serve script
      'develop',               // Alternative dev script
      'watch'                  // Watch mode script
    ];

    // Check each priority script
    for (const scriptName of scriptPriority) {
      if (scripts[scriptName]) {
        return scriptName;
      }
    }

    // If no priority scripts found, return the first available script
    const availableScripts = Object.keys(scripts);
    if (availableScripts.length > 0) {
      // Log a warning about using non-standard script
      console.warn(`Using non-standard script: ${availableScripts[0]} (recommended: add a "dev" or "start" script)`);
      return availableScripts[0];
    }

    return null;
  }

  private showScriptFixOptions(): void {
    vscode.window.showInformationMessage(
      'Would you like help fixing the npm scripts?',
      'Show Available Scripts',
      'Create Basic Scripts',
      'Cancel'
    ).then(selection => {
      if (selection === 'Show Available Scripts') {
        this.showAvailableScripts();
      } else if (selection === 'Create Basic Scripts') {
        this.createBasicScripts();
      }
    });
  }

  private showAvailableScripts(): void {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return;

    const packageJsonPath = path.join(workspaceRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) return;

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};
      const availableScripts = Object.keys(scripts);

      if (availableScripts.length === 0) {
        vscode.window.showInformationMessage('No npm scripts found in package.json');
      } else {
        vscode.window.showInformationMessage(
          `Available scripts: ${availableScripts.join(', ')}`,
          'Copy Scripts'
        ).then(action => {
          if (action === 'Copy Scripts') {
            vscode.env.clipboard.writeText(JSON.stringify(scripts, null, 2));
            vscode.window.showInformationMessage('Scripts copied to clipboard');
          }
        });
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to read package.json: ${error}`);
    }
  }

  private async createBasicScripts(): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return;

    const packageJsonPath = path.join(workspaceRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) return;

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};
      
      // Detect framework and suggest appropriate scripts
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      let suggestedScripts = {};

      if (dependencies.next) {
        suggestedScripts = {
          dev: 'next dev',
          build: 'next build',
          start: 'next start'
        };
      } else if (dependencies.vite) {
        suggestedScripts = {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview'
        };
      } else if (dependencies.express) {
        suggestedScripts = {
          start: 'node server.js',
          dev: 'nodemon server.js'
        };
      } else {
        // Generic scripts
        suggestedScripts = {
          start: 'node index.js',
          dev: 'node --watch index.js'
        };
      }

      // Merge with existing scripts
      const newScripts = { ...suggestedScripts, ...scripts };
      
      // Update package.json
      packageJson.scripts = newScripts;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

      vscode.window.showInformationMessage(
        `Added basic scripts to package.json: ${Object.keys(suggestedScripts).join(', ')}`,
        'Restart Preview'
      ).then(action => {
        if (action === 'Restart Preview') {
          this.startPreview();
        }
      });

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create scripts: ${error}`);
    }
  }

  private async findAvailablePort(desiredPort: number): Promise<number> {
    try {
      // Kill existing processes on the desired port
      await this.killExistingProcesses(desiredPort);
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Detect available port
      const availablePort = await detectPort(desiredPort);
      
      if (availablePort === desiredPort) {
        this.outputChannel.appendLine(`✅ Port ${desiredPort} is available after cleanup`);
      } else {
        this.outputChannel.appendLine(`⚠️ Port ${desiredPort} still busy, using ${availablePort} instead`);
      }
      
      return availablePort;
    } catch (error) {
      return desiredPort; // Fallback
    }
  }

  private async killExistingProcesses(port: number): Promise<void> {
    try {
      // Kill processes on specific port
      await this.killProcessesOnPort(port);
      
      // Kill all node processes (nuclear option)
      await this.killAllNodeProcesses();
    } catch (error) {
      this.outputChannel.appendLine(`⚠️ Error killing processes: ${error}`);
    }
  }

  private async killProcessesOnPort(port: number): Promise<void> {
    this.outputChannel.appendLine(`🔍 Looking for processes on port ${port}...`);
    
    return new Promise((resolve) => {
      if (process.platform === 'win32') {
        // Windows approach
        const childProcess = child_process.exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
          if (error) {
            this.outputChannel.appendLine(`⚠️ Error checking port ${port}: ${error.message}`);
            resolve();
            return;
          }
          
          if (stdout.trim()) {
            const lines = stdout.trim().split('\n');
            for (const line of lines) {
              const pidMatch = line.match(/\s+(\d+)\s*$/);
              if (pidMatch) {
                const pid = parseInt(pidMatch[1]);
                try {
                  child_process.exec(`taskkill /F /PID ${pid}`, (killError) => {
                    if (killError) {
                      this.outputChannel.appendLine(`⚠️ Could not kill process ${pid}: ${killError.message}`);
                    } else {
                      this.outputChannel.appendLine(`✅ Killed process ${pid} on port ${port}`);
                    }
                  });
                } catch (error) {
                  this.outputChannel.appendLine(`⚠️ Error killing process ${pid}: ${error}`);
                }
              }
            }
          } else {
            this.outputChannel.appendLine(`ℹ️ No processes found on port ${port}`);
          }
          resolve();
        });
      } else {
        // macOS/Linux approach
        const childProcess = child_process.exec(`lsof -ti :${port}`, (error, stdout, stderr) => {
          if (error) {
            this.outputChannel.appendLine(`ℹ️ No processes found on port ${port} (lsof exit code: ${error.code})`);
            resolve();
            return;
          }
          
          if (stdout.trim()) {
            const pids = stdout.trim().split('\n');
            for (const pidStr of pids) {
              const pid = parseInt(pidStr.trim());
              if (pid && !isNaN(pid)) {
                try {
                  process.kill(pid, 'SIGTERM');
                  this.outputChannel.appendLine(`✅ Sent SIGTERM to process ${pid} on port ${port}`);
                  
                  // Force kill after 3 seconds if still alive
                  setTimeout(() => {
                    try {
                      process.kill(pid, 'SIGKILL');
                      this.outputChannel.appendLine(`🔨 Force killed process ${pid}`);
                    } catch (killError) {
                      // Process already dead, which is good
                    }
                  }, 3000);
                } catch (error) {
                  this.outputChannel.appendLine(`⚠️ Could not kill process ${pid}: ${error}`);
                }
              }
            }
          } else {
            this.outputChannel.appendLine(`ℹ️ No processes found on port ${port}`);
          }
          resolve();
        });
      }
    });
  }

  private async killAllNodeProcesses(): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = process.platform === 'win32' ? 'taskkill' : 'pkill';
      const args = process.platform === 'win32' 
        ? ['/f', '/im', 'node.exe']
        : ['-f', 'node'];

      const childProcess = child_process.spawn(command, args, { 
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      });
      
      childProcess.on('close', (code) => {
        if (code === 0) {
          this.outputChannel.appendLine('✅ Killed all node processes');
        } else {
          this.outputChannel.appendLine('ℹ️ No node processes found or already killed');
        }
        resolve();
      });

      childProcess.on('error', (error) => {
        this.outputChannel.appendLine(`⚠️ Error killing node processes: ${error}`);
        resolve(); // Don't fail on error
      });
    });
  }

  private async spawnProcess(script: string, port: number, workspaceRoot: string): Promise<child_process.ChildProcess> {
    return new Promise((resolve, reject) => {
      // FIXED: Run npm scripts properly instead of trying to run script names directly
      const command = 'npm';
      const args = ['run', script];

      this.outputChannel.appendLine(`🚀 Starting process: npm run ${script}`);
      this.outputChannel.appendLine(`📁 Working directory: ${workspaceRoot}`);
      this.outputChannel.appendLine(`🎯 Expected port: ${port}`);

      // Use exec instead of spawn to avoid terminal interference
      const childProcess = child_process.exec(`${command} ${args.join(' ')}`, {
        cwd: workspaceRoot,
        windowsHide: true,
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      let output = '';
      let errorOutput = '';

      // Handle process cleanup on extension deactivation
      this.contextKey.subscriptions.push({
        dispose: () => {
          if (childProcess && !childProcess.killed) {
            try {
              childProcess.kill('SIGTERM');
            } catch (error) {
              this.outputChannel.appendLine(`⚠️ Error during cleanup: ${error}`);
            }
          }
        }
      });

      if (childProcess.stdout) {
        childProcess.stdout.on('data', (data) => {
          const dataStr = data.toString();
          output += dataStr;
          this.outputChannel.appendLine(`[STDOUT:${port}] ${dataStr.trim()}`);
          
          // Check if server is ready (only if not already ready)
          if (!this.status.isRunning && this.isServerReady(dataStr, this.config?.framework || 'generic')) {
            this.outputChannel.appendLine('✅ Server ready signal detected!');
            this.onServerReady(port);
          }
        });
      }

      if (childProcess.stderr) {
        childProcess.stderr.on('data', (data) => {
          const dataStr = data.toString();
          errorOutput += dataStr;
          this.outputChannel.appendLine(`[STDERR:${port}] ${dataStr.trim()}`);
        });
      }

      childProcess.on('error', (error) => {
        this.outputChannel.appendLine(`❌ Process error: ${error}`);
        this.outputChannel.appendLine(`💡 This usually means the npm script '${script}' failed to start or npm is not available`);
        reject(error);
      });

      childProcess.on('close', (code) => {
        this.outputChannel.appendLine(`[EXIT:${port}] Process exited with code ${code}`);
        if (code !== 0) {
          this.outputChannel.appendLine(`⚠️ Process exited with non-zero code: ${code}`);
          if (code === 127) {
            this.outputChannel.appendLine(`💡 Exit code 127 usually means 'command not found' - this should now be fixed with npm run`);
          } else if (code === 1) {
            this.outputChannel.appendLine(`💡 Exit code 1 usually means the script ran but encountered an error - check your project configuration`);
          }
        }
      });

      // Wait a bit for the process to start
      setTimeout(() => {
        resolve(childProcess);
      }, 1000);
    });
  }

  private isServerReady(output: string, framework: string): boolean {
    const lowerOutput = output.toLowerCase();
    
    switch (framework) {
      case 'next':
        return lowerOutput.includes('ready') || lowerOutput.includes('started') || lowerOutput.includes('localhost');
      case 'vite':
        return lowerOutput.includes('ready') || lowerOutput.includes('localhost') || lowerOutput.includes('server running');
      case 'fullstack':
        return lowerOutput.includes('server running') || lowerOutput.includes('listening') || lowerOutput.includes('localhost');
      case 'static':
        return lowerOutput.includes('serving') || lowerOutput.includes('localhost') || lowerOutput.includes('ready');
      default:
        return lowerOutput.includes('ready') || lowerOutput.includes('started') || lowerOutput.includes('localhost') || lowerOutput.includes('listening');
    }
  }

  private onServerReady(port: number): void {
    // FIXED: Prevent multiple calls to onServerReady
    if (this.status.isRunning) {
      this.outputChannel.appendLine(`⚠️ Server already running, ignoring duplicate ready signal`);
      return;
    }
    
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

  private async restartPreview(): Promise<void> {
    this.outputChannel.appendLine('🔄 Restarting preview...');
    await this.stopPreview();
    // Small delay to ensure cleanup
    setTimeout(() => {
      this.startPreview();
    }, 1000);
  }



  private async openPreview(): Promise<void> {
    if (!this.status.url) return;
    
    const config = vscode.workspace.getConfiguration('preview');
    const browserMode = config.get('browserMode', 'in-editor');
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





  private updateStatusBar(): void {
    if (this.status.isRunning) {
      this.statusBarItem.text = `$(globe) Preview: ${this.status.port}`;
      this.statusBarItem.tooltip = `Click to stop preview (running on port ${this.status.port})`;
      this.statusBarItem.show();
    } else if (this.status.isStarting) {
      this.statusBarItem.text = `$(loading~spin) Starting...`;
      this.statusBarItem.tooltip = 'Starting preview server...';
      this.statusBarItem.show();
    } else {
      this.statusBarItem.text = '$(globe) Preview';
      this.statusBarItem.tooltip = 'Click to start preview or create new project';
      this.statusBarItem.show();
    }
  }

  private async startPreview(): Promise<void> {
    if (this.status.isRunning || this.status.isStarting) {
      vscode.window.showInformationMessage('Preview is already running or starting');
      return;
    }
    
    // Try to detect project configuration if not already set
    if (!this.config) {
      this.outputChannel.appendLine('🔍 No configuration found, attempting to detect project...');
      try {
        this.config = await this.detectProjectConfig();
        this.outputChannel.appendLine('✅ Project configuration detected');
        this.updateStatusBar();
      } catch (error) {
        this.outputChannel.appendLine(`❌ Failed to detect project configuration: ${error}`);
        vscode.window.showErrorMessage(`No project configuration found. Error: ${error}\n\nPlease ensure you have a package.json with appropriate scripts, or create a new project using the Templates panel.`);
        return;
      }
    }

    this.status.isStarting = true;
    this.updateStatusBar();

    try {
      const port = await this.findAvailablePort(this.config.port);
      
      this.outputChannel.appendLine(`🚀 Starting preview...`);
      this.outputChannel.appendLine(`🔍 Checking for existing processes...`);
      this.outputChannel.appendLine(`📜 Using script: ${this.config.script}`);
      
      // Kill existing processes
      await this.killExistingProcesses(port);
      
      // Check if terminal is available and use appropriate method
      if (vscode.window.terminals.length > 0) {
        this.outputChannel.appendLine(`ℹ️ Using terminal-based execution to avoid Pty Host interference`);
        await this.startPreviewInTerminal(port);
      } else {
        this.outputChannel.appendLine(`ℹ️ Using process-based execution`);
        const process = await this.spawnProcess(this.config.script, port, vscode.workspace.workspaceFolders![0].uri.fsPath);
        this.status.process = process;
        this.status.port = port;
        this.status.url = `http://localhost:${port}`;
      }
      
      this.outputChannel.appendLine(`✅ Preview server ready on http://localhost:${port}`);
      
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to start preview: ${error}`);
      this.status.isStarting = false;
      this.updateStatusBar();
      
      // Provide more helpful error messages
      let errorMessage = `Failed to start preview: ${error}`;
      
      if (error instanceof Error && error.message.includes('No suitable start script found')) {
        errorMessage = `Missing start script in package.json. Please add a "dev" or "start" script to run your project.`;
      } else if (error instanceof Error && error.message.includes('command not found')) {
        errorMessage = `Script "${this.config?.script}" not found in package.json. Please check your npm scripts configuration.`;
      }
      
      vscode.window.showErrorMessage(errorMessage);
      
      // Show helpful action buttons
      this.showScriptFixOptions();
    }
  }

  private async startPreviewInTerminal(port: number): Promise<void> {
    try {
      // Create a new terminal for the preview
      const terminal = vscode.window.createTerminal({
        name: `Pistachio Preview - Port ${port}`,
        cwd: vscode.workspace.workspaceFolders![0].uri.fsPath
      });

      // Show the terminal
      terminal.show();

      // Send the command to start the preview
      const command = `npm run ${this.config!.script}`;
      terminal.sendText(command);

      this.outputChannel.appendLine(`🚀 Started preview in terminal: ${command}`);
      this.outputChannel.appendLine(`📱 Terminal: ${terminal.name}`);

      // Update status
      this.status.port = port;
      this.status.url = `http://localhost:${port}`;
      this.status.isRunning = true;
      this.status.isStarting = false;

      // Store terminal reference for cleanup
      this.status.terminal = terminal;

      // Monitor terminal for output
      this.monitorTerminalOutput(terminal, port);

    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to start preview in terminal: ${error}`);
      throw error;
    }
  }

  private monitorTerminalOutput(terminal: vscode.Terminal, port: number): void {
    // Note: VS Code doesn't provide direct access to terminal output
    // We'll use a polling approach to check if the server is ready
    const checkInterval = setInterval(async () => {
      try {
        // Check if the port is actually listening
        const isPortListening = await this.checkPortListening(port);
        if (isPortListening && !this.status.isRunning) {
          this.outputChannel.appendLine(`✅ Port ${port} is now listening - server ready!`);
          this.onServerReady(port);
          clearInterval(checkInterval);
        }
      } catch (error) {
        // Continue checking
      }
    }, 2000); // Check every 2 seconds

    // Clean up interval after 5 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 5 * 60 * 1000);
  }

  private async checkPortListening(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      socket.setTimeout(1000); // 1 second timeout
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(port, 'localhost');
    });
  }

  private async stopPreview(): Promise<void> {
    if (!this.status.isRunning && !this.status.isStarting) {
      vscode.window.showInformationMessage('No preview is running');
      return;
    }

    this.outputChannel.appendLine('🛑 Stopping preview...');

    // Store the current port for process killing
    const currentPort = this.status.port;

    // Stop process if running
    if (this.status.process) {
      try {
        this.outputChannel.appendLine('🔄 Terminating process...');
        // Try graceful shutdown first
        this.status.process.kill('SIGTERM');
        
        // Wait a bit for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Force kill if still running
        if (!this.status.process.killed) {
          this.outputChannel.appendLine('🔨 Force killing process...');
          this.status.process.kill('SIGKILL');
        }
        
        this.status.process = null;
        this.outputChannel.appendLine('✅ Process terminated');
      } catch (error) {
        this.outputChannel.appendLine(`⚠️ Error stopping process: ${error}`);
        // Force cleanup
        this.status.process = null;
      }
    }

    // Stop terminal if running
    if (this.status.terminal) {
      try {
        this.outputChannel.appendLine('🔄 Stopping terminal...');
        // Send Ctrl+C to the terminal
        this.status.terminal.sendText('\x03'); // Ctrl+C
        
        // Wait a bit for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Dispose the terminal
        this.status.terminal.dispose();
        this.status.terminal = undefined;
        this.outputChannel.appendLine('✅ Terminal stopped');
      } catch (error) {
        this.outputChannel.appendLine(`⚠️ Error stopping terminal: ${error}`);
        // Force cleanup
        this.status.terminal = undefined;
      }
    }

    // Kill any remaining processes on the port (nuclear option)
    if (currentPort) {
      try {
        this.outputChannel.appendLine(`🔫 Killing any remaining processes on port ${currentPort}...`);
        await this.killExistingProcesses(currentPort);
        
        // Wait a moment and verify the port is free
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const isStillListening = await this.checkPortListening(currentPort);
        if (isStillListening) {
          this.outputChannel.appendLine(`⚠️ Port ${currentPort} is still in use after cleanup attempt`);
          vscode.window.showWarningMessage(`Server may still be running on port ${currentPort}. You may need to manually stop it.`);
        } else {
          this.outputChannel.appendLine(`✅ Port ${currentPort} is now free`);
        }
      } catch (error) {
        this.outputChannel.appendLine(`⚠️ Error cleaning up port ${currentPort}: ${error}`);
      }
    }

    // Reset status
    this.status.isRunning = false;
    this.status.isStarting = false;
    this.status.port = null;
    this.status.url = null;

    // Update context key for command palette
    vscode.commands.executeCommand('setContext', 'preview.isRunning', false);
    
    // Update UI manager with stopped status
    this.uiManager.resetProjectStatus();

    this.updateStatusBar();
    this.outputChannel.appendLine('✅ Preview stopped completely');
    
    // Show confirmation to user
    vscode.window.showInformationMessage('Preview server stopped');
  }

  private async createNewProject(): Promise<void> {
    if (this.isCreatingProject) {
      vscode.window.showInformationMessage('Project creation already in progress');
        return;
    }

    const template = await vscode.window.showQuickPick(
      this.projectTemplates.map(t => ({
        label: t.name,
        description: t.description,
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

    this.isCreatingProject = true;

    try {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        throw new Error('No workspace folder found');
      }

      this.outputChannel.appendLine(`🚀 Creating new ${selectedTemplate.name} project...`);
      this.outputChannel.appendLine(`Command: ${selectedTemplate.command}`);
    this.outputChannel.appendLine(`Working directory: ${workspaceRoot}`);
    
    // Check for Next.js naming restrictions
      if (selectedTemplate.name.toLowerCase().includes('next.js') && this.hasInvalidWorkspaceName(workspaceRoot)) {
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
        title: `Creating ${selectedTemplate.name} project...`,
      cancellable: false
    }, async (progress) => {
      progress.report({ message: 'Initializing project...' });

      // Execute the creation command
        await new Promise((resolve, reject) => {
          const commandParts = selectedTemplate.command.split(' ');
        const mainCommand = commandParts[0];
        const args = commandParts.slice(1);
        
        this.outputChannel.appendLine(`Executing: ${mainCommand} ${args.join(' ')}`);
        
        const childProcess = child_process.spawn(mainCommand, args, { 
          cwd: workspaceRoot, 
          shell: false,
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
          detached: false
        });

        let output = '';
        let errorOutput = '';
        
          childProcess.stdout.on('data', (data) => {
            const dataStr = data.toString();
            output += dataStr;
            this.outputChannel.appendLine(`[OUTPUT] ${dataStr.trim()}`);
          });

          childProcess.stderr.on('data', (data) => {
            const dataStr = data.toString();
            errorOutput += dataStr;
            this.outputChannel.appendLine(`[ERROR] ${dataStr.trim()}`);
        });

        childProcess.on('close', (code: number) => {
          this.outputChannel.appendLine(`[EXIT] Process exited with code ${code}`);
          this.outputChannel.appendLine(`[OUTPUT] Full output: ${output}`);
          if (errorOutput) {
            this.outputChannel.appendLine(`[ERRORS] Error output: ${errorOutput}`);
          }
          
          if (code === 0) {
            this.outputChannel.appendLine(`✅ Project created successfully!`);
              resolve(undefined);
          } else {
            reject(new Error(`Project creation failed with code ${code}. Check the output for details.`));
          }
        });
      });

      progress.report({ message: 'Setting up project...' });
      
      // Wait a bit for files to be written
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Handle Next.js subdirectory creation
      if (selectedTemplate.name.toLowerCase().includes('next.js')) {
        try {
          const nextAppDir = path.join(workspaceRoot, 'my-nextjs-app');
          if (fs.existsSync(nextAppDir)) {
            this.outputChannel.appendLine('🔄 Moving Next.js files from subdirectory to workspace root...');
            
            // Move all files from my-nextjs-app to workspace root
            const files = fs.readdirSync(nextAppDir);
            for (const file of files) {
              const sourcePath = path.join(nextAppDir, file);
              const targetPath = path.join(workspaceRoot, file);
              
              if (fs.statSync(sourcePath).isDirectory()) {
                // Move directory
                if (fs.existsSync(targetPath)) {
                  fs.rmSync(targetPath, { recursive: true, force: true });
                }
                fs.renameSync(sourcePath, targetPath);
              } else {
                // Move file
                if (fs.existsSync(targetPath)) {
                  fs.unlinkSync(targetPath);
                }
                fs.renameSync(sourcePath, targetPath);
              }
            }
            
            // Remove the empty my-nextjs-app directory
            fs.rmdirSync(nextAppDir);
            this.outputChannel.appendLine('✅ Next.js files moved to workspace root');
          }
        } catch (error) {
          this.outputChannel.appendLine(`⚠️ Warning: Could not move Next.js files: ${error}`);
        }
      }
      
      // Update package.json with proper scripts for React projects
        if (selectedTemplate.name.toLowerCase().includes('react') && !selectedTemplate.name.toLowerCase().includes('fullstack')) {
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
    });

    // Show success message and offer to start preview
    const action = await vscode.window.showInformationMessage(
        `🎉 ${selectedTemplate.name} project created successfully! Start preview now?`,
      'Start Preview', 'Later'
    );

    if (action === 'Start Preview') {
      // Set the config for the new project
      this.config = {
          framework: selectedTemplate.name.toLowerCase().includes('next') ? 'next' :
                     selectedTemplate.name.toLowerCase().includes('vite') ? 'vite' :
                     selectedTemplate.name.toLowerCase().includes('astro') ? 'astro' :
                     selectedTemplate.name.toLowerCase().includes('remix') ? 'remix' :
                     selectedTemplate.name.toLowerCase().includes('gatsby') ? 'gatsby' : 'generic',
          port: selectedTemplate.name.toLowerCase().includes('vite') ? 5173 : selectedTemplate.port,
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

    } catch (error) {
      this.outputChannel.appendLine(`❌ Error creating project: ${error}`);
      vscode.window.showErrorMessage(`Failed to create project: ${error}`);
    } finally {
      this.isCreatingProject = false;
    }
  }

  private hasInvalidWorkspaceName(workspacePath: string): boolean {
    const folderName = path.basename(workspacePath);
    return /[A-Z]/.test(folderName) || /[^a-z0-9-]/.test(folderName);
  }

  private async offerAlternativeTemplates(): Promise<void> {
    const alternatives = [
      {
        label: 'Simple React',
        description: 'Basic React app with Vite (no naming restrictions)',
        template: this.projectTemplates.find(t => t.name === 'Simple React')
      },
      {
        label: 'Simple HTML/CSS/JS',
        description: 'Basic static site (no naming restrictions)',
        template: this.projectTemplates.find(t => t.name === 'Simple HTML/CSS/JS')
      }
    ].filter(t => t.template);

    const selected = await vscode.window.showQuickPick(alternatives, {
      placeHolder: 'Choose an alternative template without naming restrictions...',
      ignoreFocusOut: true
    });

    if (selected && selected.template) {
      // Temporarily replace the template name to avoid the naming check
      const originalName = selected.template.name;
      selected.template.name = 'Alternative Template';
      
      try {
        // Create a new project with the selected template
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspaceRoot) {
          await this.createNewProject();
        }
      } finally {
        selected.template.name = originalName;
      }
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
          shell: false,
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
          detached: false
        });

        let output = '';
        let errorOutput = '';

        childProcess.stdout.on('data', (data) => {
          const dataStr = data.toString();
          output += dataStr;
          this.outputChannel.appendLine(`[OUTPUT] ${dataStr.trim()}`);
        });

        childProcess.stderr.on('data', (data) => {
          const dataStr = data.toString();
          errorOutput += dataStr;
          this.outputChannel.appendLine(`[ERROR] ${dataStr.trim()}`);
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

  private registerViewProviders(): void {
    // Register template view provider
    const templatePanel = TemplatePanel.getInstance();
    const templateProvider = new TemplateViewProvider(templatePanel, this.contextKey.extensionUri);
    this.contextKey.subscriptions.push(
      vscode.window.registerWebviewViewProvider('preview.templates', templateProvider)
    );

    // Register project control view provider
    const projectControlPanel = ProjectControlPanel.getInstance();
    const projectControlProvider = new ProjectControlViewProvider(projectControlPanel, this.contextKey.extensionUri);
    this.contextKey.subscriptions.push(
      vscode.window.registerWebviewViewProvider('preview.control', projectControlProvider)
    );
  }

  private registerCommands(): void {
    // Register show UI command
    this.contextKey.subscriptions.push(
      vscode.commands.registerCommand('pistachio-vibe.showUI', () => {
        this.uiManager.showAppropriateUI();
      })
    );

    // Register run command (start preview server)
    this.contextKey.subscriptions.push(
      vscode.commands.registerCommand('pistachio-vibe.run', () => {
        this.startPreview();
      })
    );

    // Register stop command (stop preview server)
    this.contextKey.subscriptions.push(
      vscode.commands.registerCommand('pistachio-vibe.stop', () => {
        this.stopPreview();
      })
    );

    // Register restart command
    this.contextKey.subscriptions.push(
      vscode.commands.registerCommand('pistachio-vibe.restart', () => {
        this.restartPreview();
      })
    );

    // Register create project command
    this.contextKey.subscriptions.push(
      vscode.commands.registerCommand('pistachio-vibe.createProject', () => {
        this.createNewProject();
      })
    );

    // Register show templates command
    this.contextKey.subscriptions.push(
      vscode.commands.registerCommand('pistachio-vibe.showTemplates', () => {
        this.uiManager.showTemplateSelection();
      })
    );

    // Register show project control command
    this.contextKey.subscriptions.push(
      vscode.commands.registerCommand('pistachio-vibe.showProjectControl', () => {
        this.uiManager.showProjectControl();
      })
    );

    // Register reload UI command
    this.contextKey.subscriptions.push(
      vscode.commands.registerCommand('pistachio-vibe.reloadUI', () => {
        this.uiManager.showAppropriateUI();
      })
    );

    // Register refresh project configuration command
    this.contextKey.subscriptions.push(
      vscode.commands.registerCommand('pistachio-vibe.refreshConfig', async () => {
        this.outputChannel.appendLine('🔄 Refreshing project configuration...');
        try {
          this.config = await this.detectProjectConfig();
          this.outputChannel.appendLine('✅ Project configuration refreshed successfully');
          this.updateStatusBar();
          vscode.window.showInformationMessage('Project configuration refreshed successfully!');
        } catch (error) {
          this.outputChannel.appendLine(`❌ Failed to refresh project configuration: ${error}`);
          vscode.window.showErrorMessage(`Failed to refresh project configuration: ${error}`);
        }
      })
    );

    // Keep the old commands for backward compatibility
    this.contextKey.subscriptions.push(
      vscode.commands.registerCommand('pistachio-vibe.startPreview', () => {
        this.startPreview();
      })
    );

    this.contextKey.subscriptions.push(
      vscode.commands.registerCommand('pistachio-vibe.stopPreview', () => {
        this.stopPreview();
      })
    );

    this.contextKey.subscriptions.push(
      vscode.commands.registerCommand('pistachio-vibe.createNewProject', () => {
        this.createNewProject();
      })
    );

    this.contextKey.subscriptions.push(
      vscode.commands.registerCommand('pistachio-vibe.openPreview', (url: string) => {
        // Open preview in browser
        vscode.env.openExternal(vscode.Uri.parse(url));
      })
    );
  }

  public dispose(): void {
    this.statusBarItem.dispose();
    if (this.status.process) {
      try {
        // Graceful shutdown
        this.status.process.kill('SIGTERM');
        
        // Force kill after a short delay if needed
        setTimeout(() => {
          if (this.status.process && !this.status.process.killed) {
            this.status.process.kill('SIGKILL');
          }
        }, 1000);
        
        this.status.process = null;
      } catch (error) {
        this.outputChannel.appendLine(`⚠️ Error during cleanup: ${error}`);
      }
    }
  }
}

export function activate(context: vscode.ExtensionContext): void {
  console.log('Pistachio Vibe extension is now active!');
  
  const previewManager = new PreviewManager(context);
  context.subscriptions.push(previewManager);
  
  // Initialize after workspace is ready
  vscode.workspace.onDidChangeWorkspaceFolders(() => {
    previewManager.initialize();
  });
  
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    previewManager.initialize();
  }
}

export function deactivate(): void {
  console.log('Pistachio Vibe extension is now deactivated!');
}
