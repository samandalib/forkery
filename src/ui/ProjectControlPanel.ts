import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface ProjectStatus {
    isRunning: boolean;
    isStarting?: boolean;
    port: number | null;
    url: string | null;
    process?: any | null;
    framework?: string;
    projectName?: string;
}

export class ProjectControlPanel {
    public static currentPanel: ProjectControlPanel | undefined;
    public static currentView: ProjectControlPanel | undefined;
    private readonly _panel?: vscode.WebviewPanel;
    private readonly _view?: vscode.WebviewView;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ProjectControlPanel.currentPanel) {
            ProjectControlPanel.currentPanel._panel?.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'projectControlPanel',
            'Project Control Panel',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );

        ProjectControlPanel.currentPanel = new ProjectControlPanel(panel);
    }

    public static getInstance(): ProjectControlPanel {
        if (!ProjectControlPanel.currentView) {
            // Create a new instance for the view
            const extensionUri = vscode.extensions.getExtension('undefined_publisher.cursor-preview')?.extensionUri;
            if (extensionUri) {
                ProjectControlPanel.currentView = new ProjectControlPanel(extensionUri);
            } else {
                throw new Error('Failed to get extension URI');
            }
        }
        return ProjectControlPanel.currentView;
    }

    public static createView(extensionUri: vscode.Uri): ProjectControlPanel {
        return new ProjectControlPanel(extensionUri);
    }

    public setView(webviewView: vscode.WebviewView) {
        ProjectControlPanel.currentView = this;
        (this as any)._view = webviewView;
        
        // Set webview options
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        
        // Set HTML content
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        
        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'startServer':
                        this.startServer();
                        break;

                    case 'stopServer':
                        this.stopServer();
                        break;


                    case 'getProjectInfo':
                        this.getProjectInfo();
                        break;
                }
            },
            null,
            this._disposables
        );
    }

        private constructor(panelOrExtensionUri: vscode.WebviewPanel | vscode.Uri) {
        if ('webview' in panelOrExtensionUri) {
            // This is a WebviewPanel
            this._panel = panelOrExtensionUri;
            this._extensionUri = vscode.extensions.getExtension('hesamandalib.forkery')?.extensionUri || vscode.Uri.file(__dirname);
            
            this._update();
            this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
            
            this._panel.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'startServer':
                            this.startServer();
                            break;

                        case 'stopServer':
                            this.stopServer();
                            break;


                        case 'getProjectInfo':
                            this.getProjectInfo();
                            break;
                    }
                },
                null,
                this._disposables
            );
        } else {
            // This is just an extensionUri
            this._extensionUri = panelOrExtensionUri;
        }
        
        // Ensure we have a valid extension URI
        if (!this._extensionUri) {
            const fallbackUri = vscode.extensions.getExtension('undefined_publisher.cursor-preview')?.extensionUri;
            if (fallbackUri) {
                this._extensionUri = fallbackUri;
            } else {
                throw new Error('Failed to get extension URI');
            }
        }
    }

    private async _update() {
        if (!this._panel) return;
        const webview = this._panel.webview;
        this._panel.title = 'Project Control Panel';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Project Control Panel - Forkery Extension</title>
                <style>
                    /* Reset and base styles */
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        background: #1e1e1e;
                        color: #ffffff;
                        line-height: 1.6;
                        overflow-x: hidden;
                    }

                    /* Header */
                    .header {
                        background: linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%);
                        padding: 24px 32px;
                        border-bottom: 1px solid #404040;
                        position: sticky;
                        top: 0;
                        z-index: 100;
                    }

                    .header h1 {
                        font-size: 28px;
                        font-weight: 600;
                        margin-bottom: 8px;
                        color: #ffffff;
                    }

                    .header p {
                        color: #b0b0b0;
                        font-size: 16px;
                        font-weight: 400;
                    }

                    /* Main container */
                    .container {
                        max-width: 1200px;
                        margin: 0 auto;
                        padding: 32px;
                    }

                    /* Project Status Section */
                    .status-section {
                        background: #2d2d2d;
                        border-radius: 12px;
                        padding: 24px;
                        margin-bottom: 32px;
                        border: 1px solid #404040;
                    }

                    .status-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 20px;
                    }

                    .status-title {
                        font-size: 20px;
                        font-weight: 600;
                        color: #ffffff;
                    }

                    .status-badge {
                        padding: 4px 12px;
                        border-radius: 16px;
                        font-size: 12px;
                        font-weight: 500;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    .status-running {
                        background: #4caf50;
                        color: #ffffff;
                    }

                    .status-stopped {
                        background: #f44336;
                        color: #ffffff;
                    }

                    .status-starting {
                        background: #ff9800;
                        color: #ffffff;
                    }

                    .status-stopping {
                        background: #ff9800;
                        color: #ffffff;
                    }

                    /* Compact Project Info */
                    .project-info-compact {
                        margin-top: 20px;
                        display: flex;
                        gap: 24px;
                        align-items: center;
                        flex-wrap: wrap;
                    }

                    .info-item {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .info-label {
                        font-size: 12px;
                        color: #b0b0b0;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    .info-value {
                        font-size: 14px;
                        font-weight: 500;
                        color: #ffffff;
                    }

                    /* Control Buttons */
                    .control-buttons {
                        display: flex;
                        gap: 16px;
                        flex-wrap: wrap;
                    }

                    .btn {
                        padding: 12px 24px;
                        border: 1px solid #505050;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        text-decoration: none;
                        color: #ffffff;
                        background: #363636;
                        position: relative;
                        min-width: 120px;
                        justify-content: center;
                    }

                    .btn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        transform: none !important;
                    }

                    .btn.loading {
                        cursor: not-allowed;
                        opacity: 0.8;
                    }

                    .btn.loading .btn-icon,
                    .btn.loading .btn-text {
                        opacity: 0.3;
                    }

                    .btn.loading .btn-spinner {
                        display: block !important;
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                    }

                    .btn-spinner {
                        display: none;
                    }

                    .btn-spinner svg {
                        animation: spin 1s linear infinite;
                    }

                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }

                    .btn:hover {
                        background: #404040;
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(54, 54, 54, 0.3);
                    }

                    .btn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        transform: none !important;
                    }

                    /* Responsive Design */
                    @media (max-width: 768px) {
                        .container {
                            padding: 16px;
                        }
                        
                        .header {
                            padding: 16px 20px;
                        }
                        
                        .header h1 {
                            font-size: 24px;
                        }
                        
                        .control-buttons {
                            flex-direction: column;
                        }
                        
                        .btn {
                            width: 100%;
                            justify-content: center;
                        }
                        
                        .project-info-compact {
                            flex-direction: column;
                            gap: 12px;
                            align-items: flex-start;
                        }
                    }

                    /* Animations */
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }

                    .fade-in {
                        animation: fadeIn 0.5s ease-out;
                    }

                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.7; }
                    }

                    .pulse {
                        animation: pulse 2s infinite;
                    }

                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }

                    @keyframes slideOut {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(100%); opacity: 0; }
                    }
                </style>
            </head>
            <body>
                <!-- Header -->
                <div class="header">
                    <h1>Project Control Panel</h1>
                    <p>Manage your running projects, control previews, and monitor system status</p>
                </div>

                <!-- Main Container -->
                <div class="container">
                    <!-- Project Status Section -->
                    <div class="status-section fade-in">
                        <div class="status-header">
                            <div class="status-title">Project Status</div>
                            <div class="status-badge status-stopped" id="status-badge">Stopped</div>
                        </div>
                        
                        <div class="control-buttons">
                            <button class="btn" id="start-btn">
                                <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                                <span class="btn-text">Start Server</span>
                                <div class="btn-spinner" style="display: none;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                                            <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                                            <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                                        </circle>
                                    </svg>
                                </div>
                            </button>
                            <button class="btn" id="stop-btn">
                                <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="color: #f44336;">
                                    <path d="M6 6h12v12H6z"/>
                                </svg>
                                <span class="btn-text">Stop Server</span>
                                <div class="btn-spinner" style="display: none;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                                            <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                                            <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                                        </circle>
                                    </svg>
                                </div>
                            </button>
                        </div>

                        <div class="project-info-compact">
                            <span class="info-item">
                                <span class="info-label">Port:</span>
                                <span class="info-value" id="project-port">Loading...</span>
                            </span>
                        </div>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    
                    // Interactive functionality for the Project Control Panel
                    let projectStatus = 'stopped';

                    // Handle messages from extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        console.log('ProjectControlPanel: Received message:', message);
                        switch (message.command) {
                            case 'updateProjectInfo':
                                console.log('ProjectControlPanel: Processing updateProjectInfo');
                                updateProjectInfo(message.data);
                                break;
                            case 'updateStatus':
                                console.log('ProjectControlPanel: Processing updateStatus');
                                updateProjectStatus(message.data.status);
                                break;
                        }
                    });

                    function updateProjectInfo(data) {
                        console.log('ProjectControlPanel: updateProjectInfo called with:', data);
                        
                        // Update port
                        const portElement = document.getElementById('project-port');
                        if (portElement && data.port) {
                            portElement.textContent = data.port;
                        }
                        
                        // Only update status if explicitly provided (don't override current status)
                        if (data.status) {
                            console.log('ProjectControlPanel: Status provided in updateProjectInfo, updating to:', data.status);
                            updateProjectStatus(data.status);
                        } else {
                            console.log('ProjectControlPanel: No status provided in updateProjectInfo, keeping current status:', projectStatus);
                        }
                    }

                    function updateProjectStatus(status) {
                        console.log('ProjectControlPanel: updateProjectStatus called with:', status);
                        projectStatus = status;
                        const statusBadge = document.getElementById('status-badge');
                        if (statusBadge) {
                            // Remove all existing status classes
                            statusBadge.className = 'status-badge';
                            // Add the new status class
                            statusBadge.classList.add(\`status-\${status}\`);
                            // Update the text
                            statusBadge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                        }
                        
                        // Update button states based on status
                        updateButtonStates(status);
                        console.log('ProjectControlPanel: Status updated to:', status, 'Button states updated');
                    }

                    // Control button functionality
                    document.getElementById('start-btn').addEventListener('click', function(e) {
                        e.preventDefault();
                        setButtonLoading('start-btn', true);
                        vscode.postMessage({ command: 'startServer' });
                    });
                    
                    document.getElementById('stop-btn').addEventListener('click', function(e) {
                        e.preventDefault();
                        setButtonLoading('stop-btn', true);
                        vscode.postMessage({ command: 'stopServer' });
                    });

                    function setButtonLoading(buttonId, isLoading) {
                        const button = document.getElementById(buttonId);
                        if (button) {
                            if (isLoading) {
                                button.classList.add('loading');
                                button.disabled = true;
                            } else {
                                button.classList.remove('loading');
                                button.disabled = false;
                            }
                        }
                    }

                    function updateButtonStates(status) {
                        console.log('ProjectControlPanel: updateButtonStates called with:', status);
                        const startBtn = document.getElementById('start-btn');
                        const stopBtn = document.getElementById('stop-btn');
                        
                        if (status === 'starting') {
                            console.log('ProjectControlPanel: Setting starting state - Start button loading, Stop button disabled');
                            setButtonLoading('start-btn', true);
                            setButtonLoading('stop-btn', false);
                            stopBtn.disabled = true;
                        } else if (status === 'running') {
                            console.log('ProjectControlPanel: Setting running state - Start button disabled, Stop button enabled');
                            setButtonLoading('start-btn', false);
                            setButtonLoading('stop-btn', false);
                            startBtn.disabled = true;
                            stopBtn.disabled = false;
                        } else if (status === 'stopping') {
                            console.log('ProjectControlPanel: Setting stopping state - Start button disabled, Stop button loading');
                            setButtonLoading('start-btn', false);
                            setButtonLoading('stop-btn', true);
                            startBtn.disabled = true;
                        } else if (status === 'stopped') {
                            console.log('ProjectControlPanel: Setting stopped state - Start button enabled, Stop button disabled');
                            setButtonLoading('start-btn', false);
                            setButtonLoading('stop-btn', false);
                            startBtn.disabled = false;
                            stopBtn.disabled = true;
                        }
                    }

                    // Request project info on load
                    vscode.postMessage({ command: 'getProjectInfo' });
                    
                    // Initialize status on load
                    updateProjectStatus('stopped');

                    console.log('Project Control Panel loaded successfully!');
                    console.log('Features: Interactive controls, notification system');
                </script>
            </body>
            </html>
        `;
    }

    private async startServer() {
        try {
            vscode.window.showInformationMessage('🚀 Starting the server...');
            
            // Update the status to show server is starting
            this.updateProjectStatus('starting');
            
            // Execute the preview command to start the development server
            await vscode.commands.executeCommand('preview.run');
            
            // Note: The status will be updated to 'running' by the extension
            // when the server is actually ready
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start server: ${error}`);
            this.updateProjectStatus('stopped');
        }
    }



    private async stopServer() {
        try {
            vscode.window.showInformationMessage('🛑 Stopping the server...');
            
            // Update the status to show server is stopping
            this.updateProjectStatus('stopping');
            
            // Execute the stop command
            await vscode.commands.executeCommand('preview.stop');
            
            // Update the status to show server is stopped
            this.updateProjectStatus('stopped');
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to stop server: ${error}`);
            this.updateProjectStatus('stopped');
        }
    }





    private async getProjectInfo() {
        try {
            // Get project info from workspace
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                this.sendProjectInfo({
                    port: 'N/A',
                    status: 'stopped'
                });
                return;
            }

            const projectPath = workspaceFolders[0].uri.fsPath;
            const packageJsonPath = path.join(projectPath, 'package.json');
            
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                const projectName = packageJson.name || path.basename(projectPath);
                const framework = this.detectFramework(packageJson);
                const port = this.detectPort(packageJson);
                
                // Don't override the current status - just send port info
                this.sendProjectInfo({
                    port: port
                    // Removed status: 'stopped' to prevent overriding actual server status
                });
            } else {
                // No package.json found
                this.sendProjectInfo({
                    port: 'N/A'
                    // Removed status: 'stopped' to prevent overriding actual server status
                });
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get project info: ${error}`);
            this.sendProjectInfo({
                port: 'N/A'
                // Removed status: 'stopped' to prevent overriding actual server status
            });
        }
    }

    private sendProjectInfo(data: any) {
        const message = {
            command: 'updateProjectInfo',
            data: data
        };

        // Send to panel if it exists
        if (this._panel) {
            this._panel.webview.postMessage(message);
        }
        
        // Send to view if it exists
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    private detectFramework(packageJson: any): string {
        const dependencies = packageJson.dependencies || {};
        const devDependencies = packageJson.devDependencies || {};
        const allDeps = { ...dependencies, ...devDependencies };

        if (allDeps['next']) return 'Next.js';
        if (allDeps['react'] && allDeps['express']) return 'Fullstack (Express + React)';
        if (allDeps['react']) return 'React';
        if (allDeps['express']) return 'Express.js';
        if (allDeps['vue']) return 'Vue.js';
        if (allDeps['live-server']) return 'Simple HTML';
        
        return 'Unknown';
    }

    private detectPort(packageJson: any): string {
        const scripts = packageJson.scripts || {};
        
        // Look for port in scripts
        for (const [name, script] of Object.entries(scripts)) {
            if (typeof script === 'string') {
                // Check for various port patterns
                const portMatch = script.match(/(?:--port[=\s]|PORT=)(\d+)/);
                if (portMatch) return portMatch[1];
                
                // Check for vite dev server
                if (script.includes('vite') && script.includes('dev')) {
                    return '5173'; // Vite default port
                }
                
                // Check for next.js
                if (script.includes('next') && script.includes('dev')) {
                    return '3000'; // Next.js default port
                }
            }
        }
        
        // Framework-specific defaults
        const dependencies = packageJson.dependencies || {};
        if (dependencies['vite']) return '5173';
        if (dependencies['next']) return '3000';
        if (dependencies['react-scripts']) return '3000';
        
        return '3000'; // General default port
    }

    private updateProjectStatus(status: string) {
        const message = {
            command: 'updateStatus',
            data: { status: status }
        };

        // Send to panel if it exists
        if (this._panel) {
            this._panel.webview.postMessage(message);
        }
        
        // Send to view if it exists
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    public updateStatus(status: any) {
        // Determine the status string based on the status object
        let statusString = 'stopped';
        if (status.isRunning) {
            statusString = 'running';
        } else if (status.isStarting) {
            statusString = 'starting';
        }
        
        const message = {
            command: 'updateStatus',
            data: { status: statusString }
        };

        // Send to panel if it exists
        if (this._panel) {
            this._panel.webview.postMessage(message);
        }
        
        // Send to view if it exists
        if (this._view) {
            this._view.webview.postMessage(message);
        }
        
        // Also update project info if available
        if (status.isRunning) {
            this.getProjectInfo();
        }
    }

    public dispose() {
        ProjectControlPanel.currentPanel = undefined;

        if (this._panel) {
            this._panel.dispose();
        }

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}
