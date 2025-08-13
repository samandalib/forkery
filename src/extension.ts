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

  public async initialize(): Promise<void> {
    // Initialize the status bar after workspace is ready
    console.log('PreviewManager: Initializing...');
    
    try {
      // Try to detect existing project configuration
      if (vscode.workspace.workspaceFolders?.[0]) {
        this.outputChannel.appendLine('🔍 Detecting existing project configuration...');
        this.config = await this.detectProjectConfig();
        this.outputChannel.appendLine(`✅ Project detected: ${this.config.framework} on port ${this.config.port}`);
      }
    } catch (error) {
      this.outputChannel.appendLine(`ℹ️ No existing project detected: ${error}`);
    }
    
    this.updateStatusBar();
    console.log('PreviewManager: Initialization complete');
  }

  private registerCommands(): void {
    // These commands are already declared in package.json, so they should work
    // But we need to ensure they're properly bound to the instance methods
    vscode.commands.registerCommand('preview.run', () => {
      this.outputChannel.appendLine('🎯 Preview: Run command executed');
      this.startPreview();
    });
    vscode.commands.registerCommand('preview.stop', () => {
      this.outputChannel.appendLine('🛑 Preview: Stop command executed');
      this.stopPreview();
    });
    vscode.commands.registerCommand('preview.restart', () => {
      this.outputChannel.appendLine('🔄 Preview: Restart command executed');
      this.restartPreview();
    });
    vscode.commands.registerCommand('preview.createProject', () => {
      this.outputChannel.appendLine('🚀 Preview: Create Project command executed');
      this.createNewProject();
    });
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
    strictPort: true,
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
    
    // Check for fullstack projects first
    if (scripts.dev && scripts['dev:backend'] && scripts['dev:frontend']) {
      framework = 'fullstack';
      this.outputChannel.appendLine(`🎯 Detected fullstack project with backend and frontend scripts`);
    } else if (dependencies.next) framework = 'next';
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
      case 'fullstack':
        port = 3000; // Frontend port for fullstack
        this.outputChannel.appendLine(`🎯 Detected fullstack project - using frontend port 3000`);
        break;
      case 'vite': 
        port = 5173; 
        this.outputChannel.appendLine(`🎯 Detected Vite project - using port 5173`);
        break;
      case 'next': 
        port = 3000; 
        this.outputChannel.appendLine(`🎯 Detected Next.js project - using port 3000`);
        break;
      case 'gatsby': 
        port = 8000; 
        this.outputChannel.appendLine(`🎯 Detected Gatsby project - using port 8000`);
        break;
      case 'astro': 
        port = 4321; 
        this.outputChannel.appendLine(`🎯 Detected Astro project - using port 4321`);
        break;
      case 'remix': 
        port = 3000; 
        this.outputChannel.appendLine(`🎯 Detected Remix project - using port 3000`);
        break;
      default: 
        port = 3000; 
        this.outputChannel.appendLine(`🎯 Generic project - using port 3000`);
        break;
    }

    // Check if custom port is configured
    const config = vscode.workspace.getConfiguration('preview');
    const customPort = config.get<number>('port');
    if (customPort) {
      this.outputChannel.appendLine(`⚠️ Custom port override detected: ${customPort} (framework default: ${port})`);
      
      // For Vite projects, always respect the Vite config port, not custom override
      if (framework === 'vite') {
        this.outputChannel.appendLine(`🎯 Vite project detected - ignoring custom port override, using Vite config port`);
        // We'll validate the Vite config port later
      } else {
        port = customPort;
      }
    } else {
      this.outputChannel.appendLine(`✅ Using framework default port: ${port}`);
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
      // Update package.json with fullstack scripts
      const packageJsonPath = path.join(workspaceRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Add fullstack scripts
      packageJson.scripts = {
        "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
        "dev:backend": "nodemon backend/server.js",
        "dev:frontend": template.name.toLowerCase().includes('next') ? "cd frontend && npm run dev" : "cd frontend && npm run dev",
        "build": "npm run build:frontend",
        "build:frontend": template.name.toLowerCase().includes('next') ? "cd frontend && npm run build" : "cd frontend && npm run build",
        "start": "node backend/server.js"
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
      
      // Create backend structure
      await this.createBackendStructure(workspaceRoot);
      
      // Create frontend structure
      await this.createFrontendStructure(template, workspaceRoot);
      
      // Create root README
      await this.createFullstackReadme(template, workspaceRoot);
      
      this.outputChannel.appendLine('✅ Fullstack project structure created successfully');
      
    } catch (error) {
      this.outputChannel.appendLine(`❌ Error creating fullstack project: ${error}`);
      throw error;
    }
  }

  private async createBackendStructure(workspaceRoot: string): Promise<void> {
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
    
    // Create Express server
    const serverContent = `const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

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
    
    this.outputChannel.appendLine('✅ Backend structure created (server.js, package.json)');
  }

  private async createFrontendStructure(template: ProjectTemplate, workspaceRoot: string): Promise<void> {
    const frontendDir = path.join(workspaceRoot, 'frontend');
    
    if (template.name.toLowerCase().includes('next')) {
      // Create Next.js frontend
      await this.createNextjsFrontend(frontendDir);
    } else {
      // Create React frontend
      await this.createReactFrontend(frontendDir);
    }
  }

  private async createNextjsFrontend(frontendDir: string): Promise<void> {
    // Create Next.js package.json
    const nextPackageJson = {
      name: "frontend",
      version: "1.0.0",
      description: "Next.js frontend for fullstack application",
      scripts: {
        "dev": "next dev",
        "build": "next build",
        "start": "next start"
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
        "typescript": "^5.0.0"
      }
    };
    
    fs.writeFileSync(path.join(frontendDir, 'package.json'), JSON.stringify(nextPackageJson, null, 2));
    
    // Create basic Next.js structure
    const pagesDir = path.join(frontendDir, 'pages');
    const apiDir = path.join(frontendDir, 'pages/api');
    
    fs.mkdirSync(pagesDir, { recursive: true });
    fs.mkdirSync(apiDir, { recursive: true });
    
    // Create index page
    const indexPage = `import { useState, useEffect } from 'react';

export default function Home() {
  const [backendData, setBackendData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/data')
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
        <p><strong>Backend:</strong> http://localhost:5000</p>
        <p><strong>Frontend:</strong> http://localhost:3000</p>
      </div>
    </div>
  );
}`;
    
    fs.writeFileSync(path.join(frontendDir, 'pages/index.js'), indexPage);
    
    this.outputChannel.appendLine('✅ Next.js frontend structure created');
  }

  private async createReactFrontend(frontendDir: string): Promise<void> {
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
    fetch('http://localhost:5000/api/data')
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
        <p><strong>Backend:</strong> http://localhost:5000</p>
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

---

Created with ❤️ by the One-Click Local Preview Extension
`;
    
    fs.writeFileSync(path.join(workspaceRoot, 'README.md'), readmeContent);
          this.outputChannel.appendLine('✅ Fullstack README created');
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
    try {
      this.outputChannel.appendLine(`🔍 Checking if port ${desiredPort} is available...`);
      const availablePort = await detectPort(desiredPort);
      
      if (availablePort === desiredPort) {
        this.outputChannel.appendLine(`✅ Port ${desiredPort} is available`);
      } else {
        this.outputChannel.appendLine(`⚠️ Port ${desiredPort} was busy, using ${availablePort} instead`);
        
        // For Vite projects, update the Vite config to use the new port
        if (this.config?.framework === 'vite') {
          await this.updateViteConfigPort(availablePort);
        }
      }
      
      return availablePort;
    } catch (error) {
      this.outputChannel.appendLine(`❌ Port detection failed: ${error}`);
      this.outputChannel.appendLine(`🔄 Falling back to requested port ${desiredPort}`);
      return desiredPort;
    }
  }

  private async startPreview(): Promise<void> {
    try {
      if (this.status.isRunning || this.status.isStarting) {
        this.outputChannel.appendLine('⚠️ Preview already running or starting');
        return;
      }

      this.status.isStarting = true;
      this.updateStatusBar();

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
      this.outputChannel.appendLine(`❌ Error starting preview: ${error}`);
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

    if (this.config.framework === 'fullstack') {
      this.outputChannel.appendLine(`Starting fullstack project with backend and frontend...`);
      this.outputChannel.appendLine(`Command: ${command} ${args.join(' ')}`);
      this.outputChannel.appendLine(`Working directory: ${workspaceRoot}`);
      this.outputChannel.appendLine(`Script to run: ${this.config.script} (concurrently runs both servers)`);
      this.outputChannel.appendLine(`Backend port: 5000, Frontend port: ${port}`);
      this.outputChannel.appendLine(`Fullstack mode: Backend + Frontend running simultaneously`);
    } else {
      this.outputChannel.appendLine(`Starting ${this.config.framework} server on port ${port}...`);
      this.outputChannel.appendLine(`Command: ${command} ${args.join(' ')}`);
      this.outputChannel.appendLine(`Working directory: ${workspaceRoot}`);
      this.outputChannel.appendLine(`Script to run: ${this.config.script}`);
      this.outputChannel.appendLine(`Expected port: ${port}`);
      if (this.config.framework === 'vite') {
        this.outputChannel.appendLine(`Vite config will use strictPort: true to force this port`);
      }
    }

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
      case 'fullstack':
        // For fullstack, we need both backend and frontend to be ready
        return (lowerOutput.includes('backend') && lowerOutput.includes('frontend')) ||
               (lowerOutput.includes('concurrently') && lowerOutput.includes('ready')) ||
               lowerOutput.includes('ready') || lowerOutput.includes('started') || lowerOutput.includes('listening');
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

  private async restartPreview(): Promise<void> {
    this.stopPreview();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
    await this.startPreview();
  }

  private updateStatusBar(): void {
    console.log('PreviewManager: updateStatusBar called');
    
    if (this.status.isStarting) {
      this.statusBarItem.text = '⟳ Starting...';
      this.statusBarItem.tooltip = 'Preview server is starting...\nClick to stop';
      this.statusBarItem.command = 'preview.stop';
    } else if (this.status.isRunning) {
      this.statusBarItem.text = `● Preview: Running on :${this.status.port}`;
      this.statusBarItem.tooltip = `Preview running on ${this.status.url}\nClick to stop | Cmd+Shift+P → "Preview: Restart" to restart`;
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
