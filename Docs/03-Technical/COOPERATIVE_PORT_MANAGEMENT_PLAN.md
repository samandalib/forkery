# 🕊️ Cooperative Port Management Implementation Plan

> **Comprehensive roadmap for transforming Forkery from aggressive port takeover to cooperative port sharing**

## 📅 **Created**: December 2024  
## 🎯 **Status**: Planning Phase  
## 🚨 **Priority**: High (User Experience Improvement)  
## 🏗️ **Estimated Effort**: 3-4 weeks  

---

## 🎯 **Executive Summary**

### **Current State**
Forkery currently uses an **aggressive port conflict resolution** system that automatically kills any process using a desired port, including other Forkery projects. This creates a "first-come-first-served" environment where only one project can run at a time.

### **Target State**
Implement a **cooperative port management system** that:
- ✅ **Checks port availability** before attempting to use it
- ✅ **Identifies other Forkery projects** and offers user choice
- ✅ **Finds alternative ports** when conflicts occur
- ✅ **Maintains aggressive cleanup** only for non-Forkery processes
- ✅ **Enables parallel development** across multiple projects

### **Business Value**
- **Improved User Experience**: No more unexpected project shutdowns
- **Professional Feel**: Acts like enterprise development tools
- **Better Productivity**: Developers can work on multiple projects simultaneously
- **Reduced Friction**: Eliminates "why did my project stop?" confusion

---

## 🏗️ **Architecture Overview**

### **Current Aggressive Architecture**
```
User clicks Start → Check Port → Kill Everything → Take Port → Start Project
```

### **New Cooperative Architecture**
```
User clicks Start → Check Port → 
├─ Available: Use Port → Start Project
├─ Busy (Forkery): Ask User → 
│  ├─ Use Alternative Port → Start Project
│  ├─ Stop Other Project → Take Port → Start Project
│  └─ Cancel Operation
└─ Busy (Non-Forkery): Clean Up → Take Port → Start Project
```

---

## 🔧 **Technical Implementation Plan**

### **Phase 1: Foundation & Detection (Week 1)**

#### **1.1 Port Availability Checking**
**File**: `src/extension.ts`  
**Method**: `isPortAvailable(port: number): Promise<boolean>`

```typescript
private async isPortAvailable(port: number): Promise<boolean> {
  try {
    // Use detectPort without killing anything
    const availablePort = await detectPort(port);
    return availablePort === port;
  } catch (error) {
    this.outputChannel.appendLine(`⚠️ Port availability check failed: ${error}`);
    return false;
  }
}
```

**Testing**: Unit tests for port detection accuracy

#### **1.2 Process Information Gathering**
**File**: `src/extension.ts`  
**Method**: `getProcessInfoOnPort(port: number): Promise<ProcessInfo>`

```typescript
interface ProcessInfo {
  pid: number;
  command: string;
  args: string[];
  cwd: string;
  startTime: Date;
  isForkeryExtension: boolean;
  projectName?: string;
  workspacePath?: string;
}
```

**Implementation**: Use `lsof` and `ps` commands to gather process details

#### **1.3 Forkery Process Identification**
**File**: `src/extension.ts`  
**Method**: `isForkeryProcess(processInfo: ProcessInfo): boolean`

```typescript
private isForkeryProcess(processInfo: ProcessInfo): boolean {
  // Check if process is running Forkery-related commands
  const forkeryIndicators = [
    'npm run dev', 'npm run start', 'yarn dev', 'yarn start',
    'next dev', 'vite', 'live-server', 'react-scripts start'
  ];
  
  return forkeryIndicators.some(indicator => 
    processInfo.command.includes(indicator) || 
    processInfo.args.some(arg => arg.includes(indicator))
  );
}
```

### **Phase 2: Alternative Port Discovery (Week 2)**

#### **2.1 Framework-Specific Port Alternatives**
**File**: `src/extension.ts`  
**Method**: `getFrameworkPortAlternatives(desiredPort: number): number[]`

```typescript
private getFrameworkPortAlternatives(desiredPort: number): number[] {
  const framework = this.config?.framework;
  
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
```

#### **2.2 Alternative Port Discovery**
**File**: `src/extension.ts`  
**Method**: `findAlternativePort(desiredPort: number): Promise<number>`

```typescript
private async findAlternativePort(desiredPort: number): Promise<number> {
  this.outputChannel.appendLine(`🔍 Looking for alternative ports for ${desiredPort}...`);
  
  // Get framework-specific alternatives
  const alternatives = this.getFrameworkPortAlternatives(desiredPort);
  
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
```

#### **2.3 Port Configuration Updates**
**File**: `src/extension.ts`  
**Method**: `updateProjectPortConfiguration(newPort: number): Promise<void>`

```typescript
private async updateProjectPortConfiguration(newPort: number): Promise<void> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) return;
  
  try {
    // Update framework-specific configuration files
    switch (this.config?.framework) {
      case 'vite':
        await this.updateViteConfigPort(newPort);
        break;
      case 'next':
        await this.updateNextConfigPort(newPort);
        break;
      case 'live-server':
        await this.updateLiveServerConfigPort(newPort);
        break;
      case 'fullstack':
        await this.updateFullstackConfigPort(newPort);
        break;
    }
    
    this.outputChannel.appendLine(`✅ Updated project configuration to use port ${newPort}`);
  } catch (error) {
    this.outputChannel.appendLine(`⚠️ Could not update project configuration: ${error}`);
  }
}
```

### **Phase 3: User Interaction System (Week 3)**

#### **3.1 Port Conflict Resolution Dialog**
**File**: `src/extension.ts`  
**Method**: `askUserAboutPortConflict(port: number, portInfo: ProcessInfo): Promise<PortConflictChoice>`

```typescript
interface PortConflictChoice {
  action: 'use_alternative' | 'stop_other' | 'cancel';
  alternativePort?: number;
  reason?: string;
}

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
      const alternativePort = await this.findAlternativePort(port);
      return { action: 'use_alternative', alternativePort };
      
    case 'Stop Other Project':
      return { action: 'stop_other' };
      
    default:
      return { action: 'cancel', reason: 'User cancelled operation' };
  }
}
```

#### **3.2 Other Project Management**
**File**: `src/extension.ts`  
**Method**: `stopOtherForkeryProject(portInfo: ProcessInfo): Promise<void>`

```typescript
private async stopOtherForkeryProject(portInfo: ProcessInfo): Promise<void> {
  try {
    this.outputChannel.appendLine(`🛑 Stopping other Forkery project: ${portInfo.projectName || 'Unknown'}`);
    
    // Gracefully terminate the other process
    const killProcess = child_process.spawn('kill', [portInfo.pid.toString()], {
      stdio: 'pipe',
      shell: true
    });
    
    await new Promise<void>((resolve) => {
      killProcess.on('close', () => {
        this.outputChannel.appendLine(`✅ Successfully stopped other Forkery project`);
        resolve();
      });
    });
    
    // Wait for port to be released
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (error) {
    this.outputChannel.appendLine(`❌ Failed to stop other project: ${error}`);
    throw error;
  }
}
```

### **Phase 4: Integration & Fallback (Week 4)**

#### **4.1 Main Cooperative Port Method**
**File**: `src/extension.ts`  
**Method**: `findAvailablePortCooperatively(desiredPort: number): Promise<number>`

```typescript
private async findAvailablePortCooperatively(desiredPort: number): Promise<number> {
  try {
    this.outputChannel.appendLine(`🔍 Checking if port ${desiredPort} is available cooperatively...`);
    
    // First: Check if port is available without killing anything
    const isPortAvailable = await this.isPortAvailable(desiredPort);
    
    if (isPortAvailable) {
      this.outputChannel.appendLine(`✅ Port ${desiredPort} is available - no conflicts detected`);
      return desiredPort;
    }
    
    // Second: Port is busy, check what's using it
    this.outputChannel.appendLine(`⚠️ Port ${desiredPort} is busy, analyzing usage...`);
    const portInfo = await this.getProcessInfoOnPort(desiredPort);
    
    if (portInfo.isForkeryExtension) {
      // This is another Forkery project - offer user choice
      this.outputChannel.appendLine(`🎯 Port conflict with another Forkery project detected`);
      const userChoice = await this.askUserAboutPortConflict(desiredPort, portInfo);
      
      switch (userChoice.action) {
        case 'use_alternative':
          if (userChoice.alternativePort) {
            await this.updateProjectPortConfiguration(userChoice.alternativePort);
            return userChoice.alternativePort;
          }
          break;
          
        case 'stop_other':
          await this.stopOtherForkeryProject(portInfo);
          return desiredPort;
          
        case 'cancel':
          throw new Error(`Operation cancelled by user: ${userChoice.reason}`);
      }
    } else {
      // Non-Forkery process - use existing aggressive cleanup
      this.outputChannel.appendLine(`🚨 Port ${desiredPort} is used by non-Forkery process - using aggressive cleanup`);
      return await this.findAvailablePort(desiredPort);
    }
    
  } catch (error) {
    this.outputChannel.appendLine(`❌ Cooperative port detection failed: ${error}`);
    this.outputChannel.appendLine(`🔄 Falling back to aggressive port resolution...`);
    // Fallback to original aggressive method
    return await this.findAvailablePort(desiredPort);
  }
}
```

#### **4.2 Integration Points**
**File**: `src/extension.ts`  
**Replace all calls to**: `findAvailablePort()` → `findAvailablePortCooperatively()`

```typescript
// In startPreview() method:
const port = await this.findAvailablePortCooperatively(this.config.port);

// In other methods that need port detection:
const availablePort = await this.findAvailablePortCooperatively(desiredPort);
```

#### **4.3 Configuration Updates**
**File**: `src/extension.ts`  
**Add new methods for updating various framework configs**:

```typescript
private async updateViteConfigPort(newPort: number): Promise<void> { /* ... */ }
private async updateNextConfigPort(newPort: number): Promise<void> { /* ... */ }
private async updateLiveServerConfigPort(newPort: number): Promise<void> { /* ... */ }
private async updateFullstackConfigPort(newPort: number): Promise<void> { /* ... */ }
```

---

## 🧪 **Testing Strategy**

### **Unit Testing**
- **Port Availability Detection**: Test accuracy of port checking
- **Process Identification**: Test Forkery vs. non-Forkery detection
- **Alternative Port Discovery**: Test framework-specific alternatives
- **Configuration Updates**: Test port updates in various config files

### **Integration Testing**
- **Port Conflict Scenarios**: Test all conflict resolution paths
- **User Interaction Flow**: Test dialog and choice handling
- **Fallback Mechanisms**: Test fallback to aggressive method
- **Multi-Project Scenarios**: Test parallel project handling

### **User Acceptance Testing**
- **Real-World Scenarios**: Test with actual development workflows
- **Performance Impact**: Measure startup time differences
- **User Experience**: Gather feedback on conflict resolution
- **Edge Cases**: Test unusual port configurations

---

## 📊 **Success Metrics**

### **Technical Metrics**
- ✅ **Zero Unwanted Killings**: No Forkery projects killed without user consent
- ✅ **Port Conflict Resolution**: 100% successful conflict resolution
- ✅ **Fallback Reliability**: Aggressive method works as backup
- ✅ **Performance**: Startup time within 10% of current performance

### **User Experience Metrics**
- ✅ **User Satisfaction**: 90%+ positive feedback on conflict handling
- ✅ **Reduced Confusion**: 0% "why did my project stop?" incidents
- ✅ **Parallel Development**: Users can run multiple projects simultaneously
- ✅ **Professional Feel**: Extension behaves like enterprise tools

---

## 🚀 **Deployment Strategy**

### **Phase 1: Alpha Release**
- **Target**: Internal development team
- **Duration**: 1 week
- **Focus**: Core functionality and edge case handling

### **Phase 2: Beta Release**
- **Target**: Select power users
- **Duration**: 1 week
- **Focus**: User experience and real-world scenarios

### **Phase 3: General Release**
- **Target**: All users
- **Duration**: Gradual rollout
- **Focus**: Performance and stability

---

## 🔮 **Future Enhancements**

### **Port Registry System**
- **Centralized Port Management**: Track all Forkery projects and their ports
- **Port Reservation**: Reserve ports for specific projects
- **Port Health Monitoring**: Monitor port availability in real-time

### **Smart Port Selection**
- **AI-Powered Prediction**: Predict port conflicts before they occur
- **Port Optimization**: Suggest optimal port assignments
- **Conflict Prevention**: Proactively avoid port conflicts

### **Multi-Workspace Support**
- **Cross-Workspace Coordination**: Coordinate ports across multiple VS Code windows
- **Global Port Management**: Manage ports at system level
- **Port Sharing**: Allow projects to share ports when appropriate

---

## 📚 **Documentation Updates**

### **User Documentation**
- **Port Conflict Resolution Guide**: How to handle port conflicts
- **Parallel Development Guide**: Running multiple projects simultaneously
- **Troubleshooting**: Common issues and solutions

### **Developer Documentation**
- **Architecture Changes**: New cooperative system design
- **API Updates**: New methods and interfaces
- **Testing Guide**: How to test the new system

---

## 🎯 **Timeline Summary**

| Week | Phase | Deliverables | Testing |
|------|-------|--------------|---------|
| **1** | Foundation | Port detection, process info | Unit tests |
| **2** | Alternatives | Port alternatives, config updates | Integration tests |
| **3** | User Interaction | Dialogs, choice handling | User acceptance tests |
| **4** | Integration | Full system integration | End-to-end tests |

---

## 🚨 **Risk Mitigation**

### **Technical Risks**
- **Port Detection Accuracy**: Fallback to aggressive method
- **Process Identification**: Conservative detection to avoid false positives
- **Configuration Updates**: Rollback mechanisms for failed updates

### **User Experience Risks**
- **Complexity**: Clear user guidance and help documentation
- **Performance**: Maintain current startup performance
- **Reliability**: Comprehensive fallback mechanisms

---

## 💡 **Conclusion**

The cooperative port management system represents a significant evolution in Forkery's architecture, transforming it from a "port bully" to a "port diplomat." This change will enable parallel development workflows while maintaining the reliability and performance that users expect.

The implementation plan provides a structured approach to this transformation, with clear phases, testing strategies, and fallback mechanisms to ensure a smooth transition for all users.

---

*Document Version: 1.0*  
*Last Updated: December 2024*  
*Status: 📋 PLANNING PHASE - READY FOR IMPLEMENTATION*
