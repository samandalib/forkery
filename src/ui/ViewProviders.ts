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
    this.templatePanel.setView(webviewView);
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
    this.projectControlPanel.setView(webviewView);
  }
}
