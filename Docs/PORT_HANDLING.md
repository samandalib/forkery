# 🚀 Port Handling Architecture

> **Comprehensive guide to how ports are managed in the Forkery extension across different systems**

## 📋 Table of Contents

1. [Overview](#overview)
2. [Port Handling Systems](#port-handling-systems)
3. [Template Handler Port Management](#template-handler-port-management)
4. [Middle Menu (Dropdown) Port Management](#middle-menu-dropdown-port-management)
5. [Port Conflict Resolution](#port-conflict-resolution)
6. [Current Issues and Solutions](#current-issues-and-solutions)
7. [Best Practices](#best-practices)

## 🎯 Overview

The Forkery extension manages ports across multiple systems to ensure smooth operation of development servers. Port handling is critical for:

- **Avoiding conflicts** between multiple services
- **Ensuring predictable behavior** across different project types
- **Providing fallback options** when preferred ports are unavailable
- **Coordinating backend and frontend** in fullstack projects

## 🔧 Port Handling Systems

The extension has **three main port handling systems**:

1. **Template Handler** (`TemplatePanel.ts`) - Creates projects with dynamic ports
2. **Middle Menu** (`extension.ts` dropdown) - Runs existing projects with port detection
3. **Preview System** (`extension.ts`) - Manages running servers and port conflicts

## 🎨 Template Handler Port Management

### **Location**: `src/ui/TemplatePanel.ts`

### **How It Works**:

The template handler creates **new projects** with **pre-configured, dynamic ports**:

```typescript
private async createFullstackProject(template: any, workspaceRoot: string, progress: any): Promise<void> {
  const detectPort = require('detect-port');
  
  // Detect available port for backend (start from 3001 to avoid conflicts with frontend)
  const backendPort = await detectPort(3001);
  progress.report({ message: `Detected backend port: ${backendPort}` });
  
  // Use detected port in generated server.js
  const serverJs = `const PORT = process.env.PORT || ${backendPort};`;
}
```

### **Port Assignment Strategy**:

| Service | Starting Port | Logic |
|---------|---------------|-------|
| **Backend** | 3001 | `detectPort(3001)` - avoids frontend conflicts |
| **Frontend** | 3000 | Fixed - standard React/Next.js port |
| **HTML/CSS/JS** | 8080 | Fixed - standard live-server port |
| **Vite** | 5173 | Fixed - standard Vite port |

### **Generated Files with Dynamic Ports**:

1. **Backend `server.js`**:
   ```javascript
   const PORT = process.env.PORT || 3001; // Dynamic port
   ```

2. **Frontend API calls**:
   ```javascript
   fetch('http://localhost:${backendPort}/api/data') // Dynamic backend port
   ```

3. **Root `package.json`**:
   ```json
   {
     "scripts": {
       "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\""
     }
   }
   ```

### **Advantages**:
- ✅ **No port conflicts** during project creation
- ✅ **Predictable port ranges** (backend: 3001+, frontend: 3000)
- ✅ **Self-contained projects** with embedded port configuration
- ✅ **Immediate usability** after creation

### **Template-Specific Handling**:

The template handler now provides **dedicated creation methods** for different project types:

1. **Fullstack Templates** (`express-react`, `node-nextjs`):
   - Uses `createFullstackProject()` method
   - Dynamic port detection for backend
   - Coordinated backend/frontend setup

2. **Next.js Templates** (`nextjs-app`):
   - Uses `createNextJsProject()` method
   - Dedicated Next.js creation logic
   - Proper error handling and progress reporting

3. **Other Templates** (`simple-react`, `simple-html`):
   - Uses `executeProjectCreation()` method
   - Generic shell command execution
   - Standard project setup

## 🎛️ Middle Menu (Dropdown) Port Management

### **Location**: `src/extension.ts`

### **How It Works**:

The middle menu system handles **existing projects** and **runs them** with port detection:

```typescript
private async findAvailablePort(desiredPort: number): Promise<number> {
  try {
    // Kill existing processes on the desired port
    await this.killExistingProcesses(desiredPort);
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Detect available port
    const availablePort = await detectPort(desiredPort);
    
    if (availablePort === desiredPort) {
      this.outputChannel.appendLine(`✅ Port ${desiredPort} is available after cleanup`);
    } else {
      this.outputChannel.appendLine(`⚠️ Port ${desiredPort} still busy, using ${availablePort} instead`);
    }
    
    return availablePort;
  } catch (error) {
    return desiredPort; // Fallback
  }
}
```

### **Port Detection Flow**:

1. **Framework Detection** → Determines default port
2. **Port Availability Check** → Uses `detectPort()` library
3. **Process Cleanup** → Kills conflicting processes
4. **Port Assignment** → Assigns available port
5. **Configuration Update** → Updates project config if needed

### **Framework-Specific Port Logic**:

```typescript
switch (framework) {
  case 'fullstack':
    port = 3000; // Frontend port for fullstack
    break;
  case 'vite': 
    port = 5173; // Standard Vite port
    break;
  case 'next': 
    port = 3000; // Standard Next.js port
    break;
  default: 
    port = 3000; // Generic fallback
    break;
}
```

### **Port Conflict Resolution**:

1. **Aggressive Process Killing**:
   ```typescript
   private async killExistingProcesses(port: number): Promise<void> {
     // Kill processes on specific port
     await this.killProcessesOnPort(port);
     
     // Kill all node processes (nuclear option)
     await this.killAllNodeProcesses();
   }
   ```

2. **Port Fallback**:
   ```typescript
   const availablePort = await detectPort(desiredPort);
   if (availablePort !== desiredPort) {
     // Use alternative port
     this.outputChannel.appendLine(`Using ${availablePort} instead of ${desiredPort}`);
   }
   ```

## ⚠️ Current Issues and Solutions

### **Issue 1: Port 5000 Hardcoding in Preview System**

**Problem**: The preview system still logs hardcoded port 5000:
```typescript
this.outputChannel.appendLine(`Backend port: 5000, Frontend port: ${port}`);
```

**Root Cause**: This line is in the **logging section**, not the actual port assignment.

**Solution**: Update logging to reflect actual detected ports.

### **Issue 2: Template Handler vs. Middle Menu Mismatch**

**Problem**: Template handler creates projects with dynamic ports, but middle menu expects fixed ports.

**Current State**: 
- ✅ **Template Handler**: Creates projects with `detectPort(3001)` for backend
- ❌ **Middle Menu**: Still expects backend on port 5000

**Solution**: Coordinate port detection between both systems.

### **Issue 3: Next.js Project Creation Failure**

**Problem**: Next.js projects were failing with "Next.js creation failed with code 1" error.

**Root Cause**: Next.js templates were going through generic `executeProjectCreation` method instead of dedicated handling.

**Solution**: ✅ **RESOLVED** - Created dedicated `createNextJsProject` method with proper error handling and shell execution.

### **Issue 4: Port Detection Timing**

**Problem**: Port detection happens at different times:
- **Template Handler**: During project creation
- **Middle Menu**: During project execution

**Solution**: Store detected ports in project configuration for reuse.

## 🔄 Port Conflict Resolution

### **Multi-Level Conflict Resolution**:

1. **Port-Specific Cleanup**:
   ```typescript
   await this.killProcessesOnPort(desiredPort);
   ```

2. **Framework-Specific Cleanup**:
   ```typescript
   if (framework === 'fullstack') {
     await this.killExistingFullstackProcesses();
   } else if (framework === 'vite') {
     await this.killExistingViteProcesses();
   }
   ```

3. **Nuclear Cleanup**:
   ```typescript
   await this.killAllNodeProcesses();
   ```

4. **Port Detection with Fallback**:
   ```typescript
   const availablePort = await detectPort(desiredPort);
   return availablePort || desiredPort;
   ```

### **Cleanup Strategies**:

| Strategy | When Used | Effectiveness |
|----------|-----------|---------------|
| **Port-Specific** | First attempt | High (targeted) |
| **Framework-Specific** | Second attempt | Medium (broader) |
| **Nuclear** | Last resort | High (comprehensive) |

## 📚 Best Practices

### **Port Assignment**:

1. **Backend Services**: Start from 3001+ to avoid frontend conflicts
2. **Frontend Services**: Use standard ports (3000, 5173, 8080)
3. **Dynamic Detection**: Always use `detectPort()` for backend services
4. **Port Ranges**: Maintain clear separation between service types

### **Conflict Resolution**:

1. **Graceful First**: Try port-specific cleanup first
2. **Escalating Response**: Use broader cleanup strategies progressively
3. **Fallback Ports**: Always have alternative port options
4. **User Notification**: Inform users when ports change

### **Configuration Management**:

1. **Embed Ports**: Store detected ports in generated files
2. **Environment Variables**: Use `process.env.PORT` for flexibility
3. **Port Coordination**: Ensure backend and frontend ports are coordinated
4. **Documentation**: Document port assignments in project READMEs

## 🚀 Future Improvements

### **Planned Enhancements**:

1. **Port Registry**: Centralized port management system
2. **Port Persistence**: Remember port assignments across sessions
3. **Smart Port Selection**: AI-powered port conflict prediction
4. **Port Health Monitoring**: Real-time port availability tracking

### **Recent Fixes**:

1. **✅ Next.js Project Creation**: Resolved "Next.js creation failed with code 1" error
2. **✅ Template Routing**: Improved template handling with dedicated creation methods
3. **✅ Error Handling**: Better error messages and debugging information
4. **✅ Progress Reporting**: Enhanced progress updates during project creation

### **Integration Goals**:

1. **Unified Port Management**: Single source of truth for port handling
2. **Cross-System Coordination**: Template handler and middle menu port sync
3. **User Port Preferences**: Allow users to set preferred port ranges
4. **Port Conflict Prevention**: Proactive port conflict avoidance

---

## 📖 Related Documentation

- **[Testing Guide](TESTING.md)** - Port handling testing procedures
- **[Development Guide](DEVELOPMENT.md)** - Port management architecture
- **[UI Architecture](UI_ARCHITECTURE_LEARNINGS.md)** - Port handling in UI components

## 🔍 Technical Details

### **Dependencies**:
- `detect-port`: Port availability detection
- `child_process`: Process management and cleanup
- `fs`: Configuration file management

### **Key Methods**:
- `detectPort(port)`: Find available port starting from specified port
- `killExistingProcesses(port)`: Clean up port conflicts
- `findAvailablePort(desiredPort)`: Main port resolution logic

### **Configuration Files**:
- `package.json`: Scripts and dependencies
- `server.js`: Backend port configuration
- `vite.config.js`: Frontend port configuration
- `next.config.js`: Next.js port configuration
