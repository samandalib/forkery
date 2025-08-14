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
            // Execute the existing project creation command
            vscode.commands.executeCommand('preview.createProject');
            break;
        }
      }
    );
    
    console.log('TemplatePanel: View setup complete');
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
          <p>Decide what you want to make and see which tech stack can help you build it</p>
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
              const templateName = this.querySelector('.template-title')?.textContent || 
                                 this.querySelector('.framework')?.textContent || 
                                 'Template';
              
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
