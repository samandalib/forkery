import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DeploymentDiagnosticService, DeploymentDiagnostic } from './DeploymentDiagnostic';

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
    private currentProjectStatus: any = null;

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
            const extensionUri = vscode.extensions.getExtension('H10B.pistachio-vibe')?.extensionUri;
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
        console.log('ProjectControlPanel: setView called with webviewView:', webviewView);
        ProjectControlPanel.currentView = this;
        (this as any)._view = webviewView;
        
        console.log('ProjectControlPanel: Webview view set up, setting options and HTML');
        
        // Set webview options
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        
        // Set HTML content
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        
        console.log('ProjectControlPanel: HTML content set, setting up message handler');
        
        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(
            message => {
                console.log('ProjectControlPanel: Received message from view webview:', message);
                switch (message.command) {
                    case 'startServer':
                        console.log('ProjectControlPanel: Handling startServer command');
                        this.startServer();
                        break;

                    case 'stopServer':
                        console.log('ProjectControlPanel: Handling stopServer command');
                        this.stopServer();
                        break;

                    case 'getProjectInfo':
                        console.log('ProjectControlPanel: Handling getProjectInfo command');
                        this.getProjectInfo();
                        break;
                    case 'runDeploymentDiagnostic':
                        console.log('ProjectControlPanel: Handling runDeploymentDiagnostic command');
                        this.runDeploymentDiagnostic();
                        break;
                    default:
                        console.log('ProjectControlPanel: Unknown command from view webview:', message.command);
                        break;
                }
            },
            null,
            this._disposables
        );
        
        console.log('ProjectControlPanel: setView completed successfully');
    }

    private constructor(panelOrExtensionUri: vscode.WebviewPanel | vscode.Uri) {
        if ('webview' in panelOrExtensionUri) {
            // This is a WebviewPanel
            this._panel = panelOrExtensionUri;
            this._extensionUri = vscode.extensions.getExtension('H10B.pistachio-vibe')?.extensionUri || vscode.Uri.file(__dirname);
            
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
                            
                        case 'runDeploymentDiagnostic':
                            this.runDeploymentDiagnostic();
                            break;
                    }
                },
                null,
                this._disposables
            );
        } else {
            // This is just an extensionUri - will be set up as a view later
            this._extensionUri = panelOrExtensionUri;
            console.log('ProjectControlPanel: Created as view provider, waiting for setView call');
        }
        
        // Ensure we have a valid extension URI
        if (!this._extensionUri) {
            const fallbackUri = vscode.extensions.getExtension('H10B.pistachio-vibe')?.extensionUri;
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
                <title>Project Control Panel - Pistachio Vibe Extension</title>
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
                    
                    .pistachio-banner {
                        margin: 20px;
                        text-align: center;
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    }
                    
                    .pistachio-banner img {
                        width: 100%;
                        height: auto;
                        max-width: 100%;
                        display: block;
                    }

                    /* Header */
                    .header {
                        background: transparent;
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
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 12px;
                        margin-bottom: 20px;
                    }

                    .status-title {
                        font-size: 20px;
                        font-weight: 600;
                        color: #ffffff;
                    }

                    .status-badge {
                        padding: 3px 10px;
                        border-radius: 12px;
                        font-size: 10px;
                        font-weight: 500;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        align-self: flex-start;
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

                    /* Deployment Diagnostic Button */
                    .btn.deployment-diagnostic {
                        background: #2196f3;
                        border-color: #1976d2;
                    }

                    .btn.deployment-diagnostic:hover {
                        background: #1976d2;
                    }
                    
                    /* Secondary Deployment Diagnostic Button */
                    .btn.deployment-diagnostic.secondary {
                        background: transparent;
                        border: none;
                        color: #2196f3;
                        box-shadow: none;
                    }
                    
                    .btn.deployment-diagnostic.secondary:hover {
                        background: rgba(33, 150, 243, 0.1);
                        color: #1976d2;
                    }
                    
                    /* Secondary Button Style */
                    .btn.secondary {
                        background: transparent;
                        border: none;
                        color: #757575;
                        box-shadow: none;
                    }
                    
                    .btn.secondary:hover {
                        background: rgba(117, 117, 117, 0.1);
                        color: #616161;
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

                    /* Super narrow responsive design - icon only */
                    @media (max-width: 200px) {
                        .container {
                            padding: 2px;
                        }
                        
                        .header {
                            padding: 4px 6px;
                        }
                        
                        .header h1,
                        .header p {
                            display: none;
                        }
                        
                        .status-section {
                            padding: 8px;
                        }
                        
                        .status-title {
                            display: none;
                        }
                        
                        .btn .btn-text {
                            display: none;
                        }
                        
                        .btn {
                            padding: 4px;
                            min-width: 32px;
                            width: 32px;
                            height: 32px;
                            justify-content: center;
                        }
                        
                        .btn.deployment-diagnostic {
                            min-width: 32px;
                            width: 32px;
                            height: 32px;
                        }
                        
                        .project-info-compact {
                            display: none;
                        }
                        
                        .control-buttons {
                            gap: 4px;
                            justify-content: center;
                        }
                    }

                    /* Narrow responsive design - minimal text */
                    @media (min-width: 201px) and (max-width: 350px) {
                        .container {
                            padding: 6px;
                        }
                        
                        .header {
                            padding: 6px 8px;
                        }
                        
                        .header h1,
                        .header p {
                            display: none;
                        }
                        
                        .status-section {
                            padding: 12px;
                        }
                        
                        .status-title {
                            display: none;
                        }
                        
                        .btn .btn-text {
                            display: none;
                        }
                        
                        .btn {
                            padding: 6px;
                            min-width: 36px;
                            width: 36px;
                            height: 36px;
                            justify-content: center;
                        }
                        
                        .btn.deployment-diagnostic {
                            min-width: 36px;
                            width: 36px;
                            height: 36px;
                        }
                        
                        .project-info-compact {
                            display: none;
                        }
                        
                        .control-buttons {
                            gap: 6px;
                            justify-content: center;
                        }
                    }

                    /* Medium narrow responsive design - some text */
                    @media (min-width: 351px) and (max-width: 500px) {
                        .container {
                            padding: 8px;
                        }
                        
                        .header {
                            padding: 8px 12px;
                        }
                        
                        .header h1 {
                            font-size: 18px;
                        }
                        
                        .header p {
                            display: none;
                        }
                        
                        .status-section {
                            padding: 16px;
                        }
                        
                        .btn .btn-text {
                            font-size: 12px;
                        }
                        
                        .btn {
                            padding: 8px 12px;
                            min-width: auto;
                        }
                        
                        .project-info-compact {
                            display: none;
                        }
                    }

                    /* Standard responsive design */
                    @media (min-width: 501px) and (max-width: 768px) {
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
                </style>
            </head>
            <body>
                <!-- Pistachio Banner -->
                <div class="pistachio-banner">
                    <img src="${webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'assets', 'banners', 'pistachio-banner-1280x200.png'))}" alt="Pistachio: Visual Vibe coding in IDE" />
                </div>
                
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
                            <div class="status-badge status-stopped" id="status-badge">Stopped</div>
                            <div class="status-title">Project Status</div>
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
                            <button class="btn deployment-diagnostic secondary" id="deployment-diagnostic-btn">
                                <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M12 6v12M8 14l4 4 4-4"/>
                                </svg>
                                <span class="btn-text">Check deployment readiness</span>
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

                    <!-- Diagnostic Results Display -->
                    <div id="diagnostic-results" style="display: none; margin-top: 20px; padding: 16px; background: #2d2d30; border-radius: 8px; border: 1px solid #3e3e42;">
                        <h3 style="margin: 0 0 16px 0; color: #ffffff; font-size: 16px;">🔍 Deployment Diagnostic Results</h3>
                        <div id="diagnostic-content">
                            <!-- Results will be populated here -->
                        </div>
                        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #3e3e42;">
                            <button id="copy-diagnostic-btn" class="btn" style="background: #4caf50; border-color: #388e3c; margin-right: 8px; margin-bottom: 8px;">
                                <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                                <span class="btn-text">Copy Report</span>
                            </button>
                            <button id="hide-diagnostic-btn" class="btn secondary" style="background: transparent; border: none; color: #757575;">
                                Hide Results
                            </button>
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
                                console.log('ProjectControlPanel: Processing updateStatus with data:', message.data);
                                console.log('ProjectControlPanel: Status value:', message.data.status);
                                updateProjectStatus(message.data.status);
                                break;
                            case 'diagnosticComplete':
                                console.log('ProjectControlPanel: Processing diagnosticComplete');
                                showDiagnosticResults(message.data);
                                // Stop the button loading state
                                setButtonLoading('deployment-diagnostic-btn', false);
                                break;
                            default:
                                console.log('ProjectControlPanel: Unknown message command:', message.command);
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
                            console.log('ProjectControlPanel: Status badge updated to:', status);
                        } else {
                            console.error('ProjectControlPanel: Status badge element not found!');
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

                    // Deployment diagnostic button functionality
                    document.getElementById('deployment-diagnostic-btn').addEventListener('click', function(e) {
                        e.preventDefault();
                        setButtonLoading('deployment-diagnostic-btn', true);
                        vscode.postMessage({ command: 'runDeploymentDiagnostic' });
                    });

                    // Handle copy notification
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'showNotification') {
                            // Show a temporary success message
                            const copyBtn = document.getElementById('copy-diagnostic-btn');
                            if (copyBtn) {
                                const originalText = copyBtn.textContent;
                                copyBtn.textContent = '✅ Copied!';
                                copyBtn.style.background = '#4caf50';
                                setTimeout(() => {
                                    copyBtn.textContent = originalText;
                                    copyBtn.style.background = '#4caf50';
                                }, 2000);
                            }
                        }
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
                    
                    // Initialize status on load - but wait a bit for the webview to be ready
                    setTimeout(() => {
                        updateProjectStatus('stopped');
                        console.log('ProjectControlPanel: Initial status set to stopped');
                    }, 100);

                    // Add diagnostic results functionality
                    function showDiagnosticResults(diagnostic) {
                        const resultsDiv = document.getElementById('diagnostic-results');
                        const contentDiv = document.getElementById('diagnostic-content');
                        
                        if (resultsDiv && contentDiv) {
                            // Populate the content
                            let html = \`
                                <div style="margin-bottom: 16px;">
                                    <div style="display: flex; align-items: center; margin-bottom: 12px;">
                                        <span style="font-size: 20px; font-weight: bold; color: \${diagnostic.status === 'READY' ? '#4caf50' : '#ff9800'};">
                                            \${diagnostic.status === 'READY' ? '✅ Ready for Deployment' : '⚠️ Configuration Required'}
                                        </span>
                                    </div>
                                    <div style="color: #cccccc; font-size: 14px; margin-bottom: 16px;">
                                        \${diagnostic.status === 'READY' ? 'Your project appears ready to build and deploy successfully.' : 'Your project needs some configuration before it can be deployed reliably.'}
                                    </div>
                                </div>
                            \`;
                            
                            if (diagnostic.issues.length > 0) {
                                html += \`<div style="margin-bottom: 12px;"><strong style="color: #f44336;">❌ Issues Found:</strong><ul style="margin: 8px 0; padding-left: 20px; color: #cccccc;">\`;
                                diagnostic.issues.forEach(issue => {
                                    html += \`<li>\${issue}</li>\`;
                                });
                                html += \`</ul></div>\`;
                            }
                            
                            if (diagnostic.warnings.length > 0) {
                                html += \`<div style="margin-bottom: 12px;"><strong style="color: #ff9800;">⚠️ Warnings:</strong><ul style="margin: 8px 0; padding-left: 20px; color: #cccccc;">\`;
                                diagnostic.warnings.forEach(warning => {
                                    html += \`<li>\${warning}</li>\`;
                                });
                                html += \`</ul></div>\`;
                            }
                            
                            if (diagnostic.recommendations.length > 0) {
                                html += \`<div style="margin-bottom: 12px;"><strong style="color: #4caf50;">💡 Recommendations:</strong><ul style="margin: 8px 0; padding-left: 20px; color: #cccccc;">\`;
                                diagnostic.recommendations.forEach(rec => {
                                    html += \`<li>\${rec}</li>\`;
                                });
                                html += \`</ul></div>\`;
                            }
                            
                            contentDiv.innerHTML = html;
                            resultsDiv.style.display = 'block';
                        }
                    }
                    
                    // Copy diagnostic report to clipboard
                    document.getElementById('copy-diagnostic-btn').addEventListener('click', function() {
                        const contentDiv = document.getElementById('diagnostic-content');
                        const copyBtn = document.getElementById('copy-diagnostic-btn');
                        const btnText = copyBtn.querySelector('.btn-text');
                        
                        if (contentDiv) {
                            const text = contentDiv.innerText;
                            navigator.clipboard.writeText(text).then(() => {
                                // Change button text to "Copied"
                                if (btnText) {
                                    btnText.textContent = 'Copied';
                                }
                                
                                // Reset button text after 2 seconds
                                setTimeout(() => {
                                    if (btnText) {
                                        btnText.textContent = 'Copy Report';
                                    }
                                }, 2000);
                                
                                vscode.postMessage({ command: 'showNotification', message: 'Diagnostic report copied to clipboard!' });
                            }).catch(() => {
                                vscode.postMessage({ command: 'showNotification', message: 'Failed to copy to clipboard' });
                            });
                        }
                    });
                    
                    // Hide diagnostic results
                    document.getElementById('hide-diagnostic-btn').addEventListener('click', function() {
                        const resultsDiv = document.getElementById('diagnostic-results');
                        if (resultsDiv) {
                            resultsDiv.style.display = 'none';
                        }
                    });

                    console.log('Project Control Panel loaded successfully!');
                    console.log('Features: Interactive controls, deployment diagnostic button, diagnostic results display');
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
            await vscode.commands.executeCommand('pistachio-vibe.run');
            
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
            await vscode.commands.executeCommand('pistachio-vibe.stop');
            
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
                
                // Send dynamic port info based on server status
                this.sendProjectInfo({
                    port: this.getPortDisplayValue()
                });
            } else {
                            // No package.json found
            this.sendProjectInfo({
                port: this.getPortDisplayValue()
            });
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get project info: ${error}`);
            this.sendProjectInfo({
                port: this.getPortDisplayValue()
            });
        }
    }

    private async runDeploymentDiagnostic(): Promise<void> {
        try {
            // Use our clean, modular deployment diagnostic service
            const diagnostic = await DeploymentDiagnosticService.runDiagnostic();
            
            // Show the result in a notification
            vscode.window.showInformationMessage(`Deployment Diagnostic Complete: ${diagnostic.score}/100 - ${diagnostic.status}`);
            
            // Show detailed results in output channel
            this.showDiagnosticResults(diagnostic);
            
            // Send diagnostic results to the webview to display in UI
            this.sendDiagnosticResults(diagnostic);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to run deployment diagnostic: ${error}`);
        }
    }

    private showDiagnosticResults(diagnostic: DeploymentDiagnostic): void {
        // Create output channel for diagnostic results
        const outputChannel = vscode.window.createOutputChannel('Deployment Diagnostic');
        outputChannel.show();
        
        outputChannel.appendLine('🔍 Deployment Readiness Diagnostic Results');
        outputChannel.appendLine('=====================================');
        outputChannel.appendLine(`Score: ${diagnostic.score}/100`);
        outputChannel.appendLine(`Status: ${diagnostic.status}`);
        outputChannel.appendLine(`Risk Level: ${diagnostic.riskLevel}`);
        outputChannel.appendLine('');
        
        if (diagnostic.issues.length > 0) {
            outputChannel.appendLine('❌ Issues Found:');
            diagnostic.issues.forEach(issue => outputChannel.appendLine(`  • ${issue}`));
            outputChannel.appendLine('');
        }
        
        if (diagnostic.warnings.length > 0) {
            outputChannel.appendLine('⚠️ Warnings:');
            diagnostic.warnings.forEach(warning => outputChannel.appendLine(`  • ${warning}`));
            outputChannel.appendLine('');
        }
        
        if (diagnostic.recommendations.length > 0) {
            outputChannel.appendLine('💡 Recommendations:');
            diagnostic.recommendations.forEach(rec => outputChannel.appendLine(`  • ${rec}`));
            outputChannel.appendLine('');
        }
        
        outputChannel.appendLine('📋 Copy this output and share it with your AI agent for specific guidance.');
    }

    private sendDiagnosticResults(diagnostic: DeploymentDiagnostic): void {
        const message = {
            command: 'diagnosticComplete',
            data: diagnostic
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

    private getPortDisplayValue(): string {
        // If server is running, show the actual port
        // If server is not running, show "N/A"
        if (this.currentProjectStatus?.isRunning && this.currentProjectStatus?.port) {
            return this.currentProjectStatus.port.toString();
        }
        return 'N/A';
    }

    private updatePortDisplay(): void {
        // Send updated port info to the webview
        const portValue = this.getPortDisplayValue();
        this.sendProjectInfo({ port: portValue });
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
        console.log('ProjectControlPanel: updateStatus called with:', status);
        
        // Update the current project status
        this.currentProjectStatus = status;
        
        // Determine the status string based on the status object
        let statusString = 'stopped';
        if (status.isRunning) {
            statusString = 'running';
        } else if (status.isStarting) {
            statusString = 'starting';
        }
        
        console.log('ProjectControlPanel: Converting status to string:', statusString);
        
        const message = {
            command: 'updateStatus',
            data: { status: statusString }
        };

        console.log('ProjectControlPanel: Sending message to webview:', message);

        // Send to panel if it exists
        if (this._panel) {
            console.log('ProjectControlPanel: Sending to panel webview');
            this._panel.webview.postMessage(message);
        } else {
            console.log('ProjectControlPanel: No panel webview available');
        }
        
        // Send to view if it exists
        if (this._view) {
            console.log('ProjectControlPanel: Sending to view webview');
            this._view.webview.postMessage(message);
        } else {
            console.log('ProjectControlPanel: No view webview available');
        }
        
        // Update port display when status changes
        this.updatePortDisplay();
        
        // Also update project info if available
        if (status.isRunning) {
            console.log('ProjectControlPanel: Getting project info for running project');
            this.getProjectInfo();
        }
        
        // Log the current state for debugging
        console.log('ProjectControlPanel: Current state - Panel:', !!this._panel, 'View:', !!this._view);
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
