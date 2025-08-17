import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as http from 'http';
import { ProjectConfig, FrameworkType, ServerReadyResult } from '../types/ProjectTypes';
import { ProcessMonitor, ProcessSpawnOptions, ProcessTerminationOptions } from '../types/ProcessTypes';
import { PortManager } from './PortManager';

/**
 * Manages process spawning, monitoring, and control
 */
export class ProcessManager {
  private outputChannel: vscode.OutputChannel;
  private portManager: PortManager;
  private activeProcesses: Map<number, ProcessMonitor> = new Map();

  constructor(
    outputChannel: vscode.OutputChannel,
    portManager: PortManager
  ) {
    this.outputChannel = outputChannel;
    this.portManager = portManager;
  }

  /**
   * Start a project with the given configuration
   */
  async startProject(config: ProjectConfig): Promise<ProcessMonitor> {
    try {
      this.outputChannel.appendLine(`🚀 Starting ${config.framework} project...`);
      
      // Find available port using cooperative port management
      const port = await this.portManager.findAvailablePort(config.port, config.framework as FrameworkType);
      this.outputChannel.appendLine(`🌐 Using port: ${port} (requested: ${config.port})`);
      
      // Spawn the process
      const process = await this.spawnProcess(config, port);
      
      // Create process monitor
      const monitor: ProcessMonitor = {
        process,
        startTime: new Date(),
        isRunning: true,
        output: { stdout: '', stderr: '', exitCode: 0 },
        onOutput: (data: string, type: 'stdout' | 'stderr') => {
          this.handleProcessOutput(port, data, type);
        },
        onExit: (code: number) => {
          this.handleProcessExit(port, code);
        },
        onError: (error: Error) => {
          this.handleProcessError(port, error);
        }
      };
      
      // Set up process event handlers
      this.setupProcessEventHandlers(monitor, port);
      
      // Store the monitor
      this.activeProcesses.set(port, monitor);
      
      // Wait for server to be ready
      const serverReady = await this.waitForServerReady(process, port, config.framework as FrameworkType);
      
      if (serverReady.isReady) {
        this.outputChannel.appendLine(`✅ Server ready on port ${port}`);
      } else {
        this.outputChannel.appendLine(`⚠️ Server may not be fully ready on port ${port}`);
      }
      
      return monitor;
      
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to start project: ${error}`);
      throw error;
    }
  }

  /**
   * Stop a project running on the specified port
   */
  async stopProject(port: number, options: ProcessTerminationOptions = {}): Promise<void> {
    const monitor = this.activeProcesses.get(port);
    if (!monitor) {
      this.outputChannel.appendLine(`⚠️ No active process found on port ${port}`);
      return;
    }

    try {
      this.outputChannel.appendLine(`🛑 Stopping project on port ${port}...`);
      
      const { signal = 'SIGINT', timeout = 5000, force = false } = options;
      
      // Send termination signal
      monitor.process.kill(signal);
      
      // Wait for graceful shutdown
      await this.waitForProcessTermination(monitor, timeout);
      
      // Force kill if still running and force is enabled
      if (force && !monitor.process.killed) {
        this.outputChannel.appendLine(`💀 Force killing process on port ${port}...`);
        monitor.process.kill('SIGKILL');
        await this.waitForProcessTermination(monitor, 2000);
      }
      
      // Clean up
      this.activeProcesses.delete(port);
      this.outputChannel.appendLine(`✅ Project stopped on port ${port}`);
      
    } catch (error) {
      this.outputChannel.appendLine(`❌ Error stopping project on port ${port}: ${error}`);
      throw error;
    }
  }

  /**
   * Stop all active projects
   */
  async stopAllProjects(): Promise<void> {
    this.outputChannel.appendLine(`🛑 Stopping all active projects...`);
    
    const ports = Array.from(this.activeProcesses.keys());
    const stopPromises = ports.map(port => this.stopProject(port, { force: true }));
    
    await Promise.allSettled(stopPromises);
    this.outputChannel.appendLine(`✅ All projects stopped`);
  }

  /**
   * Get status of all active processes
   */
  getActiveProcesses(): Map<number, ProcessMonitor> {
    return new Map(this.activeProcesses);
  }

  /**
   * Check if a project is running on a specific port
   */
  isProjectRunning(port: number): boolean {
    const monitor = this.activeProcesses.get(port);
    return monitor ? monitor.isRunning && !monitor.process.killed : false;
  }

  /**
   * Spawn a new process for the project
   */
  private async spawnProcess(config: ProjectConfig, port: number): Promise<child_process.ChildProcess> {
    const workspaceRoot = config.workspacePath;
    
    // Determine command and arguments
    const command = config.packageManager;
    const args = config.packageManager === 'yarn' 
      ? [config.script]
      : ['run', config.script];

    this.outputChannel.appendLine(`📝 Spawning process: ${command} ${args.join(' ')}`);
    this.outputChannel.appendLine(`📁 Working directory: ${workspaceRoot}`);
    this.outputChannel.appendLine(`🎯 Expected port: ${port}`);

    // Create spawn options
    const spawnOptions: ProcessSpawnOptions = {
      cwd: workspaceRoot,
      stdio: 'pipe', // Use string format to prevent terminal interference
      shell: false, // Remove shell dependency to prevent terminal restart issues
      env: { 
        ...process.env, 
        FORCE_COLOR: '1',
        PORT: port.toString(), // Set PORT environment variable
        NODE_ENV: 'development' // Ensure development mode
      }
    };

    // Spawn the process
    const childProcess = child_process.spawn(command, args, spawnOptions);
    
    // Set up basic error handling
    childProcess.on('error', (error) => {
      this.outputChannel.appendLine(`[ERROR] Process spawn error: ${error.message}`);
    });

    return childProcess;
  }

  /**
   * Set up process event handlers
   */
  private setupProcessEventHandlers(monitor: ProcessMonitor, port: number): void {
    const { process } = monitor;

    // Handle stdout - be less aggressive to avoid terminal interference
    process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      monitor.output.stdout += output;
      
      if (monitor.onOutput) {
        monitor.onOutput(output, 'stdout');
      }
      
      // Only log to output channel, don't interfere with terminal display
      this.outputChannel.appendLine(`[STDOUT:${port}] ${output.trim()}`);
    });

    // Handle stderr - be less aggressive to avoid terminal interference
    process.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      monitor.output.stderr += output;
      
      if (monitor.onOutput) {
        monitor.onOutput(output, 'stderr');
      }
      
      // Only log to output channel, don't interfere with terminal display
      this.outputChannel.appendLine(`[STDERR:${port}] ${output.trim()}`);
    });

    // Handle process exit
    process.on('exit', (code: number) => {
      monitor.isRunning = false;
      monitor.output.exitCode = code;
      
      if (monitor.onExit) {
        monitor.onExit(code);
      }
      
      this.outputChannel.appendLine(`[EXIT:${port}] Process exited with code ${code}`);
      this.activeProcesses.delete(port);
    });

    // Handle process errors
    process.on('error', (error: Error) => {
      monitor.isRunning = false;
      
      if (monitor.onError) {
        monitor.onError(error);
      }
      
      this.outputChannel.appendLine(`[ERROR:${port}] Process error: ${error.message}`);
      this.activeProcesses.delete(port);
    });
  }

  /**
   * Wait for server to be ready
   */
  private async waitForServerReady(
    process: child_process.ChildProcess, 
    port: number, 
    framework: FrameworkType
  ): Promise<ServerReadyResult> {
    const maxWaitTime = 30000; // 30 seconds
    const checkInterval = 1000; // 1 second
    const startTime = Date.now();
    
    this.outputChannel.appendLine(`⏳ Waiting for server to be ready on port ${port}...`);
    
    while (Date.now() - startTime < maxWaitTime) {
      // Check if process is still running
      if (process.killed) {
        return {
          isReady: false,
          port,
          url: `http://localhost:${port}`,
          framework,
          detectionMethod: 'timeout'
        };
      }
      
      // Check for ready signals in output
      const monitor = this.activeProcesses.get(port);
      if (monitor && this.isServerReady(monitor.output.stdout, framework)) {
        return {
          isReady: true,
          port,
          url: `http://localhost:${port}`,
          framework,
          detectionMethod: 'signal'
        };
      }
      
      // Check if port is responding
      try {
        await this.checkPort(port);
        return {
          isReady: true,
          port,
          url: `http://localhost:${port}`,
          framework,
          detectionMethod: 'port_check'
        };
      } catch (error) {
        // Port not responding yet, continue waiting
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    // Timeout reached
    this.outputChannel.appendLine(`⏰ Server ready detection timeout reached for port ${port}`);
    return {
      isReady: false,
      port,
      url: `http://localhost:${port}`,
      framework,
      detectionMethod: 'timeout'
    };
  }

  /**
   * Check if server is ready based on output signals
   */
  private isServerReady(output: string, framework: FrameworkType): boolean {
    const lowerOutput = output.toLowerCase();
    
    switch (framework) {
      case 'fullstack':
        return (lowerOutput.includes('backend') && lowerOutput.includes('frontend')) ||
               (lowerOutput.includes('concurrently') && lowerOutput.includes('ready')) ||
               lowerOutput.includes('ready') || lowerOutput.includes('started') || 
               lowerOutput.includes('listening') || lowerOutput.includes('server running') ||
               lowerOutput.includes('development server');
               
      case 'next':
        return lowerOutput.includes('ready') || lowerOutput.includes('started server') || 
               lowerOutput.includes('local:') || lowerOutput.includes('ready on');
               
      case 'vite':
        return lowerOutput.includes('ready') || lowerOutput.includes('local:') || 
               lowerOutput.includes('server running') || lowerOutput.includes('dev server running');
               
      case 'gatsby':
        return lowerOutput.includes('gatsby develop') && lowerOutput.includes('ready');
        
      case 'astro':
        return lowerOutput.includes('astro dev') && lowerOutput.includes('ready');
        
      case 'remix':
        return lowerOutput.includes('remix dev') && lowerOutput.includes('ready');
        
      default:
        return lowerOutput.includes('ready') || lowerOutput.includes('started') || 
               lowerOutput.includes('listening') || lowerOutput.includes('server running') ||
               lowerOutput.includes('development server') || lowerOutput.includes('local:');
    }
  }

  /**
   * Check if a port is responding
   */
  private async checkPort(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${port}`, (res) => {
        resolve();
      });

      req.on('error', () => {
        reject(new Error('Port not responding'));
      });

      req.setTimeout(1000, () => {
        req.destroy();
        reject(new Error('Port check timeout'));
      });
    });
  }

  /**
   * Wait for process termination
   */
  private async waitForProcessTermination(monitor: ProcessMonitor, timeout: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const startTime = Date.now();
      
      const checkInterval = setInterval(() => {
        if (monitor.process.killed || Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Handle process output
   */
  private handleProcessOutput(port: number, data: string, type: 'stdout' | 'stderr'): void {
    // Handle specific output patterns
    if (type === 'stdout') {
      // Check for port changes in Vite output
      if (data.includes('Local:')) {
        const portMatch = data.match(/Local:\s+http:\/\/localhost:(\d+)/);
        if (portMatch) {
          const actualPort = parseInt(portMatch[1]);
          if (actualPort !== port) {
            this.outputChannel.appendLine(`🔄 Port changed from ${port} to ${actualPort}`);
            // Update port mapping if needed
          }
        }
      }
    }
  }

  /**
   * Handle process exit
   */
  private handleProcessExit(port: number, code: number): void {
    this.outputChannel.appendLine(`[EXIT:${port}] Process exited with code ${code}`);
    
    // Clean up the process monitor
    this.activeProcesses.delete(port);
    
    // Log final output
    const monitor = this.activeProcesses.get(port);
    if (monitor) {
      this.outputChannel.appendLine(`[FINAL OUTPUT:${port}] ${monitor.output.stdout}`);
      if (monitor.output.stderr) {
        this.outputChannel.appendLine(`[FINAL ERRORS:${port}] ${monitor.output.stderr}`);
      }
    }
  }

  /**
   * Handle process errors
   */
  private handleProcessError(port: number, error: Error): void {
    this.outputChannel.appendLine(`[ERROR:${port}] Process error: ${error.message}`);
    
    // Clean up the process monitor
    this.activeProcesses.delete(port);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.outputChannel.appendLine('🧹 Cleaning up ProcessManager...');
    
    // Stop all active processes
    this.stopAllProjects().catch(error => {
      this.outputChannel.appendLine(`⚠️ Error during cleanup: ${error}`);
    });
    
    // Clear the map
    this.activeProcesses.clear();
  }
}
