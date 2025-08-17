import { BrowserMode, FrameworkType, PackageManager } from './ProjectTypes';

/**
 * Extension configuration interface
 */
export interface ExtensionConfig {
  port: number | null;
  browserMode: BrowserMode;
  defaultScript: string;
  autoStart: boolean;
  portConflictResolution: 'cooperative' | 'aggressive' | 'ask';
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Framework-specific configuration
 */
export interface FrameworkConfig {
  framework: FrameworkType;
  defaultPort: number;
  defaultScript: string;
  alternativePorts: number[];
  buildCommand?: string;
  devCommand: string;
  startCommand?: string;
  testCommand?: string;
}

/**
 * Project template configuration
 */
export interface TemplateConfig {
  name: string;
  category: 'frontend' | 'fullstack' | 'backend';
  frameworks: FrameworkType[];
  ports: number[];
  scripts: string[];
  dependencies: string[];
  devDependencies: string[];
  postInstallCommands?: string[];
}

/**
 * Port configuration
 */
export interface PortConfig {
  preferredPort: number;
  fallbackPorts: number[];
  portRange: [number, number];
  reservedPorts: number[];
  portConflictStrategy: 'cooperative' | 'aggressive';
}

/**
 * Build configuration
 */
export interface BuildConfig {
  buildCommand: string;
  buildOutput: string;
  buildTimeout: number;
  enableSourceMaps: boolean;
  minify: boolean;
  optimize: boolean;
}

/**
 * Development configuration
 */
export interface DevConfig {
  devCommand: string;
  devPort: number;
  enableHotReload: boolean;
  enableLiveReload: boolean;
  watchPatterns: string[];
  ignorePatterns: string[];
}

/**
 * Testing configuration
 */
export interface TestConfig {
  testCommand: string;
  testFramework: string;
  testTimeout: number;
  coverageThreshold: number;
  testPatterns: string[];
}

/**
 * Deployment configuration
 */
export interface DeploymentConfig {
  platform: 'vercel' | 'netlify' | 'railway' | 'render' | 'custom';
  buildCommand: string;
  outputDirectory: string;
  environmentVariables: Record<string, string>;
  customDomain?: string;
  enablePreview: boolean;
}
