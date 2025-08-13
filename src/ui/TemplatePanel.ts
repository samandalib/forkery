import * as vscode from 'vscode';

export interface ProjectTemplate {
  id: string;
  name: string;
  category: 'fullstack' | 'frontend' | 'simple';
  description: string;
  useCase: string;
  complexity: 'Beginner' | 'Intermediate' | 'Advanced';
  icon: string;
}

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
    
    // Add a simple test to see if basic webview works
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Test</title>
      </head>
      <body style="background: #1e1e1e; color: white; padding: 20px;">
        <h1>🚀 Template Panel Test</h1>
        <p>If you can see this, the webview is working!</p>
        <div style="background: #ff6b6b; padding: 10px; border-radius: 5px;">
          <strong>SUCCESS:</strong> Webview is rendering! 🎉
        </div>
        <hr>
        <h2>Full Template Content:</h2>
        ${htmlContent}
      </body>
      </html>
    `;
    
    this.view.webview.html = testHtml;
    
    // Handle messages from webview
    this.view.webview.onDidReceiveMessage(
      message => {
        console.log('TemplatePanel: Received message:', message);
        switch (message.command) {
          case 'createProject':
            this.createProject(message.templateId);
            break;
        }
      }
    );
    
    console.log('TemplatePanel: View setup complete');
  }

  private getWebviewContent(): string {
    const templates = this.getTemplates();
    
    // Start with a simple test to see if basic webview works
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
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          
          .header h1 {
            color: var(--vscode-textLink-foreground);
            margin-bottom: 10px;
          }
          
          .header p {
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
          }
          
          .category {
            margin-bottom: 30px;
          }
          
          .category h2 {
            color: var(--vscode-textLink-foreground);
            border-bottom: 2px solid var(--vscode-textLink-foreground);
            padding-bottom: 8px;
            margin-bottom: 20px;
          }
          
          .template-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
          }
          
          .template-card {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            transition: all 0.2s ease;
          }
          
          .template-card:hover {
            border-color: var(--vscode-textLink-foreground);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          
          .template-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
          }
          
          .template-icon {
            font-size: 24px;
            margin-right: 12px;
            width: 30px;
            text-align: center;
          }
          
          .template-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--vscode-editor-foreground);
            margin: 0;
          }
          
          .template-description {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 15px;
            line-height: 1.5;
          }
          
          .template-use-case {
            background: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
            padding: 10px 15px;
            margin-bottom: 15px;
            font-style: italic;
          }
          
          .template-complexity {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 15px;
          }
          
          .complexity-beginner {
            background: #d4edda;
            color: #155724;
          }
          
          .complexity-intermediate {
            background: #fff3cd;
            color: #856404;
          }
          
          .complexity-advanced {
            background: #f8d7da;
            color: #721c24;
          }
          
          .launch-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            width: 100%;
          }
          
          .launch-button:hover {
            background: var(--vscode-button-hoverBackground);
            transform: translateY(-1px);
          }
          
          .launch-button:active {
            transform: translateY(0);
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚀 Create New Project</h1>
          <p>Choose a template to get started with your project</p>
          <div style="background: #ff6b6b; color: white; padding: 10px; border-radius: 5px; margin: 10px 0;">
            <strong>DEBUG:</strong> If you can see this red box, the webview is working! 🎉
          </div>
        </div>
        
        ${this.renderCategory('fullstack', 'Fullstack Applications', templates.filter(t => t.category === 'fullstack'))}
        ${this.renderCategory('frontend', 'Frontend Applications', templates.filter(t => t.category === 'frontend'))}
        ${this.renderCategory('simple', 'Simple Projects', templates.filter(t => t.category === 'simple'))}
        
        <script>
          const vscode = acquireVsCodeApi();
          
          function createProject(templateId) {
            vscode.postMessage({
              command: 'createProject',
              templateId: templateId
            });
          }
        </script>
      </body>
      </html>
    `;
  }

  private renderCategory(category: string, title: string, templates: ProjectTemplate[]): string {
    if (templates.length === 0) return '';
    
    return `
      <div class="category">
        <h2>${title}</h2>
        <div class="template-grid">
          ${templates.map(template => this.renderTemplate(template)).join('')}
        </div>
      </div>
    `;
  }

  private renderTemplate(template: ProjectTemplate): string {
    return `
      <div class="template-card">
        <div class="template-header">
          <div class="template-icon">${template.icon}</div>
          <h3 class="template-title">${template.name}</h3>
        </div>
        
        <p class="template-description">${template.description}</p>
        
        <div class="template-use-case">
          <strong>Perfect for:</strong> ${template.useCase}
        </div>
        
        <span class="template-complexity complexity-${template.complexity.toLowerCase()}">
          ${template.complexity}
        </span>
        
        <button class="launch-button" onclick="createProject('${template.id}')">
          Launch ${template.name}
        </button>
      </div>
    `;
  }

  private getTemplates(): ProjectTemplate[] {
    return [
      {
        id: 'express-react-fullstack',
        name: 'Express.js + React Fullstack',
        category: 'fullstack',
        description: 'A complete web application with a Node.js backend server and React frontend.',
        useCase: 'Building full web applications, APIs with user interfaces, or when you need both server and client code.',
        complexity: 'Intermediate',
        icon: '🌐'
      },
      {
        id: 'node-nextjs-fullstack',
        name: 'Node.js + Next.js Fullstack',
        category: 'fullstack',
        description: 'A modern fullstack setup with custom Node.js backend and Next.js frontend framework.',
        useCase: 'Building production-ready web applications, when you need SEO optimization, or complex routing.',
        complexity: 'Advanced',
        icon: '⚡'
      },
      {
        id: 'simple-react',
        name: 'Simple React App',
        category: 'frontend',
        description: 'A basic React application with Vite for fast development and building.',
        useCase: 'Learning React, building simple user interfaces, or when you only need a frontend application.',
        complexity: 'Beginner',
        icon: '⚛️'
      },
      {
        id: 'nextjs-app',
        name: 'Next.js App',
        category: 'frontend',
        description: 'A React framework with file-based routing, server-side rendering, and built-in optimizations.',
        useCase: 'Building professional websites, when you need SEO, or want built-in performance features.',
        complexity: 'Intermediate',
        icon: '🎯'
      },
      {
        id: 'simple-html',
        name: 'Simple HTML/CSS/JS',
        category: 'simple',
        description: 'A basic static website with live reload for instant preview of your changes.',
        useCase: 'Learning web development, building simple websites, or when you just need basic HTML pages.',
        complexity: 'Beginner',
        icon: '🌍'
      }
    ];
  }

  private async createProject(templateId: string): Promise<void> {
    // This will be connected to the existing project creation logic
    vscode.commands.executeCommand('preview.createProject');
    
    // The sidebar view stays open - no need to close it
  }
}
