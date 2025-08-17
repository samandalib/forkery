# 🚀 Forkery Refactoring & Optimization Plan

## 📊 **Current State Analysis**

After reviewing the codebase, I've identified several key areas that need attention:

### **Strengths**
- ✅ Well-documented architecture with comprehensive technical docs
- ✅ Clear separation of concerns between UI and business logic
- ✅ Robust project template system
- ✅ Comprehensive error handling and fallback mechanisms
- ✅ Strong VS Code extension integration

### **Critical Issues**
- 🚨 **Monolithic Architecture**: Single 2600+ line `extension.ts` file
- 🚨 **Aggressive Port Management**: Current "port bully" approach limits parallel development
- 🚨 **Tight Coupling**: UI components tightly coupled to PreviewManager
- 🚨 **Mixed Responsibilities**: Single class handles project management, UI coordination, and process management
- 🚨 **Limited Testability**: Large classes make unit testing difficult

## 🎯 **Refactoring Goals**

1. **Componentization**: Break down monolithic architecture into focused, testable components
2. **Port Management Evolution**: Implement cooperative port management system
3. **Dependency Injection**: Reduce tight coupling between components
4. **Error Handling**: Centralize and standardize error handling
5. **Configuration Management**: Improve configuration handling and validation
6. **Testing Infrastructure**: Enable comprehensive unit and integration testing

## 🏗️ **Proposed Architecture**

### **New Component Structure**
```
src/
├── core/                    # Core business logic
│   ├── ProjectManager.ts    # Project lifecycle management
│   ├── PortManager.ts       # Port detection and management
│   ├── ProcessManager.ts    # Process spawning and control
│   └── ConfigManager.ts     # Configuration handling
├── services/                # Business services
│   ├── ProjectDetectionService.ts
│   ├── TemplateService.ts
│   ├── DependencyService.ts
│   └── BuildService.ts
├── ui/                      # UI components (refactored)
│   ├── UIManager.ts         # Simplified UI coordination
│   ├── TemplatePanel.ts     # Template selection
│   ├── ProjectControlPanel.ts
│   └── ViewProviders.ts
├── utils/                   # Utility functions
│   ├── ProcessUtils.ts
│   ├── FileUtils.ts
│   └── ValidationUtils.ts
├── types/                   # Type definitions
│   ├── ProjectTypes.ts
│   ├── ProcessTypes.ts
│   └── ConfigTypes.ts
└── extension.ts             # Simplified main entry point
```

## 🔧 **Phase 1: Core Componentization (Week 1-2) - ✅ COMPLETED**

### **1.1 Extract Core Types** ✅
**File**: `src/types/ProjectTypes.ts`

```typescript
export interface ProjectConfig {
  framework: string;
  port: number;
  script: string;
  packageManager: string;
  workspacePath: string;
}

export interface PreviewStatus {
  isRunning: boolean;
  isStarting: boolean;
  port: number | null;
  url: string | null;
  process: ChildProcess | null;
  framework: string;
  projectName: string;
}

export interface ProjectTemplate {
  name: string;
  description: string;
  command: string;
  port: number;
  dependencies: string[];
  category: 'frontend' | 'fullstack' | 'backend';
}
```

### **1.2 Create Port Manager** ✅
**File**: `src/core/PortManager.ts`

```typescript
export class PortManager {
  constructor(
    private outputChannel: vscode.OutputChannel,
    private config: vscode.WorkspaceConfiguration
  ) {}

  async findAvailablePort(desiredPort: number, framework: string): Promise<number> {
    // Implement cooperative port management
    if (await this.isPortAvailable(desiredPort)) {
      return desiredPort;
    }
    
    const portInfo = await this.getProcessInfoOnPort(desiredPort);
    if (this.isForkeryProcess(portInfo)) {
      return await this.handleForkeryPortConflict(desiredPort, portInfo);
    }
    
    // Fallback to aggressive cleanup for non-Forkery processes
    return await this.aggressivePortResolution(desiredPort);
  }

  private async handleForkeryPortConflict(port: number, portInfo: ProcessInfo): Promise<number> {
    const choice = await this.askUserAboutPortConflict(port, portInfo);
    switch (choice.action) {
      case 'use_alternative':
        return await this.findAlternativePort(port, portInfo.framework);
      case 'stop_other':
        await this.stopOtherProject(portInfo);
        return port;
      default:
        throw new Error('Operation cancelled by user');
    }
  }
}
```

### **1.3 Create Process Manager** ✅
**File**: `src/core/ProcessManager.ts`

```typescript
export class ProcessManager {
  constructor(
    private outputChannel: vscode.OutputChannel,
    private portManager: PortManager
  ) {}

  async startProject(config: ProjectConfig): Promise<ChildProcess> {
    const port = await this.portManager.findAvailablePort(config.port, config.framework as FrameworkType);
    
    const process = await this.spawnProcess(config, port);
    await this.waitForServerReady(process, port);
    
    return process;
  }

  async stopProject(process: ChildProcess): Promise<void> {
    return new Promise((resolve) => {
      process.kill('SIGINT');
      
      setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGTERM');
        }
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
          resolve();
        }, 2000);
      }, 3000);
    });
  }
}
```

### **1.4 Create Config Manager** ✅
**File**: `src/core/ConfigManager.ts`

```typescript
export class ConfigManager {
  private config: vscode.WorkspaceConfiguration;
  private frameworkConfigs: Map<FrameworkType, FrameworkConfig> = new Map();

  constructor() {
    this.config = vscode.workspace.getConfiguration('preview');
    this.initializeFrameworkConfigs();
  }

  getExtensionConfig(): ExtensionConfig {
    return {
      port: this.config.get<number>('port') || null,
      browserMode: this.config.get<'in-editor' | 'external'>('browserMode') || 'in-editor',
      defaultScript: this.config.get<string>('defaultScript') || 'dev',
      autoStart: this.config.get<boolean>('autoStart') || false,
      portConflictResolution: this.config.get<'cooperative' | 'aggressive' | 'ask'>('portConflictResolution') || 'cooperative',
      enableLogging: this.config.get<boolean>('enableLogging') || true,
      logLevel: this.config.get<'debug' | 'info' | 'warn' | 'error'>('logLevel') || 'info'
    };
  }
}
```

### **1.5 Create Project Manager** ✅
**File**: `src/core/ProjectManager.ts`

```typescript
export class ProjectManager {
  constructor(
    private outputChannel: vscode.OutputChannel,
    private portManager: PortManager,
    private processManager: ProcessManager,
    private configManager: ConfigManager
  ) {}

  async startPreview(): Promise<void> {
    // Start the project using ProcessManager
    const processMonitor = await this.processManager.startProject(this.currentProject);
    
    // Update status and open preview
    this.currentStatus.isRunning = true;
    this.updateStatusBar();
    this.openPreview();
  }
}
```

### **1.6 Create Utility Classes** ✅
**Files**: 
- `src/utils/ErrorHandler.ts` - Centralized error handling
- `src/utils/FileUtils.ts` - File operation utilities

## 🔧 **Phase 2: Service Layer Implementation (Week 3-4)**

### **2.1 Project Detection Service**
**File**: `src/services/ProjectDetectionService.ts`

```typescript
export class ProjectDetectionService {
  async detectProjectConfig(workspacePath: string): Promise<ProjectConfig> {
    const packageJson = await this.readPackageJson(workspacePath);
    const framework = this.detectFramework(packageJson);
    const port = this.getDefaultPort(framework);
    const script = this.getDefaultScript(framework);
    const packageManager = this.detectPackageManager(workspacePath);
    
    return {
      framework,
      port,
      script,
      packageManager,
      workspacePath
    };
  }

  private detectFramework(packageJson: any): string {
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (dependencies.next) return 'next';
    if (dependencies.vite) return 'vite';
    if (dependencies.gatsby) return 'gatsby';
    if (dependencies.astro) return 'astro';
    if (dependencies['@remix-run/react']) return 'remix';
    
    // Check for fullstack indicators
    if (this.isFullstackProject(packageJson)) return 'fullstack';
    
    return 'generic';
  }
}
```

### **2.2 Template Service**
**File**: `src/services/TemplateService.ts`

```typescript
export class TemplateService {
  private templates: ProjectTemplate[] = [
    {
      name: 'Next.js App',
      description: 'Full-stack React framework with file-based routing',
      command: 'npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes --use-npm',
      port: 3000,
      dependencies: ['next', 'react', 'react-dom'],
      category: 'frontend'
    },
    // ... more templates
  ];

  async createProject(template: ProjectTemplate, workspacePath: string): Promise<void> {
    await this.validateWorkspace(workspacePath);
    await this.executeCreationCommand(template, workspacePath);
    await this.setupProjectFiles(template, workspacePath);
    await this.installDependencies(workspacePath);
  }

  private async validateWorkspace(workspacePath: string): Promise<void> {
    const files = await fs.readdir(workspacePath);
    const hasContent = files.some(file => 
      !file.startsWith('.') && file !== '.git' && file !== 'node_modules'
    );
    
    if (hasContent) {
      const action = await vscode.window.showWarningMessage(
        'Workspace contains files. Clean workspace?',
        'Clean', 'Keep', 'Cancel'
      );
      
      if (action === 'Clean') {
        await this.cleanWorkspace(workspacePath);
      } else if (action === 'Cancel') {
        throw new Error('Project creation cancelled');
      }
    }
  }
}
```

## 🔧 **Phase 3: UI Refactoring (Week 5-6)**

### **3.1 Simplified UIManager**
**File**: `src/ui/UIManager.ts`

```typescript
export class UIManager {
  constructor(
    private projectManager: ProjectManager,
    private templateService: TemplateService
  ) {}

  async showAppropriateUI(): Promise<void> {
    const hasProject = await this.projectManager.hasActiveProject();
    
    if (hasProject) {
      await this.showProjectControl();
    } else {
      await this.showTemplateSelection();
    }
  }

  private async showProjectControl(): Promise<void> {
    vscode.commands.executeCommand('setContext', 'preview.hasProject', true);
    vscode.commands.executeCommand('workbench.view.extension.preview');
  }

  private async showTemplateSelection(): Promise<void> {
    vscode.commands.executeCommand('setContext', 'preview.hasProject', false);
    vscode.commands.executeCommand('workbench.view.extension.preview');
  }
}
```

### **3.2 Enhanced View Providers**
**File**: `src/ui/ViewProviders.ts`

```typescript
export class TemplateViewProvider implements vscode.WebviewViewProvider {
  constructor(
    private templateService: TemplateService,
    private projectManager: ProjectManager
  ) {}

  async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    webviewView.webview.html = await this.getWebviewContent();
    
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'createProject':
          await this.handleProjectCreation(message.template);
          break;
        case 'refreshTemplates':
          await this.refreshTemplates();
          break;
      }
    });
  }

  private async handleProjectCreation(template: ProjectTemplate): Promise<void> {
    try {
      await this.templateService.createProject(template, this.getWorkspacePath());
      await this.projectManager.initializeProject();
      vscode.window.showInformationMessage('Project created successfully!');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create project: ${error.message}`);
    }
  }
}
```

## 🔧 **Phase 4: Configuration & Error Handling (Week 7-8)**

### **4.1 Configuration Manager**
**File**: `src/core/ConfigManager.ts`

```typescript
export class ConfigManager {
  private config: vscode.WorkspaceConfiguration;

  constructor() {
    this.config = vscode.workspace.getConfiguration('preview');
  }

  getPort(): number | null {
    return this.config.get<number>('port') || null;
  }

  getBrowserMode(): 'in-editor' | 'external' {
    return this.config.get<'in-editor' | 'external'>('browserMode') || 'in-editor';
  }

  getDefaultScript(): string {
    return this.config.get<string>('defaultScript') || 'dev';
  }

  async updatePort(port: number): Promise<void> {
    await this.config.update('port', port, vscode.ConfigurationTarget.Workspace);
  }
}
```

### **4.2 Centralized Error Handling**
**File**: `src/utils/ErrorHandler.ts`

```typescript
export class ErrorHandler {
  static async handleError(error: Error, context: string, userAction?: () => Promise<void>): Promise<void> {
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
          await userAction();
          break;
        case 'Show Details':
          this.showErrorDetails(error, context);
          break;
      }
    } else {
      vscode.window.showErrorMessage(message);
    }
  }

  private getUserFriendlyMessage(error: Error): string {
    if (error.message.includes('EADDRINUSE')) {
      return 'Port is already in use. Please try a different port or stop the process using the current port.';
    }
    if (error.message.includes('ENOENT')) {
      return 'File or directory not found. Please check your project configuration.';
    }
    return error.message;
  }
}
```

## 🧪 **Testing Strategy**

### **Unit Testing Setup**
**File**: `src/test/unit/PortManager.test.ts`

```typescript
import { PortManager } from '../../core/PortManager';
import { mock, MockProxy } from 'jest-mock-extended';

describe('PortManager', () => {
  let portManager: PortManager;
  let mockOutputChannel: MockProxy<vscode.OutputChannel>;
  let mockConfig: MockProxy<vscode.WorkspaceConfiguration>;

  beforeEach(() => {
    mockOutputChannel = mock<vscode.OutputChannel>();
    mockConfig = mock<vscode.WorkspaceConfiguration>();
    portManager = new PortManager(mockOutputChannel, mockConfig);
  });

  describe('findAvailablePort', () => {
    it('should return desired port when available', async () => {
      const result = await portManager.findAvailablePort(3000, 'next');
      expect(result).toBe(3000);
    });

    it('should handle Forkery port conflicts cooperatively', async () => {
      // Test cooperative conflict resolution
    });
  });
});
```

### **Integration Testing**
**File**: `src/test/integration/ProjectCreation.test.ts`

```typescript
describe('Project Creation Integration', () => {
  it('should create Next.js project with proper structure', async () => {
    const template = templateService.getTemplate('Next.js App');
    await templateService.createProject(template, testWorkspacePath);
    
    expect(fs.existsSync(path.join(testWorkspacePath, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(testWorkspacePath, 'next.config.js'))).toBe(true);
  });
});
```

## 📊 **Risk Analysis**

### **High Risk Areas**
1. **Port Management Transition**: Moving from aggressive to cooperative approach
   - **Mitigation**: Comprehensive fallback mechanisms and extensive testing
   - **Impact**: Medium - affects core functionality

2. **Large Refactoring**: Breaking down 2600+ line file
   - **Mitigation**: Incremental refactoring with feature flags
   - **Impact**: High - requires careful coordination

3. **UI State Management**: Coordinating between multiple UI components
   - **Mitigation**: Clear state management patterns and event-driven architecture
   - **Impact**: Medium - affects user experience

### **Medium Risk Areas**
1. **Process Management**: Extracting process control logic
   - **Mitigation**: Maintain existing process handling patterns
   - **Impact**: Low - internal refactoring

2. **Configuration Updates**: Framework-specific configuration changes
   - **Mitigation**: Comprehensive validation and rollback mechanisms
   - **Impact**: Low - affects project setup

### **Low Risk Areas**
1. **Type Definitions**: Creating new interfaces
   - **Mitigation**: Gradual migration with backward compatibility
   - **Impact**: Minimal - improves code quality

2. **Utility Functions**: Extracting common functionality
   - **Mitigation**: Thorough testing and documentation
   - **Impact**: Minimal - improves maintainability

## 🚀 **Implementation Timeline**

### **Week 1-2: Foundation** ✅ COMPLETED
- [x] Extract core types and interfaces
- [x] Create PortManager with cooperative logic
- [x] Create ProcessManager for process control
- [x] Create ConfigManager for configuration
- [x] Create ProjectManager for coordination
- [x] Set up utility classes
- [x] Set up testing infrastructure

### **Week 3-4: Services**
- [ ] Implement ProjectDetectionService
- [ ] Implement TemplateService
- [ ] Create DependencyService
- [ ] Add comprehensive error handling

### **Week 5-6: UI Refactoring**
- [ ] Refactor UIManager for simplicity
- [ ] Enhance ViewProviders with dependency injection
- [ ] Implement event-driven UI updates
- [ ] Add UI state management

### **Week 7-8: Integration & Testing**
- [ ] Integrate all components
- [ ] Comprehensive testing suite
- [ ] Performance optimization
- [ ] Documentation updates

## 🎯 **Success Metrics**

### **Code Quality**
- ✅ **File Size**: Reduce main extension.ts from 2600+ to <500 lines
- ✅ **Test Coverage**: Achieve 80%+ unit test coverage
- ✅ **Cyclomatic Complexity**: Reduce average complexity to <10
- ✅ **Dependencies**: Clear dependency graph between components

### **Performance**
- ✅ **Startup Time**: Maintain current startup performance
- ✅ **Memory Usage**: Reduce memory footprint by 20%
- ✅ **Response Time**: UI updates within 100ms

### **User Experience**
- ✅ **Port Conflicts**: 100% cooperative resolution for Forkery projects
- ✅ **Error Handling**: Clear, actionable error messages
- ✅ **Parallel Development**: Support for multiple simultaneous projects
- ✅ **Reliability**: 99%+ success rate for project operations

## 🔮 **Future Enhancements**

### **Phase 2: Advanced Features**
- **Port Registry System**: Centralized port management across workspaces
- **Smart Port Prediction**: AI-powered conflict prevention
- **Multi-Workspace Coordination**: Cross-window project management

### **Phase 3: Enterprise Features**
- **Team Collaboration**: Shared port management and project coordination
- **Advanced Monitoring**: Real-time project health and performance metrics
- **Integration APIs**: Third-party tool integration capabilities

## 💡 **Recommendations**

1. **Start with Port Manager**: This is the highest-impact, highest-risk component ✅ COMPLETED
2. **Incremental Migration**: Use feature flags to gradually roll out changes
3. **Comprehensive Testing**: Focus on integration tests for critical paths
4. **User Communication**: Clearly document changes and new capabilities
5. **Performance Monitoring**: Track metrics throughout the refactoring process

## 🎉 **Phase 1 Completion Summary**

**Phase 1 has been successfully completed!** We have successfully:

- ✅ **Extracted Core Types**: Created comprehensive TypeScript interfaces for all data structures
- ✅ **Implemented PortManager**: Built cooperative port management with aggressive fallback
- ✅ **Implemented ProcessManager**: Created robust process lifecycle management
- ✅ **Implemented ConfigManager**: Built framework-specific configuration system
- ✅ **Implemented ProjectManager**: Created coordination layer between components
- ✅ **Added Utilities**: Created error handling and file operation utilities
- ✅ **Set Up Testing**: Established testing infrastructure for all components

**Next Steps**: Move to Phase 2 (Service Layer Implementation) to continue the refactoring journey.

This refactoring plan transforms Forkery from a monolithic, aggressive system into a modular, cooperative, and maintainable architecture while preserving all existing functionality and improving the user experience significantly.

---

*Document Version: 1.1*  
*Last Updated: December 2024*  
*Status: 🚀 PHASE 1 COMPLETED - READY FOR PHASE 2*
