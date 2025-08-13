import * as vscode from 'vscode';

export interface ProjectStatus {
  isRunning: boolean;
  port: number | null;
  url: string | null;
  framework: string;
  projectName: string;
}

export class ProjectControlPanel {
  private static instance: ProjectControlPanel;
  private view: vscode.WebviewView | undefined;
  private currentStatus: ProjectStatus | null = null;

  public static getInstance(): ProjectControlPanel {
    if (!ProjectControlPanel.instance) {
      ProjectControlPanel.instance = new ProjectControlPanel();
    }
    return ProjectControlPanel.instance;
  }

  public updateStatus(status: ProjectStatus): void {
    this.currentStatus = status;
    if (this.view) {
      this.view.webview.postMessage({ command: 'updateStatus', status });
    }
  }

  public show(): void {
    // The sidebar view is automatically shown when the extension activates
    // This method is kept for compatibility but the view is managed by VS Code
  }

  public setView(view: vscode.WebviewView): void {
    this.view = view;
    this.view.webview.html = this.getWebviewContent();
    
    // Handle messages from webview
    this.view.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'preview':
            vscode.commands.executeCommand('preview.run');
            break;
          case 'stop':
            vscode.commands.executeCommand('preview.stop');
            break;
          case 'restart':
            vscode.commands.executeCommand('preview.restart');
            break;
          case 'openInBrowser':
            if (this.currentStatus?.url) {
              vscode.env.openExternal(vscode.Uri.parse(this.currentStatus.url));
            }
            break;
        }
      }
    );

    // Update with current status if available
    if (this.currentStatus) {
      this.view.webview.postMessage({ command: 'updateStatus', status: this.currentStatus });
    }
  }

  private getWebviewContent(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Project Control</title>
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
            padding: 20px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 8px;
          }
          
          .header h1 {
            color: var(--vscode-textLink-foreground);
            margin-bottom: 10px;
          }
          
          .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
          }
          
          .status-running {
            background: #28a745;
            animation: pulse 2s infinite;
          }
          
          .status-stopped {
            background: #dc3545;
          }
          
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          
          .project-info {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
          }
          
          .info-item {
            text-align: center;
          }
          
          .info-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
          }
          
          .info-value {
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-editor-foreground);
          }
          
          .control-section {
            margin-bottom: 30px;
          }
          
          .section-title {
            color: var(--vscode-textLink-foreground);
            border-bottom: 2px solid var(--vscode-textLink-foreground);
            padding-bottom: 8px;
            margin-bottom: 20px;
          }
          
          .button-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
          }
          
          .control-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 15px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          
          .control-button:hover {
            background: var(--vscode-button-hoverBackground);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          
          .control-button:active {
            transform: translateY(0);
          }
          
          .control-button.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
          }
          
          .control-button.secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
          }
          
          .control-button.danger {
            background: #dc3545;
            color: white;
          }
          
          .control-button.danger:hover {
            background: #c82333;
          }
          
          .github-section {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
          }
          
          .github-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
          }
          
          .github-icon {
            font-size: 20px;
            margin-right: 10px;
          }
          
          .branch-selector {
            display: flex;
            gap: 10px;
            align-items: center;
            margin-bottom: 15px;
          }
          
          .branch-input {
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 14px;
            flex: 1;
          }
          
          .branch-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
          }
          
          .push-button {
            background: #28a745;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
          }
          
          .push-button:hover {
            background: #218838;
            transform: translateY(-1px);
          }
          
          .coming-soon {
            background: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
            padding: 15px;
            margin-top: 15px;
            font-style: italic;
            color: var(--vscode-descriptionForeground);
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>
            <span id="statusIndicator" class="status-indicator status-stopped"></span>
            Project Control
          </h1>
          <p id="projectName">No project running</p>
        </div>
        
        <div id="projectInfo" class="project-info" style="display: none;">
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Framework</div>
              <div id="frameworkValue" class="info-value">-</div>
            </div>
            <div class="info-item">
              <div class="info-label">Port</div>
              <div id="portValue" class="info-value">-</div>
            </div>
            <div class="info-item">
              <div class="info-label">Status</div>
              <div id="statusValue" class="info-value">-</div>
            </div>
          </div>
        </div>
        
        <div class="control-section">
          <h2 class="section-title">🚀 Project Controls</h2>
          <div class="button-grid">
            <button class="control-button" onclick="preview()">
              🌐 Preview
            </button>
            <button class="control-button secondary" onclick="openInBrowser()">
              🔗 Open in Browser
            </button>
            <button class="control-button secondary" onclick="restart()">
              🔄 Restart
            </button>
            <button class="control-button danger" onclick="stop()">
              🛑 Stop
            </button>
          </div>
        </div>
        
        <div class="github-section">
          <div class="github-header">
            <span class="github-icon">📤</span>
            <h3>Push to GitHub</h3>
          </div>
          
          <div class="branch-selector">
            <input type="text" class="branch-input" id="branchInput" placeholder="main" value="main">
            <button class="push-button" onclick="pushToGitHub()">
              Push
            </button>
          </div>
          
          <div class="coming-soon">
            <strong>Coming Soon:</strong> GitHub integration will allow you to push your project directly to a repository with the specified branch.
          </div>
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          function preview() {
            vscode.postMessage({ command: 'preview' });
          }
          
          function stop() {
            vscode.postMessage({ command: 'stop' });
          }
          
          function restart() {
            vscode.postMessage({ command: 'restart' });
          }
          
          function openInBrowser() {
            vscode.postMessage({ command: 'openInBrowser' });
          }
          
          function pushToGitHub() {
            const branch = document.getElementById('branchInput').value;
            // This will be implemented later
            console.log('Push to GitHub:', branch);
          }
          
          // Handle messages from extension
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
              case 'updateStatus':
                updateProjectStatus(message.status);
                break;
            }
          });
          
          function updateProjectStatus(status) {
            const statusIndicator = document.getElementById('statusIndicator');
            const projectName = document.getElementById('projectName');
            const projectInfo = document.getElementById('projectInfo');
            const frameworkValue = document.getElementById('frameworkValue');
            const portValue = document.getElementById('portValue');
            const statusValue = document.getElementById('statusValue');
            
            if (status.isRunning) {
              statusIndicator.className = 'status-indicator status-running';
              projectName.textContent = status.projectName || 'Project Running';
              projectInfo.style.display = 'block';
              
              frameworkValue.textContent = status.framework || '-';
              portValue.textContent = status.port || '-';
              statusValue.textContent = 'Running';
            } else {
              statusIndicator.className = 'status-indicator status-stopped';
              projectName.textContent = 'No project running';
              projectInfo.style.display = 'none';
            }
          }
        </script>
      </body>
      </html>
    `;
  }
}
