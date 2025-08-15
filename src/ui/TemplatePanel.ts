import * as vscode from 'vscode';



export class TemplatePanel {
  private static instance: TemplatePanel;
  private view: vscode.WebviewView | undefined;

  public static getInstance(): TemplatePanel {
    if (!TemplatePanel.instance) {
      TemplatePanel.instance = new TemplatePanel();
    }
    return TemplatePanel.instance;
  }

  public show(): void {
    // The sidebar view is automatically shown when the extension activates
    // This method is kept for compatibility but the view is managed by VS Code
  }

  public setView(view: vscode.WebviewView): void {
    console.log('TemplatePanel: setView called with view:', view);
    this.view = view;
    
    // Set webview options for security
    this.view.webview.options = {
      enableScripts: true,
      localResourceRoots: []
    };
    
    // Set the HTML content
    const htmlContent = this.getWebviewContent();
    console.log('TemplatePanel: Setting HTML content, length:', htmlContent.length);
    
    this.view.webview.html = htmlContent;
    
    // Handle messages from webview
    this.view.webview.onDidReceiveMessage(
      message => {
        console.log('TemplatePanel: Received message:', message);
        switch (message.command) {
          case 'createProject':
            // Execute project creation with the specific template ID
            this.createProjectWithTemplate(message.templateId, message.templateName);
            break;
        }
      }
    );
    
    console.log('TemplatePanel: View setup complete');
  }

  /**
   * Create project directly with the selected template, bypassing the dropdown
   */
  private async createProjectWithTemplate(templateId: string, templateName: string): Promise<void> {
    console.log(`TemplatePanel: Creating project with template ${templateId}: ${templateName}`);
    
    // Map template IDs to actual template commands
    const templateMap: { [key: string]: { command: string, port: number, dependencies: string[] } } = {
      'express-react': {
        command: 'npm init -y && mkdir -p backend frontend',
        port: 3000,
        dependencies: ['express', 'react', 'react-dom', 'cors', 'nodemon']
      },
      'node-nextjs': {
        command: 'npm init -y && mkdir -p backend frontend',
        port: 3000,
        dependencies: ['express', 'next', 'react', 'react-dom', 'cors', 'nodemon']
      },
      'simple-react': {
        command: 'npm init -y && npm install react react-dom && npm install --save-dev @vitejs/plugin-react vite && mkdir -p src && echo \'{"scripts":{"dev":"vite","build":"vite build","preview":"vite preview"}}\' > package.json && echo "import React from \'react\'; import ReactDOM from \'react-dom/client\'; import App from \'./App\'; ReactDOM.createRoot(document.getElementById(\'root\')).render(<App />);" > main.jsx && echo "import React from \'react\'; function App() { return <div><h1>Simple React App</h1><p>Built with Vite</p></div>; } export default App;" > App.jsx && echo "<!DOCTYPE html><html><head><title>React App</title></head><body><div id=\"root\"></div><script type=\"module\" src=\"/main.jsx\"></script></body></html>" > index.html && mv *.jsx src/ && mv index.html . && echo "import { defineConfig } from \'vite\'; import react from \'@vitejs/plugin-react\'; export default defineConfig({ plugins: [react()] });" > vite.config.js',
        port: 5173,
        dependencies: ['vite', 'react', 'react-dom']
      },
      'nextjs-app': {
        command: 'npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes --use-npm',
        port: 3000,
        dependencies: ['next', 'react', 'react-dom']
      },
      'simple-html': {
        command: 'npm init -y && npm install --save-dev live-server && echo \'{"scripts":{"start":"live-server --port=8080 --open=/","dev":"live-server --port=8080 --open=/"}}\' > package.json && echo "<!DOCTYPE html><html><head><title>Simple HTML Site</title><style>body{font-family:Arial,sans-serif;margin:40px;background:#f5f5f5}h1{color:#333}p{color:#666}</style></head><body><h1>Welcome to Your HTML Site</h1><p>This is a simple HTML/CSS/JS site with live reload.</p><script>console.log(\'Site loaded!\');</script></body></html>" > index.html',
        port: 8080,
        dependencies: ['live-server']
      }
    };

    const template = templateMap[templateId];
    if (!template) {
      vscode.window.showErrorMessage(`Unknown template: ${templateId}`);
      return;
    }

    // Confirm project creation
    const confirm = await vscode.window.showInformationMessage(
      `Create new ${templateName} project? This will set up a ${templateName} project with port ${template.port}.`,
      'Yes', 'No'
    );

    if (confirm !== 'Yes') return;

    // Execute the project creation command directly
    try {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
      }

      // For fullstack templates, use the createFullstackProject method
      if (templateId === 'express-react' || templateId === 'node-nextjs') {
        const progress = {
          report: (message: { message: string }) => {
            console.log(`Progress: ${message.message}`);
          }
        };
        
        await this.createFullstackProject({
          name: templateName,
          templateId: templateId
        }, workspaceRoot, progress);
      } else {
        // For non-fullstack templates, use the old method
        await this.executeProjectCreation({
          name: templateName,
          description: `${templateName} project`,
          command: template.command,
          port: template.port,
          dependencies: template.dependencies,
          templateId: templateId
        }, workspaceRoot);
      }

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create project: ${error}`);
    }
  }

  /**
   * Execute project creation with the given template
   */
  private async executeProjectCreation(template: any, workspaceRoot: string): Promise<void> {
    // Import the necessary modules
    const vscode = require('vscode');
    const child_process = require('child_process');
    const fs = require('fs');

    // Check if workspace already has content and offer cleanup
    const files = fs.readdirSync(workspaceRoot);
    const hasContent = files.some((file: string) => 
      !file.startsWith('.') && file !== '.git' && file !== 'node_modules'
    );

    if (hasContent) {
      const action = await vscode.window.showWarningMessage(
        'This workspace contains files that may conflict with new project creation. What would you like to do?',
        'Clean Workspace', 'Create Anyway', 'Cancel'
      );
      
      if (action === 'Clean Workspace') {
        // Simple cleanup - remove non-essential files
        files.forEach((file: string) => {
          if (!file.startsWith('.') && file !== '.git' && file !== 'node_modules') {
            const filePath = require('path').join(workspaceRoot, file);
            if (fs.lstatSync(filePath).isDirectory()) {
              fs.rmSync(filePath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(filePath);
            }
          }
        });
      } else if (action === 'Cancel') {
        return;
      }
    }

    // Show progress
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Creating ${template.name} project...`,
      cancellable: false
    }, async (progress: any) => {
      progress.report({ message: 'Initializing project...' });

      // Handle fullstack templates specially
      if (template.templateId === 'express-react' || template.templateId === 'node-nextjs') {
        await this.createFullstackProject(template, workspaceRoot, progress);
        return;
      }

      // Handle Next.js templates specially
      if (template.templateId === 'nextjs-app') {
        await this.createNextJsProject(template, workspaceRoot, progress);
        return;
      }

      // Execute the creation command for other templates
      await new Promise<void>((resolve, reject) => {
        const commandParts = template.command.split(' ');
        const mainCommand = commandParts[0];
        const args = commandParts.slice(1);
        
        console.log(`Executing: ${mainCommand} ${args.join(' ')}`);
        
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
          console.log(`[STDOUT] ${text}`);
          
          if (text.includes('Installing packages') || text.includes('npm install')) {
            progress.report({ message: 'Installing dependencies...' });
          } else if (text.includes('Success!') || text.includes('Done') || text.includes('created successfully')) {
            progress.report({ message: 'Project created successfully!' });
          }
        });

        childProcess.stderr?.on('data', (data: Buffer) => {
          const text = data.toString();
          errorOutput += text;
          console.log(`[STDERR] ${text}`);
        });

        childProcess.on('error', (error: Error) => {
          console.log(`[ERROR] Process error: ${error.message}`);
          reject(new Error(`Process error: ${error.message}`));
        });

        childProcess.on('close', (code: number) => {
          console.log(`[EXIT] Process exited with code ${code}`);
          console.log(`[OUTPUT] Full output: ${output}`);
          
          if (code === 0) {
            vscode.window.showInformationMessage(
              `🎉 ${template.name} project created successfully! Start preview now?`,
              'Start Preview', 'Not Now'
            ).then((action: string | undefined) => {
              if (action === 'Start Preview') {
                vscode.commands.executeCommand('preview.run');
              }
            });
            resolve();
          } else {
            reject(new Error(`Process exited with code ${code}: ${errorOutput}`));
          }
        });
      });
    });
  }

  /**
   * Create fullstack project with proper file structure and scripts
   */
  private async createFullstackProject(template: any, workspaceRoot: string, progress: any): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    const child_process = require('child_process');
    const detectPort = require('detect-port');

    try {
      progress.report({ message: 'Detecting available ports...' });
      
      // Detect available port for backend (start from 3001 to avoid conflicts with frontend)
      const backendPort = await detectPort(3001);
      progress.report({ message: `Detected backend port: ${backendPort}` });
      
      // Ensure directories exist
      const backendPath = path.join(workspaceRoot, 'backend');
      const frontendPath = path.join(workspaceRoot, 'frontend');
      
      // Create directories if they don't exist
      if (!fs.existsSync(backendPath)) {
        fs.mkdirSync(backendPath, { recursive: true });
      }
      if (!fs.existsSync(frontendPath)) {
        fs.mkdirSync(frontendPath, { recursive: true });
      }
      
      progress.report({ message: 'Setting up backend...' });
      
      // Setup backend
      const backendPackageJson = {
        name: 'backend',
        version: '1.0.0',
        scripts: {
          start: 'node server.js',
          dev: 'nodemon server.js'
        },
        dependencies: {
          express: '^4.18.2',
          cors: '^2.8.5'
        },
        devDependencies: {
          nodemon: '^3.0.1'
        }
      };

      fs.writeFileSync(path.join(backendPath, 'package.json'), JSON.stringify(backendPackageJson, null, 2));
      
      const serverJs = `const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || ${backendPort};

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: '${template.name} backend running!' });
});

app.get('/api/data', (req, res) => {
  res.json({ 
    message: 'Sample data from backend',
    items: ['Item 1', 'Item 2', 'Item 3'],
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`;

      fs.writeFileSync(path.join(backendPath, 'server.js'), serverJs);

      progress.report({ message: 'Installing backend dependencies...' });
      await new Promise<void>((resolve, reject) => {
        const childProcess = require('child_process').spawn('npm', ['install'], { 
          cwd: backendPath, 
          stdio: 'pipe',
          shell: true 
        });
        childProcess.on('close', (code: number) => {
          if (code === 0) resolve();
          else reject(new Error(`Backend npm install failed with code ${code}`));
        });
      });

      progress.report({ message: 'Setting up frontend...' });
      
      // Setup frontend
      
      if (template.templateId === 'express-react') {
        // Create React + Vite frontend
        const frontendPackageJson = {
          name: 'frontend',
          version: '1.0.0',
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview'
          },
          dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0'
          },
          devDependencies: {
            '@vitejs/plugin-react': '^4.0.3',
            vite: '^4.4.5'
          }
        };

        fs.writeFileSync(path.join(frontendPath, 'package.json'), JSON.stringify(frontendPackageJson, null, 2));
        
        const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  }
})`;

        fs.writeFileSync(path.join(frontendPath, 'vite.config.js'), viteConfig);
        
        const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${template.name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;

        fs.writeFileSync(path.join(frontendPath, 'index.html'), indexHtml);
        
        const srcPath = path.join(frontendPath, 'src');
        fs.mkdirSync(srcPath, { recursive: true });
        
        const mainJsx = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`;

        fs.writeFileSync(path.join(srcPath, 'main.jsx'), mainJsx);
        
        const appJsx = `import React, { useState, useEffect } from 'react'

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
      <h1>${template.name}</h1>
      <p>Backend: Express.js (Port ${backendPort}) | Frontend: React + Vite (Port 3000)</p>
      
      <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>Backend Connection Status:</h3>
        {loading ? (
          <p>Loading data from backend...</p>
        ) : backendData ? (
          <div>
            <p><strong>Message:</strong> {backendData.message}</p>
          </div>
        ) : (
          <p>No data received from backend</p>
        )}
      </div>
    </div>
  )
}

export default App`;

        fs.writeFileSync(path.join(srcPath, 'App.jsx'), appJsx);

      } else if (template.templateId === 'node-nextjs') {
        // Create Next.js frontend
        progress.report({ message: 'Creating Next.js frontend...' });
        await new Promise<void>((resolve, reject) => {
          const childProcess = require('child_process').spawn('npx', ['create-next-app@latest', '.', '--typescript', '--tailwind', '--eslint', '--app', '--src-dir', '--import-alias', '@/*', '--yes', '--use-npm'], { 
            cwd: frontendPath, 
            stdio: 'pipe',
            shell: true 
          });
          childProcess.on('close', (code: number) => {
            if (code === 0) resolve();
            else reject(new Error(`Next.js creation failed with code ${code}`));
          });
        });
      }

      progress.report({ message: 'Installing frontend dependencies...' });
      await new Promise<void>((resolve, reject) => {
        const childProcess = require('child_process').spawn('npm', ['install'], { 
          cwd: frontendPath, 
          stdio: 'pipe',
          shell: true 
        });
        childProcess.on('close', (code: number) => {
          if (code === 0) resolve();
          else reject(new Error(`Frontend npm install failed with code ${code}`));
        });
      });

      progress.report({ message: 'Setting up root package.json...' });
      
      // Create root package.json with fullstack scripts
      const rootPackageJson = {
        name: 'fullstack-project',
        version: '1.0.0',
        scripts: {
          dev: 'concurrently "npm run dev:backend" "npm run dev:frontend"',
          'dev:backend': 'cd backend && npm run dev',
          'dev:frontend': 'cd frontend && npm run dev',
          start: 'cd backend && npm start',
          build: 'cd frontend && npm run build'
        },
        devDependencies: {
          concurrently: '^8.2.0'
        }
      };

      fs.writeFileSync(path.join(workspaceRoot, 'package.json'), JSON.stringify(rootPackageJson, null, 2));
      
      progress.report({ message: 'Installing root dependencies...' });
      await new Promise<void>((resolve, reject) => {
        const childProcess = require('child_process').spawn('npm', ['install'], { 
          cwd: workspaceRoot, 
          stdio: 'pipe',
          shell: true 
        });
        childProcess.on('close', (code: number) => {
          if (code === 0) resolve();
          else reject(new Error(`Root npm install failed with code ${code}`));
        });
      });

      progress.report({ message: 'Fullstack project created successfully!' });
      
      vscode.window.showInformationMessage(
        `🎉 ${template.name} fullstack project created successfully! Start preview now?`,
        'Start Preview', 'Not Now'
      ).then((action: string | undefined) => {
        if (action === 'Start Preview') {
          vscode.commands.executeCommand('preview.run');
        }
      });

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create fullstack project: ${error}`);
      throw error;
    }
  }

  /**
   * Create Next.js project with proper setup
   */
  private async createNextJsProject(template: any, workspaceRoot: string, progress: any): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    const child_process = require('child_process');

    try {
      progress.report({ message: 'Creating Next.js project...' });
      
      // Create Next.js app in the current workspace
      await new Promise<void>((resolve, reject) => {
        const childProcess = child_process.spawn('npx', [
          'create-next-app@latest', 
          '.', 
          '--typescript', 
          '--tailwind', 
          '--eslint', 
          '--app', 
          '--src-dir', 
          '--import-alias', '@/*', 
          '--yes', 
          '--use-npm'
        ], { 
          cwd: workspaceRoot, 
          stdio: 'pipe',
          shell: true 
        });

        let output = '';
        let errorOutput = '';
        
        childProcess.stdout?.on('data', (data: Buffer) => {
          const text = data.toString();
          output += text;
          console.log(`[STDOUT] ${text}`);
          
          if (text.includes('Installing packages') || text.includes('npm install')) {
            progress.report({ message: 'Installing dependencies...' });
          } else if (text.includes('Success!') || text.includes('Done') || text.includes('created successfully')) {
            progress.report({ message: 'Project created successfully!' });
          }
        });

        childProcess.stderr?.on('data', (data: Buffer) => {
          const text = data.toString();
          errorOutput += text;
          console.log(`[STDERR] ${text}`);
        });

        childProcess.on('error', (error: Error) => {
          console.log(`[ERROR] Process error: ${error.message}`);
          reject(new Error(`Process error: ${error.message}`));
        });

        childProcess.on('close', (code: number) => {
          console.log(`[EXIT] Process exited with code ${code}`);
          console.log(`[OUTPUT] Full output: ${output}`);
          
          if (code === 0) {
            progress.report({ message: 'Next.js project created successfully!' });
            resolve();
          } else {
            reject(new Error(`Next.js creation failed with code ${code}: ${errorOutput}`));
          }
        });
      });

      progress.report({ message: 'Next.js project created successfully!' });
      
      vscode.window.showInformationMessage(
        `🎉 ${template.name} project created successfully! Start preview now?`,
        'Start Preview', 'Not Now'
      ).then((action: string | undefined) => {
        if (action === 'Start Preview') {
          vscode.commands.executeCommand('preview.run');
        }
      });

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create Next.js project: ${error}`);
      throw error;
    }
  }

  /**
   * Re-render the webview HTML. Useful during development to see UI changes
   * without reinstalling the extension.
   */
  public refresh(): void {
    if (!this.view) return;
    // Recompute and apply HTML
    const htmlContent = this.getWebviewContent();
    this.view.webview.html = htmlContent;
  }

  private getWebviewContent(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Create New Project</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #1e1e1e;
            color: #ffffff;
          }
          
          .header {
            text-align: left;
            margin: 0 20px 0 0;
            padding-bottom: 20px;
          }
          
          .header p {
            color: #ffffff;
            font-size: 18px;
            font-weight: 400;
            text-align: left;
            line-height: 1.4;
            margin: 0;
            letter-spacing: 0.5px;
          }
          
          .category {
            margin: 0 0 20px 0;
          }
          
          .category h2 {
            color: #ffffff;
            padding-bottom: 4px;
            margin-bottom: 4px;
            font-size: 16px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .category-description {
            color: #cccccc;
            font-size: 13px;
            line-height: 1.4;
            margin: 0 0 12px 0;
          }
          
          .template-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 20px;
          }
          
          .template-card {
            background: #2d2d30;
            border: 1px solid #3e3e42;
            border-radius: 8px;
            padding: 16px;
            transition: all 0.2s ease;
            cursor: pointer;
            position: relative;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
          }
          
          /* Fullstack Applications - Original gray */
          body .category:first-of-type .template-card {
            background: #2a2a2e !important;
            border-color: #3a3a3e !important;
          }
          
          /* Frontend Applications - Soft sage green */
          body .category:nth-of-type(2) .template-card {
            background: #1e2a1e !important;
            border-color: #2a3a2a !important;
          }
          
          /* Simple Projects - Soft lavender */
          body .category:nth-of-type(3) .template-card {
            background: #2a1e2a !important;
            border-color: #3a2a3a !important;
          }
          
          .template-card:hover {
            border-color: #007acc;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          }
          
          /* Hover effects that maintain category distinction */
          .category:first-of-type .template-card:hover {
            background: #323236 !important;
          }
          
          .category:nth-of-type(2) .template-card:hover {
            background: #263026 !important;
          }
          
          .category:nth-of-type(3) .template-card:hover {
            background: #362636 !important;
          }
          
          .template-header {
            margin-bottom: 10px;
          }
          
          .connection-diagram {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 40px;
            padding: 8px 0;
            margin-top: 8px;
            max-width: 100%;
          }
          
          .backend-section,
          .frontend-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            min-width: 60px;
            max-width: 80px;
            flex-shrink: 1;
          }
          
          .label {
            color: #6c757d;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .framework {
            color: #ffffff;
            font-size: 20px;
            font-weight: 700;
            line-height: 1.2;
          }
          
          .template-title {
            margin: 0;
            color: #ffffff;
            font-size: 16px;
            font-weight: 600;
            line-height: 1.3;
          }
          
          .template-description {
            color: #cccccc;
            margin-bottom: 8px;
            font-size: 13px;
            line-height: 1.4;
          }
          
          .template-use-case {
            background: #1e1e1e;
            border-left: 2px solid #6c757d;
            padding: 6px 10px;
            margin-bottom: 8px;
            font-size: 12px;
            color: #cccccc;
            line-height: 1.4;
          }
          
          .pill-container {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 20px;
            justify-content: flex-start;
          }
          
          /* Pill base styles */
          .pill-container span {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: 2px solid;
            margin-right: 6px;
            transition: all 0.2s ease;
          }
          
          /* Complexity pills - White */
          .complexity-simple-app,
          .complexity-medium-app,
          .complexity-complex-app {
            color: #ffffff !important;
            border-color: #ffffff !important;
          }
          
          /* Benefit pills - Green */
          .benefit-performance,
          .benefit-deploy,
          .benefit-ecosystem,
          .benefit-seo,
          .benefit-mobile,
          .benefit-fast-dev,
          .benefit-scalable,
          .benefit-secure {
            color: #28a745 !important;
            border-color: #28a745 !important;
          }
          
          /* Build type pills - Orange */
          .build-website,
          .build-dashboard,
          .build-ecommerce,
          .build-portfolio,
          .build-api,
          .build-blog,
          .build-landing,
          .build-admin {
            color: #fd7e14 !important;
            border-color: #fd7e14 !important;
          }
          
          /* Hover effects for pills */
          .pill-container span:hover {
            background: currentColor;
            color: #ffffff !important;
          }
          
          .complexity-simple-app:hover,
          .complexity-medium-app:hover,
          .complexity-complex-app:hover {
            background: #ffffff !important;
            color: #1e1e1e !important;
          }
          
          .benefit-performance:hover,
          .benefit-deploy:hover,
          .benefit-ecosystem:hover,
          .benefit-seo:hover,
          .benefit-mobile:hover,
          .benefit-fast-dev:hover,
          .benefit-scalable:hover,
          .benefit-secure:hover {
            background: #28a745 !important;
            color: #ffffff !important;
          }
          
          .build-website:hover,
          .build-dashboard:hover,
          .build-ecommerce:hover,
          .build-portfolio:hover,
          .build-api:hover,
          .build-blog:hover,
          .build-landing:hover,
          .build-admin:hover {
            background: #fd7e14 !important;
            color: #ffffff !important;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <p>Click on a template card to create your project instantly - no additional steps required!</p>
        </div>
        
        <div class="category">
          <h2>Fullstack Applications</h2>
          <p class="category-description">If you need to have database connections, authentication, payments, or server-side logic.</p>
          <div class="template-grid">
            <div class="template-card" data-template-id="express-react">
              <div class="template-header">
                <div class="connection-diagram">
                  <div class="backend-section">
                    <div class="label">Backend</div>
                    <div class="framework">Express.js</div>
                  </div>
                  <div class="frontend-section">
                    <div class="label">Frontend</div>
                    <div class="framework">React</div>
                  </div>
                </div>
              </div>
              <p class="template-description">A complete web application with an Express.js backend server and React frontend.</p>
              <div class="template-use-case">
                <strong>Perfect for:</strong> Building full web applications, APIs with user interfaces, or when you need both server and client code.
              </div>
              
              <div class="pill-container">
                <span class="complexity-medium-app">Medium App</span>
                <span class="benefit-ecosystem">Rich Ecosystem</span>
                <span class="benefit-fast-dev">Fast Dev</span>
                <span class="benefit-scalable">Scalable</span>
                <span class="build-dashboard">Dashboard</span>
                <span class="build-api">API</span>
                <span class="build-ecommerce">E-commerce</span>
              </div>
            </div>
            
            <div class="template-card" data-template-id="node-nextjs">
              <div class="template-header">
                <div class="connection-diagram">
                  <div class="backend-section">
                    <div class="label">Backend</div>
                    <div class="framework">Node.js</div>
                  </div>
                  <div class="frontend-section">
                    <div class="label">Frontend</div>
                    <div class="framework">Next.js</div>
                  </div>
                </div>
              </div>
              <p class="template-description">A modern fullstack setup with custom Node.js backend and Next.js frontend framework.</p>
              <div class="template-use-case">
                <strong>Perfect for:</strong> Building production-ready web applications, when you need SEO optimization, or complex routing.
              </div>
              
              <div class="pill-container">
                <span class="complexity-complex-app">Complex App</span>
                <span class="benefit-seo">SEO Friendly</span>
                <span class="benefit-performance">Great Performance</span>
                <span class="benefit-scalable">Scalable</span>
                <span class="build-website">Website</span>
                <span class="build-ecommerce">E-commerce</span>
                <span class="build-blog">Blog</span>
                <span class="build-dashboard">Dashboard</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="category">
          <h2>Frontend Applications</h2>
          <p class="category-description">For when you want to build scalable UI without databases or server-side operations.</p>
          <div class="template-grid">
            <div class="template-card" data-template-id="simple-react">
              <div class="template-header">
                <h3 class="template-title">Simple React App</h3>
              </div>
              <p class="template-description">A basic React application with Vite for fast development and building.</p>
              <div class="template-use-case">
                <strong>Perfect for:</strong> Learning React, building simple user interfaces, or when you only need a frontend application.
              </div>
              
              <div class="pill-container">
                <span class="complexity-simple-app">Simple App</span>
                <span class="benefit-performance">Great Performance</span>
                <span class="benefit-deploy">Easy to Deploy</span>
                <span class="build-portfolio">Portfolio</span>
                <span class="build-website">Website</span>
                <span class="build-landing">Landing</span>
              </div>
            </div>
            
            <div class="template-card" data-template-id="nextjs-app">
              <div class="template-header">
                <h3 class="template-title">Next.js App</h3>
              </div>
              <p class="template-description">A React framework with file-based routing, server-side rendering, and built-in optimizations.</p>
              <div class="template-use-case">
                <strong>Perfect for:</strong> Building professional websites, when you need SEO, or want built-in performance features.
              </div>
              
              <div class="pill-container">
                <span class="complexity-medium-app">Medium App</span>
                <span class="benefit-seo">SEO Friendly</span>
                <span class="benefit-performance">Great Performance</span>
                <span class="benefit-ecosystem">Rich Ecosystem</span>
                <span class="build-website">Website</span>
                <span class="build-portfolio">Portfolio</span>
                <span class="build-blog">Blog</span>
                <span class="build-landing">Landing</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="category">
          <h2>Simple Projects</h2>
          <p class="category-description">For static websites and simple web pages.</p>
          <div class="template-grid">
            <div class="template-card" data-template-id="simple-html">
              <div class="template-header">
                <h3 class="template-title">Simple HTML/CSS/JS</h3>
              </div>
              <p class="template-description">A basic static website with live reload for instant preview of your changes.</p>
              <div class="template-use-case">
                <strong>Perfect for:</strong> Learning web development, building simple websites, or when you just need basic HTML pages.
              </div>
              
              <div class="pill-container">
                <span class="complexity-simple-app">Simple App</span>
                <span class="benefit-deploy">Easy to Deploy</span>
                <span class="complexity-simple-app">Great Performance</span>
                <span class="build-portfolio">Portfolio</span>
                <span class="build-website">Website</span>
                <span class="build-landing">Landing</span>
              </div>
            </div>
          </div>
        </div>
        
        <script>
          // Make all template cards clickable
          document.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', function() {
              const templateId = this.getAttribute('data-template-id');
              let templateName = this.querySelector('.template-title')?.textContent;
              
              // For fullstack templates, construct name from framework sections
              if (!templateName) {
                const backendFramework = this.querySelector('.backend-section .framework')?.textContent;
                const frontendFramework = this.querySelector('.frontend-section .framework')?.textContent;
                if (backendFramework && frontendFramework) {
                  templateName = backendFramework + ' + ' + frontendFramework;
                } else {
                  templateName = 'Template';
                }
              }
              
              // Send message to extension
              const vscode = acquireVsCodeApi();
              vscode.postMessage({
                command: 'createProject',
                templateId: templateId,
                templateName: templateName
              });
            });
          });
        </script>
      </body>
      </html>
    `;
  }




}
