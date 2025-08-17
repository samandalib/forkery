import { ChildProcess } from 'child_process';

/**
 * Core project configuration interface
 */
export interface ProjectConfig {
  framework: string;
  port: number;
  script: string;
  packageManager: string;
  workspacePath: string;
}

/**
 * Project preview status interface
 */
export interface PreviewStatus {
  isRunning: boolean;
  isStarting: boolean;
  port: number | null;
  url: string | null;
  process: ChildProcess | null;
  framework: string;
  projectName: string;
}

/**
 * Project template interface
 */
export interface ProjectTemplate {
  name: string;
  description: string;
  command: string;
  port: number;
  dependencies: string[];
  category: 'frontend' | 'fullstack' | 'backend';
}

/**
 * Framework types supported by the extension
 */
export type FrameworkType = 
  | 'next' 
  | 'vite' 
  | 'gatsby' 
  | 'astro' 
  | 'remix' 
  | 'fullstack' 
  | 'generic'
  | 'react'
  | 'live-server';

/**
 * Package manager types
 */
export type PackageManager = 'npm' | 'yarn' | 'pnpm';

/**
 * Browser display modes
 */
export type BrowserMode = 'in-editor' | 'external';

/**
 * Port conflict resolution choices
 */
export interface PortConflictChoice {
  action: 'use_alternative' | 'stop_other' | 'cancel';
  alternativePort?: number;
  reason?: string;
}

/**
 * Process information for port conflict resolution
 */
export interface ProcessInfo {
  pid: number;
  command: string;
  args: string[];
  cwd: string;
  startTime: Date;
  isForkeryExtension: boolean;
  projectName?: string;
  workspacePath?: string;
}

/**
 * Project creation result
 */
export interface ProjectCreationResult {
  success: boolean;
  projectPath: string;
  framework: FrameworkType;
  port: number;
  message: string;
  errors?: string[];
}

/**
 * Dependency installation result
 */
export interface DependencyInstallResult {
  success: boolean;
  packageManager: PackageManager;
  installedPackages: string[];
  errors?: string[];
}

/**
 * Server ready detection result
 */
export interface ServerReadyResult {
  isReady: boolean;
  port: number;
  url: string;
  framework: FrameworkType;
  detectionMethod: 'signal' | 'port_check' | 'timeout';
}
