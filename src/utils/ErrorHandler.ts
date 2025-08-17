import * as vscode from 'vscode';

/**
 * Centralized error handling for the extension
 */
export class ErrorHandler {
  /**
   * Handle errors with user-friendly messages and optional retry actions
   */
  static async handleError(
    error: Error, 
    context: string, 
    userAction?: () => Promise<void>
  ): Promise<void> {
    console.error(`[${context}] Error:`, error);
    
    const message = this.getUserFriendlyMessage(error);
    
    if (userAction) {
      const action = await vscode.window.showErrorMessage(
        message,
        'Retry',
        'Show Details',
        'Cancel'
      );
      
      switch (action) {
        case 'Retry':
          try {
            await userAction();
          } catch (retryError) {
            // Don't show another dialog for retry errors
            console.error(`[${context}] Retry failed:`, retryError);
            const errorMessage = retryError instanceof Error ? retryError.message : String(retryError);
            vscode.window.showErrorMessage(`Retry failed: ${errorMessage}`);
          }
          break;
          
        case 'Show Details':
          this.showErrorDetails(error, context);
          break;
          
        default:
          // User cancelled
          break;
      }
    } else {
      vscode.window.showErrorMessage(message);
    }
  }

  /**
   * Get user-friendly error messages
   */
  private static getUserFriendlyMessage(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('eaddrinuse')) {
      return 'Port is already in use. Please try a different port or stop the process using the current port.';
    }
    
    if (message.includes('enoent')) {
      return 'File or directory not found. Please check your project configuration.';
    }
    
    if (message.includes('eperm')) {
      return 'Permission denied. Please check if you have the necessary permissions.';
    }
    
    if (message.includes('eacces')) {
      return 'Access denied. Please check your permissions and try again.';
    }
    
    if (message.includes('enotfound')) {
      return 'Command not found. Please ensure the required tools are installed.';
    }
    
    if (message.includes('timeout')) {
      return 'Operation timed out. Please try again or check your network connection.';
    }
    
    if (message.includes('network') || message.includes('connection')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    
    if (message.includes('port')) {
      return 'Port configuration error. Please check your port settings.';
    }
    
    if (message.includes('framework')) {
      return 'Framework detection error. Please check your project configuration.';
    }
    
    if (message.includes('dependencies')) {
      return 'Dependency error. Please run "npm install" or "yarn install" to install dependencies.';
    }
    
    if (message.includes('build')) {
      return 'Build error. Please check your project configuration and try building manually.';
    }
    
    if (message.includes('process')) {
      return 'Process error. Please check if the required services are running.';
    }
    
    // Default message
    return error.message || 'An unexpected error occurred.';
  }

  /**
   * Show detailed error information
   */
  private static showErrorDetails(error: Error, context: string): void {
    const details = `Error Details:
    
Context: ${context}
Message: ${error.message}
Stack: ${error.stack || 'No stack trace available'}
Name: ${error.name}
Time: ${new Date().toISOString()}`;

    // Create a new output channel for error details
    const errorChannel = vscode.window.createOutputChannel(`Error Details - ${context}`);
    errorChannel.appendLine(details);
    errorChannel.show();
  }

  /**
   * Handle async operations with error handling
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string,
    fallback?: T
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      await this.handleError(error as Error, context);
      return fallback;
    }
  }

  /**
   * Handle sync operations with error handling
   */
  static withErrorHandlingSync<T>(
    operation: () => T,
    context: string,
    fallback?: T
  ): T | undefined {
    try {
      return operation();
    } catch (error) {
      this.handleError(error as Error, context);
      return fallback;
    }
  }

  /**
   * Log error without showing user dialog
   */
  static logError(error: Error, context: string): void {
    console.error(`[${context}] Error logged:`, error);
    
    // Could also write to a log file here
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${context}] ${error.name}: ${error.message}`;
    
    // For now, just log to console
    console.log(logEntry);
  }

  /**
   * Show warning message
   */
  static showWarning(message: string, ...actions: string[]): Thenable<string | undefined> {
    return vscode.window.showWarningMessage(message, ...actions);
  }

  /**
   * Show information message
   */
  static showInfo(message: string, ...actions: string[]): Thenable<string | undefined> {
    return vscode.window.showInformationMessage(message, ...actions);
  }

  /**
   * Show error message
   */
  static showError(message: string, ...actions: string[]): Thenable<string | undefined> {
    return vscode.window.showErrorMessage(message, ...actions);
  }
}
