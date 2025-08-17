import { ChildProcess } from 'child_process';

/**
 * Process spawn options interface
 */
export interface ProcessSpawnOptions {
  cwd: string;
  stdio: 'pipe' | 'inherit' | 'ignore';
  shell: boolean;
  env?: NodeJS.ProcessEnv;
}

/**
 * Process output interface
 */
export interface ProcessOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Process monitoring interface
 */
export interface ProcessMonitor {
  process: ChildProcess;
  startTime: Date;
  isRunning: boolean;
  output: ProcessOutput;
  onOutput?: (data: string, type: 'stdout' | 'stderr') => void;
  onExit?: (code: number) => void;
  onError?: (error: Error) => void;
}

/**
 * Process termination options
 */
export interface ProcessTerminationOptions {
  signal?: NodeJS.Signals;
  timeout?: number;
  force?: boolean;
}

/**
 * Process cleanup result
 */
export interface ProcessCleanupResult {
  success: boolean;
  processesKilled: number;
  errors: string[];
}

/**
 * Port process mapping
 */
export interface PortProcessMapping {
  port: number;
  processId: number;
  command: string;
  startTime: Date;
  isForkeryProcess: boolean;
}

/**
 * Process health check result
 */
export interface ProcessHealthCheck {
  isHealthy: boolean;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  lastActivity: Date;
}
