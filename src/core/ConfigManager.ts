import * as vscode from 'vscode';
import { 
  ExtensionConfig, 
  FrameworkConfig, 
  TemplateConfig, 
  PortConfig,
  BuildConfig,
  DevConfig,
  TestConfig,
  DeploymentConfig 
} from '../types/ConfigTypes';
import { FrameworkType, BrowserMode, PackageManager } from '../types/ProjectTypes';

/**
 * Manages extension configuration and framework-specific settings
 */
export class ConfigManager {
  private config: vscode.WorkspaceConfiguration;
  private frameworkConfigs: Map<FrameworkType, FrameworkConfig> = new Map();

  constructor() {
    this.config = vscode.workspace.getConfiguration('preview');
    this.initializeFrameworkConfigs();
  }

  /**
   * Get the current extension configuration
   */
  getExtensionConfig(): ExtensionConfig {
    return {
      port: this.config.get<number>('port') || null,
      browserMode: this.config.get<BrowserMode>('browserMode') || 'in-editor',
      defaultScript: this.config.get<string>('defaultScript') || 'dev',
      autoStart: this.config.get<boolean>('autoStart') || false,
      portConflictResolution: this.config.get<'cooperative' | 'aggressive' | 'ask'>('portConflictResolution') || 'cooperative',
      enableLogging: this.config.get<boolean>('enableLogging') || true,
      logLevel: this.config.get<'debug' | 'info' | 'warn' | 'error'>('logLevel') || 'info'
    };
  }

  /**
   * Get framework-specific configuration
   */
  getFrameworkConfig(framework: FrameworkType): FrameworkConfig | undefined {
    return this.frameworkConfigs.get(framework);
  }

  /**
   * Get all framework configurations
   */
  getAllFrameworkConfigs(): Map<FrameworkType, FrameworkConfig> {
    return new Map(this.frameworkConfigs);
  }

  /**
   * Get port configuration for a specific framework
   */
  getPortConfig(framework: FrameworkType): PortConfig {
    const frameworkConfig = this.getFrameworkConfig(framework);
    if (!frameworkConfig) {
      // Return default port configuration
      return {
        preferredPort: 3000,
        fallbackPorts: [3001, 3002, 3003, 3004, 3005],
        portRange: [3000, 3100],
        reservedPorts: [],
        portConflictStrategy: 'cooperative'
      };
    }

    return {
      preferredPort: frameworkConfig.defaultPort,
      fallbackPorts: frameworkConfig.alternativePorts,
      portRange: this.getPortRangeForFramework(framework),
      reservedPorts: this.getReservedPortsForFramework(framework),
      portConflictStrategy: 'cooperative'
    };
  }

  /**
   * Get build configuration for a framework
   */
  getBuildConfig(framework: FrameworkType): BuildConfig {
    const frameworkConfig = this.getFrameworkConfig(framework);
    
    return {
      buildCommand: frameworkConfig?.buildCommand || 'build',
      buildOutput: this.getBuildOutputForFramework(framework),
      buildTimeout: 120000, // 2 minutes
      enableSourceMaps: true,
      minify: true,
      optimize: true
    };
  }

  /**
   * Get development configuration for a framework
   */
  getDevConfig(framework: FrameworkType): DevConfig {
    const frameworkConfig = this.getFrameworkConfig(framework);
    
    return {
      devCommand: frameworkConfig?.devCommand || 'dev',
      devPort: frameworkConfig?.defaultPort || 3000,
      enableHotReload: this.supportsHotReload(framework),
      enableLiveReload: this.supportsLiveReload(framework),
      watchPatterns: this.getWatchPatternsForFramework(framework),
      ignorePatterns: this.getIgnorePatternsForFramework(framework)
    };
  }

  /**
   * Get testing configuration for a framework
   */
  getTestConfig(framework: FrameworkType): TestConfig {
    return {
      testCommand: 'test',
      testFramework: this.getTestFrameworkForFramework(framework),
      testTimeout: 30000, // 30 seconds
      coverageThreshold: 80,
      testPatterns: this.getTestPatternsForFramework(framework)
    };
  }

  /**
   * Get deployment configuration for a framework
   */
  getDeploymentConfig(framework: FrameworkType): DeploymentConfig {
    return {
      platform: 'vercel',
      buildCommand: this.getBuildCommandForDeployment(framework),
      outputDirectory: this.getOutputDirectoryForFramework(framework),
      environmentVariables: this.getEnvironmentVariablesForFramework(framework),
      customDomain: undefined,
      enablePreview: true
    };
  }

  /**
   * Update port configuration
   */
  async updatePort(port: number): Promise<void> {
    await this.config.update('port', port, vscode.ConfigurationTarget.Workspace);
  }

  /**
   * Update browser mode configuration
   */
  async updateBrowserMode(mode: BrowserMode): Promise<void> {
    await this.config.update('browserMode', mode, vscode.ConfigurationTarget.Workspace);
  }

  /**
   * Update default script configuration
   */
  async updateDefaultScript(script: string): Promise<void> {
    await this.config.update('defaultScript', script, vscode.ConfigurationTarget.Workspace);
  }

  /**
   * Update port conflict resolution strategy
   */
  async updatePortConflictResolution(strategy: 'cooperative' | 'aggressive' | 'ask'): Promise<void> {
    await this.config.update('portConflictResolution', strategy, vscode.ConfigurationTarget.Workspace);
  }

  /**
   * Initialize framework-specific configurations
   */
  private initializeFrameworkConfigs(): void {
    // Next.js configuration
    this.frameworkConfigs.set('next', {
      framework: 'next',
      defaultPort: 3000,
      defaultScript: 'dev',
      alternativePorts: [3001, 3002, 3003, 3004, 3005],
      buildCommand: 'build',
      devCommand: 'dev',
      startCommand: 'start',
      testCommand: 'test'
    });

    // Vite configuration
    this.frameworkConfigs.set('vite', {
      framework: 'vite',
      defaultPort: 5173,
      defaultScript: 'dev',
      alternativePorts: [5174, 5175, 5176, 5177, 5178],
      buildCommand: 'build',
      devCommand: 'dev',
      startCommand: 'preview',
      testCommand: 'test'
    });

    // Fullstack configuration
    this.frameworkConfigs.set('fullstack', {
      framework: 'fullstack',
      defaultPort: 3000,
      defaultScript: 'dev',
      alternativePorts: [3001, 3002, 3003, 3004, 3005],
      buildCommand: 'build',
      devCommand: 'dev',
      startCommand: 'start',
      testCommand: 'test'
    });

    // Gatsby configuration
    this.frameworkConfigs.set('gatsby', {
      framework: 'gatsby',
      defaultPort: 8000,
      defaultScript: 'develop',
      alternativePorts: [8001, 8002, 8003, 8004, 8005],
      buildCommand: 'build',
      devCommand: 'develop',
      startCommand: 'serve',
      testCommand: 'test'
    });

    // Astro configuration
    this.frameworkConfigs.set('astro', {
      framework: 'astro',
      defaultPort: 4321,
      defaultScript: 'dev',
      alternativePorts: [4322, 4323, 4324, 4325, 4326],
      buildCommand: 'build',
      devCommand: 'dev',
      startCommand: 'preview',
      testCommand: 'test'
    });

    // Remix configuration
    this.frameworkConfigs.set('remix', {
      framework: 'remix',
      defaultPort: 3000,
      defaultScript: 'dev',
      alternativePorts: [3001, 3002, 3003, 3004, 3005],
      buildCommand: 'build',
      devCommand: 'dev',
      startCommand: 'start',
      testCommand: 'test'
    });

    // Generic configuration
    this.frameworkConfigs.set('generic', {
      framework: 'generic',
      defaultPort: 3000,
      defaultScript: 'dev',
      alternativePorts: [3001, 3002, 3003, 3004, 3005],
      buildCommand: 'build',
      devCommand: 'dev',
      startCommand: 'start',
      testCommand: 'test'
    });
  }

  /**
   * Get port range for a specific framework
   */
  private getPortRangeForFramework(framework: FrameworkType): [number, number] {
    switch (framework) {
      case 'vite':
        return [5173, 5200];
      case 'gatsby':
        return [8000, 8100];
      case 'astro':
        return [4321, 4400];
      default:
        return [3000, 3100];
    }
  }

  /**
   * Get reserved ports for a specific framework
   */
  private getReservedPortsForFramework(framework: FrameworkType): number[] {
    switch (framework) {
      case 'fullstack':
        return [5000, 5001, 5002]; // Backend ports
      default:
        return [];
    }
  }

  /**
   * Get build output directory for a framework
   */
  private getBuildOutputForFramework(framework: FrameworkType): string {
    switch (framework) {
      case 'next':
        return '.next';
      case 'vite':
        return 'dist';
      case 'gatsby':
        return 'public';
      case 'astro':
        return 'dist';
      default:
        return 'dist';
    }
  }

  /**
   * Check if framework supports hot reload
   */
  private supportsHotReload(framework: FrameworkType): boolean {
    return ['next', 'vite', 'react'].includes(framework);
  }

  /**
   * Check if framework supports live reload
   */
  private supportsLiveReload(framework: FrameworkType): boolean {
    return ['gatsby', 'astro', 'remix'].includes(framework);
  }

  /**
   * Get watch patterns for a framework
   */
  private getWatchPatternsForFramework(framework: FrameworkType): string[] {
    switch (framework) {
      case 'next':
        return ['src/**/*', 'pages/**/*', 'components/**/*'];
      case 'vite':
        return ['src/**/*', 'public/**/*'];
      case 'gatsby':
        return ['src/**/*', 'gatsby-*.js', 'gatsby-*.ts'];
      case 'astro':
        return ['src/**/*', 'public/**/*', 'astro.config.*'];
      default:
        return ['src/**/*', '**/*.{js,jsx,ts,tsx}'];
    }
  }

  /**
   * Get ignore patterns for a framework
   */
  private getIgnorePatternsForFramework(framework: FrameworkType): string[] {
    return [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'public/**',
      '**/*.log',
      '**/*.tmp'
    ];
  }

  /**
   * Get test framework for a framework
   */
  private getTestFrameworkForFramework(framework: FrameworkType): string {
    switch (framework) {
      case 'next':
        return 'jest';
      case 'vite':
        return 'vitest';
      case 'gatsby':
        return 'jest';
      case 'astro':
        return 'vitest';
      default:
        return 'jest';
    }
  }

  /**
   * Get test patterns for a framework
   */
  private getTestPatternsForFramework(framework: FrameworkType): string[] {
    return [
      '**/*.test.{js,jsx,ts,tsx}',
      '**/*.spec.{js,jsx,ts,tsx}',
      '**/__tests__/**/*.{js,jsx,ts,tsx}'
    ];
  }

  /**
   * Get build command for deployment
   */
  private getBuildCommandForDeployment(framework: FrameworkType): string {
    const frameworkConfig = this.getFrameworkConfig(framework);
    return frameworkConfig?.buildCommand || 'build';
  }

  /**
   * Get output directory for a framework
   */
  private getOutputDirectoryForFramework(framework: FrameworkType): string {
    return this.getBuildOutputForFramework(framework);
  }

  /**
   * Get environment variables for a framework
   */
  private getEnvironmentVariablesForFramework(framework: FrameworkType): Record<string, string> {
    const baseVars: Record<string, string> = {
      NODE_ENV: 'production'
    };

    switch (framework) {
      case 'next':
        return {
          ...baseVars,
          NEXT_PUBLIC_APP_ENV: 'production'
        };
      case 'vite':
        return {
          ...baseVars,
          VITE_APP_ENV: 'production'
        };
      default:
        return baseVars;
    }
  }

  /**
   * Validate configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const extConfig = this.getExtensionConfig();

    // Validate port configuration
    if (extConfig.port !== null && (extConfig.port < 1024 || extConfig.port > 65535)) {
      errors.push('Port must be between 1024 and 65535');
    }

    // Validate log level
    if (!['debug', 'info', 'warn', 'error'].includes(extConfig.logLevel)) {
      errors.push('Invalid log level specified');
    }

    // Validate port conflict resolution
    if (!['cooperative', 'aggressive', 'ask'].includes(extConfig.portConflictResolution)) {
      errors.push('Invalid port conflict resolution strategy');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    await this.config.update('port', null, vscode.ConfigurationTarget.Workspace);
    await this.config.update('browserMode', 'in-editor', vscode.ConfigurationTarget.Workspace);
    await this.config.update('defaultScript', 'dev', vscode.ConfigurationTarget.Workspace);
    await this.config.update('autoStart', false, vscode.ConfigurationTarget.Workspace);
    await this.config.update('portConflictResolution', 'cooperative', vscode.ConfigurationTarget.Workspace);
    await this.config.update('enableLogging', true, vscode.ConfigurationTarget.Workspace);
    await this.config.update('logLevel', 'info', vscode.ConfigurationTarget.Workspace);
  }

  /**
   * Export configuration to JSON
   */
  exportConfig(): string {
    const extConfig = this.getExtensionConfig();
    return JSON.stringify(extConfig, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  async importConfig(configJson: string): Promise<void> {
    try {
      const config = JSON.parse(configJson) as ExtensionConfig;
      
      // Validate the imported configuration
      const validation = this.validateConfig();
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Apply the imported configuration
      await this.config.update('port', config.port, vscode.ConfigurationTarget.Workspace);
      await this.config.update('browserMode', config.browserMode, vscode.ConfigurationTarget.Workspace);
      await this.config.update('defaultScript', config.defaultScript, vscode.ConfigurationTarget.Workspace);
      await this.config.update('autoStart', config.autoStart, vscode.ConfigurationTarget.Workspace);
      await this.config.update('portConflictResolution', config.portConflictResolution, vscode.ConfigurationTarget.Workspace);
      await this.config.update('enableLogging', config.enableLogging, vscode.ConfigurationTarget.Workspace);
      await this.config.update('logLevel', config.logLevel, vscode.ConfigurationTarget.Workspace);
      
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }
}
