# 🏗️ Core Architecture

This directory contains the core business logic components that have been extracted from the monolithic `extension.ts` file.

## 📁 Component Structure

### **PortManager** (`PortManager.ts`)
- **Purpose**: Manages port detection and conflict resolution
- **Key Features**:
  - Cooperative port management for Forkery projects
  - Aggressive cleanup fallback for non-Forkery processes
  - User choice for port conflicts
  - Framework-specific port alternatives
- **Dependencies**: `detect-port`, `child_process`

### **ProcessManager** (`ProcessManager.ts`)
- **Purpose**: Handles process spawning, monitoring, and control
- **Key Features**:
  - Process lifecycle management
  - Server ready detection
  - Process output monitoring
  - Graceful shutdown with fallback
- **Dependencies**: `PortManager`, `child_process`, `http`

### **ConfigManager** (`ConfigManager.ts`)
- **Purpose**: Manages extension configuration and framework settings
- **Key Features**:
  - Framework-specific configurations
  - Port and build configurations
  - Configuration validation
  - Import/export functionality
- **Dependencies**: VS Code configuration API

### **ProjectManager** (`ProjectManager.ts`)
- **Purpose**: Coordinates project lifecycle and core components
- **Key Features**:
  - Project detection and configuration
  - Preview start/stop/restart
  - Status management
  - Browser preview handling
- **Dependencies**: `PortManager`, `ProcessManager`, `ConfigManager`

## 🔄 Data Flow

```
User Action → ProjectManager → ProcessManager → PortManager → System
                ↓
            ConfigManager (provides configuration)
                ↓
            ErrorHandler (handles errors)
```

## 🧪 Testing

Each component includes unit tests in the `src/test/unit/` directory. The tests use Jest and mock external dependencies.

## 🚀 Usage Example

```typescript
import { 
  PortManager, 
  ProcessManager, 
  ConfigManager, 
  ProjectManager 
} from './core';

// Create components
const configManager = new ConfigManager();
const portManager = new PortManager(outputChannel, configManager.getExtensionConfig());
const processManager = new ProcessManager(outputChannel, portManager);
const projectManager = new ProjectManager(outputChannel, portManager, processManager, configManager);

// Initialize
await projectManager.initialize();

// Start preview
await projectManager.startPreview();
```

## 🔧 Configuration

The `ConfigManager` provides framework-specific configurations for:
- Port ranges and alternatives
- Build and development commands
- Testing and deployment settings
- Watch patterns and ignore rules

## 🎯 Benefits of Refactoring

1. **Separation of Concerns**: Each component has a single responsibility
2. **Testability**: Components can be unit tested independently
3. **Maintainability**: Easier to modify and extend individual components
4. **Reusability**: Components can be reused in different contexts
5. **Error Handling**: Centralized error handling with user-friendly messages
6. **Type Safety**: Comprehensive TypeScript interfaces for all data structures

## 🔮 Future Enhancements

- **Port Registry**: Centralized port management across workspaces
- **Process Pooling**: Manage multiple processes efficiently
- **Configuration Sync**: Sync configuration across team members
- **Plugin System**: Allow third-party extensions to hook into the system
