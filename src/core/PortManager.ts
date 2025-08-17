import * as vscode from 'vscode';
import * as child_process from 'child_process';
import detectPort from 'detect-port';
import { 
  ProcessInfo, 
  PortConflictChoice, 
  FrameworkType 
} from '../types/ProjectTypes';
import { PortConfig } from '../types/ConfigTypes';

/**
 * Manages port detection and conflict resolution
 * Implements cooperative port management for Forkery projects
 */
export class PortManager {
  private outputChannel: vscode.OutputChannel;
  private config: vscode.WorkspaceConfiguration;

  constructor(
    outputChannel: vscode.OutputChannel,
    config: vscode.WorkspaceConfiguration
  ) {
    this.outputChannel = outputChannel;
    this.config = config;
  }

  /**
   * Find an available port using cooperative conflict resolution
   */
  async findAvailablePort(desiredPort: number, framework: FrameworkType): Promise<number> {
    try {
      this.outputChannel.appendLine(`🔍 Checking if port ${desiredPort} is available cooperatively...`);
      
      // First: Check if port is available without killing anything
      if (await this.isPortAvailable(desiredPort)) {
        this.outputChannel.appendLine(`✅ Port ${desiredPort} is available - no conflicts detected`);
        return desiredPort;
      }
      
      // Second: Port is busy, check what's using it
      this.outputChannel.appendLine(`⚠️ Port ${desiredPort} is busy, analyzing usage...`);
      const portInfo = await this.getProcessInfoOnPort(desiredPort);
      
      if (portInfo.isForkeryExtension) {
        // This is another Forkery project - offer user choice
        this.outputChannel.appendLine(`🎯 Port conflict with another Forkery project detected`);
        return await this.handleForkeryPortConflict(desiredPort, portInfo);
      } else {
        // Non-Forkery process - use existing aggressive cleanup
        this.outputChannel.appendLine(`🚨 Port ${desiredPort} is used by non-Forkery process - using aggressive cleanup`);
        return await this.aggressivePortResolution(desiredPort);
      }
      
    } catch (error) {
      this.outputChannel.appendLine(`❌ Cooperative port detection failed: ${error}`);
      this.outputChannel.appendLine(`🔄 Falling back to aggressive port resolution...`);
      // Fallback to original aggressive method
      return await this.aggressivePortResolution(desiredPort);
    }
  }

  /**
   * Check if a port is available without killing processes
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    try {
      const availablePort = await detectPort(port);
      return availablePort === port;
    } catch (error) {
      this.outputChannel.appendLine(`⚠️ Port availability check failed: ${error}`);
      return false;
    }
  }

  /**
   * Get detailed information about what's using a port
   */
  private async getProcessInfoOnPort(port: number): Promise<ProcessInfo> {
    try {
      // Use lsof to find processes using the port
      const findProcess = child_process.spawn('lsof', ['-ti', `:${port}`], {
        stdio: 'pipe',
        shell: true
      });

      return new Promise<ProcessInfo>((resolve, reject) => {
        let processIds = '';
        
        findProcess.stdout?.on('data', (data) => {
          processIds += data.toString();
        });

        findProcess.on('close', async (code) => {
          if (code === 0 && processIds.trim()) {
            const pids = processIds.trim().split('\n');
            if (pids.length > 0) {
              const pid = pids[0].trim();
              try {
                const processInfo = await this.getDetailedProcessInfo(parseInt(pid));
                resolve(processInfo);
              } catch (error) {
                reject(new Error(`Failed to get process info for PID ${pid}: ${error}`));
              }
            } else {
              reject(new Error('No process IDs found'));
            }
          } else {
            reject(new Error('No processes found using the port'));
          }
        });

        findProcess.on('error', (error) => {
          reject(new Error(`Failed to check port ${port}: ${error.message}`));
        });
      });
    } catch (error) {
      throw new Error(`Failed to get process info on port ${port}: ${error}`);
    }
  }

  /**
   * Get detailed information about a specific process
   */
  private async getDetailedProcessInfo(pid: number): Promise<ProcessInfo> {
    try {
      // Use ps to get process details
      const psProcess = child_process.spawn('ps', ['-p', pid.toString(), '-o', 'pid,command,args,cwd,etime'], {
        stdio: 'pipe',
        shell: true
      });

      return new Promise<ProcessInfo>((resolve, reject) => {
        let output = '';
        
        psProcess.stdout?.on('data', (data) => {
          output += data.toString();
        });

        psProcess.on('close', (code) => {
          if (code === 0) {
            const lines = output.trim().split('\n');
            if (lines.length >= 2) {
              const [, commandLine] = lines;
              const parts = commandLine.trim().split(/\s+/);
              
              const processInfo: ProcessInfo = {
                pid,
                command: parts[0] || '',
                args: parts.slice(1) || [],
                cwd: process.cwd(), // Default to current working directory
                startTime: new Date(), // Default to now
                isForkeryExtension: this.isForkeryProcess(parts[0] || '', parts.slice(1) || []),
                projectName: this.extractProjectName(parts),
                workspacePath: this.extractWorkspacePath(parts)
              };
              
              resolve(processInfo);
            } else {
              reject(new Error('Invalid ps output format'));
            }
          } else {
            reject(new Error(`ps command failed with code ${code}`));
          }
        });

        psProcess.on('error', (error) => {
          reject(new Error(`Failed to get process info: ${error.message}`));
        });
      });
    } catch (error) {
      throw new Error(`Failed to get detailed process info: ${error}`);
    }
  }

  /**
   * Determine if a process is a Forkery extension process
   */
  private isForkeryProcess(command: string, args: string[]): boolean {
    const forkeryIndicators = [
      'npm run dev', 'npm run start', 'yarn dev', 'yarn start',
      'next dev', 'vite', 'live-server', 'react-scripts start',
      'nodemon', 'concurrently'
    ];
    
    const fullCommand = `${command} ${args.join(' ')}`.toLowerCase();
    
    return forkeryIndicators.some(indicator => 
      fullCommand.includes(indicator.toLowerCase())
    );
  }

  /**
   * Extract project name from process command
   */
  private extractProjectName(args: string[]): string | undefined {
    // Look for common patterns in project names
    for (const arg of args) {
      if (arg.includes('dev') || arg.includes('start')) {
        continue; // Skip command arguments
      }
      if (arg.includes('/') || arg.includes('\\')) {
        // This might be a path, extract the project name
        const parts = arg.split(/[/\\]/);
        return parts[parts.length - 1];
      }
    }
    return undefined;
  }

  /**
   * Extract workspace path from process command
   */
  private extractWorkspacePath(args: string[]): string | undefined {
    // Look for working directory indicators
    for (const arg of args) {
      if (arg.startsWith('-') || arg.includes('node_modules')) {
        continue; // Skip flags and node_modules
      }
      if (arg.includes('/') || arg.includes('\\')) {
        // This might be a workspace path
        return arg;
      }
    }
    return undefined;
  }

  /**
   * Handle port conflicts with other Forkery projects
   */
  private async handleForkeryPortConflict(port: number, portInfo: ProcessInfo): Promise<number> {
    const choice = await this.askUserAboutPortConflict(port, portInfo);
    
    switch (choice.action) {
      case 'use_alternative':
        if (choice.alternativePort) {
          this.outputChannel.appendLine(`✅ User chose alternative port: ${choice.alternativePort}`);
          return choice.alternativePort;
        } else {
          // Find an alternative port automatically
          const alternativePort = await this.findAlternativePort(port, 'generic');
          this.outputChannel.appendLine(`🎯 Found alternative port: ${alternativePort}`);
          return alternativePort;
        }
        
      case 'stop_other':
        this.outputChannel.appendLine(`🛑 User chose to stop other project`);
        await this.stopOtherForkeryProject(portInfo);
        return port;
        
      default:
        throw new Error(`Operation cancelled by user: ${choice.reason}`);
    }
  }

  /**
   * Ask user how to handle port conflicts
   */
  private async askUserAboutPortConflict(port: number, portInfo: ProcessInfo): Promise<PortConflictChoice> {
    const projectName = portInfo.projectName || 'Unknown Project';
    const startTime = portInfo.startTime?.toLocaleTimeString() || 'Unknown';
    
    const message = `Port ${port} is already in use by another Forkery project:\n\n` +
                    `📁 Project: ${projectName}\n` +
                    `🕐 Started: ${startTime}\n\n` +
                    `What would you like to do?`;
    
    const choice = await vscode.window.showInformationMessage(
      message,
      'Use Alternative Port',
      'Stop Other Project', 
      'Cancel'
    );
    
    switch (choice) {
      case 'Use Alternative Port':
        const alternativePort = await this.findAlternativePort(port, 'generic');
        return { action: 'use_alternative', alternativePort };
        
      case 'Stop Other Project':
        return { action: 'stop_other' };
        
      default:
        return { action: 'cancel', reason: 'User cancelled operation' };
    }
  }

  /**
   * Find an alternative port for the given framework
   */
  private async findAlternativePort(desiredPort: number, framework: FrameworkType): Promise<number> {
    this.outputChannel.appendLine(`🔍 Looking for alternative ports for ${desiredPort}...`);
    
    // Get framework-specific alternatives
    const alternatives = this.getFrameworkPortAlternatives(desiredPort, framework);
    
    // Check each alternative port
    for (const altPort of alternatives) {
      if (await this.isPortAvailable(altPort)) {
        this.outputChannel.appendLine(`✅ Found available alternative port: ${altPort}`);
        return altPort;
      }
    }
    
    // If no alternatives available, use detectPort to find any available port
    this.outputChannel.appendLine(`⚠️ No framework-specific alternatives available, searching for any available port...`);
    const anyAvailablePort = await detectPort(desiredPort);
    this.outputChannel.appendLine(`🎯 Found available port: ${anyAvailablePort}`);
    
    return anyAvailablePort;
  }

  /**
   * Get framework-specific port alternatives
   */
  private getFrameworkPortAlternatives(desiredPort: number, framework: FrameworkType): number[] {
    switch (framework) {
      case 'next':
      case 'react':
        // React/Next.js: 3000, 3001, 3002, 3003, 3004, 3005
        return [3001, 3002, 3003, 3004, 3005];
        
      case 'vite':
        // Vite: 5173, 5174, 5175, 5176, 5177, 5178
        return [5174, 5175, 5176, 5177, 5178];
        
      case 'live-server':
        // HTML: 8080, 8081, 8082, 8083, 8084, 8085
        return [8081, 8082, 8083, 8084, 8085];
        
      case 'fullstack':
        // Fullstack: Backend 3001+, Frontend 3000+
        return [3001, 3002, 3003, 3004, 3005];
        
      default:
        // Generic: +1, +2, +3, +4, +5
        return [desiredPort + 1, desiredPort + 2, desiredPort + 3, desiredPort + 4, desiredPort + 5];
    }
  }

  /**
   * Stop another Forkery project
   */
  private async stopOtherForkeryProject(portInfo: ProcessInfo): Promise<void> {
    try {
      this.outputChannel.appendLine(`🛑 Stopping other Forkery project: ${portInfo.projectName || 'Unknown'}`);
      
      // Gracefully terminate the other process
      const killProcess = child_process.spawn('kill', [portInfo.pid.toString()], {
        stdio: 'pipe',
        shell: true
      });
      
      await new Promise<void>((resolve, reject) => {
        killProcess.on('close', (code) => {
          if (code === 0) {
            this.outputChannel.appendLine(`✅ Successfully stopped other Forkery project`);
            resolve();
          } else {
            reject(new Error(`Failed to stop process, exit code: ${code}`));
          }
        });
        
        killProcess.on('error', (error) => {
          reject(new Error(`Failed to stop process: ${error.message}`));
        });
      });
      
      // Wait for port to be released
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to stop other project: ${error}`);
      throw error;
    }
  }

  /**
   * Fallback to aggressive port resolution for non-Forkery processes
   */
  private async aggressivePortResolution(desiredPort: number): Promise<number> {
    try {
      this.outputChannel.appendLine(`🔍 Aggressively killing processes on port ${desiredPort}...`);
      
      // Use lsof to find processes using the port
      const findProcess = child_process.spawn('lsof', ['-ti', `:${desiredPort}`], {
        stdio: 'pipe',
        shell: true
      });

      return new Promise<number>((resolve, reject) => {
        let processIds = '';
        
        findProcess.stdout?.on('data', (data) => {
          processIds += data.toString();
        });

        findProcess.on('close', async (code) => {
          if (code === 0 && processIds.trim()) {
            const pids = processIds.trim().split('\n');
            this.outputChannel.appendLine(`🎯 Found ${pids.length} process(es) using port ${desiredPort}`);
            
            // Kill all processes on the port
            for (const pid of pids) {
              if (pid.trim()) {
                try {
                  await this.killProcess(parseInt(pid.trim()));
                } catch (error) {
                  this.outputChannel.appendLine(`⚠️ Error killing process ${pid}: ${error}`);
                }
              }
            }
            
            // Wait for processes to fully terminate
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Now check port availability
            const availablePort = await detectPort(desiredPort);
            
            if (availablePort === desiredPort) {
              this.outputChannel.appendLine(`✅ Port ${desiredPort} is available after cleanup`);
            } else {
              this.outputChannel.appendLine(`⚠️ Port ${desiredPort} still busy after cleanup, using ${availablePort} instead`);
            }
            
            resolve(availablePort);
          } else {
            this.outputChannel.appendLine(`ℹ️ No processes found using port ${desiredPort}`);
            resolve(desiredPort);
          }
        });

        findProcess.on('error', (error) => {
          reject(new Error(`Failed to check port ${desiredPort}: ${error.message}`));
        });
      });
      
    } catch (error) {
      this.outputChannel.appendLine(`❌ Aggressive port resolution failed: ${error}`);
      this.outputChannel.appendLine(`🔄 Falling back to requested port ${desiredPort}`);
      return desiredPort;
    }
  }

  /**
   * Kill a process with graceful fallback
   */
  private async killProcess(pid: number): Promise<void> {
    try {
      // First try graceful termination
      const killProcess = child_process.spawn('kill', [pid.toString()], {
        stdio: 'pipe',
        shell: true
      });
      
      await new Promise<void>((resolve, reject) => {
        killProcess.on('close', (code) => {
          if (code === 0) {
            this.outputChannel.appendLine(`✅ Gracefully killed process ${pid}`);
            resolve();
          } else {
            reject(new Error(`Failed to kill process ${pid}, exit code: ${code}`));
          }
        });
      });
      
      // Wait a moment for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if process is still running, if so, force kill
      try {
        const checkProcess = child_process.spawn('kill', ['-0', pid.toString()], {
          stdio: 'pipe',
          shell: true
        });
        
        await new Promise<void>((resolve) => {
          checkProcess.on('close', async (checkCode) => {
            if (checkCode === 0) {
              // Process still running, force kill
              this.outputChannel.appendLine(`⚠️ Process ${pid} still running, force killing...`);
              const forceKill = child_process.spawn('kill', ['-9', pid.toString()], {
                stdio: 'pipe',
                shell: true
              });
              
              await new Promise<void>((resolveForce) => {
                forceKill.on('close', () => {
                  this.outputChannel.appendLine(`💀 Force killed process ${pid}`);
                  resolveForce();
                });
              });
            }
            resolve();
          });
        });
      } catch (error) {
        // Process already terminated
      }
      
    } catch (error) {
      this.outputChannel.appendLine(`⚠️ Error killing process ${pid}: ${error}`);
      throw error;
    }
  }
}
