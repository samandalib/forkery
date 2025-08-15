import * as vscode from 'vscode';
import { TemplatePanel } from './TemplatePanel';
import { ProjectControlPanel } from './ProjectControlPanel';

export class TemplateViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'preview.templates';

  constructor(private readonly templatePanel: TemplatePanel) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    console.log('TemplateViewProvider: resolveWebviewView called');
    console.log('TemplateViewProvider: webviewView:', webviewView);
    console.log('TemplateViewProvider: context:', context);
    console.log('TemplateViewProvider: templatePanel:', this.templatePanel);
    
    try {
      this.templatePanel.setView(webviewView);
      console.log('TemplateViewProvider: setView completed successfully');
    } catch (error) {
      console.error('TemplateViewProvider: Error in setView:', error);
    }
    
    console.log('TemplateViewProvider: resolveWebviewView completed');
  }
}

export class ProjectControlViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'preview.control';

  constructor(private readonly projectControlPanel: ProjectControlPanel) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    console.log('ProjectControlViewProvider: resolveWebviewView called');
    this.projectControlPanel.setView(webviewView);
  }
}
