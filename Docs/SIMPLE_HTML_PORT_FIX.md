# 🔧 Simple HTML Port Fix - Future Implementation

## 📅 **Created**: December 2024  
## 🎯 **Status**: Planned for future version  
## 🚨 **Priority**: Medium (not blocking milestone 0.1.6)

---

## 🔍 **Problem Analysis**

### **Current Issue:**
- **Simple HTML projects** are being detected as "generic" framework
- **Preview system** uses port 3000 (default for generic)
- **Actual project** is configured to run on port 8080
- **Result**: Port mismatch causing preview issues

### **Root Cause:**
The preview system's framework detection logic is missing `live-server` as a recognized framework type, causing Simple HTML projects to fall into the "generic" category.

---

## 🎯 **Solution Overview**

### **Approach**: Add `live-server` as a recognized framework type
- **Framework Detection**: Detect projects with `live-server` dependency
- **Port Assignment**: Assign port 8080 for `live-server` framework
- **Configuration Validation**: Validate and override port from package.json
- **Ready Signal Detection**: Add live-server specific ready signals
- **Port Extraction**: Extract actual port from live-server output

---

## 🔧 **Technical Implementation**

### **1. Framework Detection**
**File**: `src/extension.ts`  
**Location**: `detectProjectConfig()` method

```typescript
// Add this line after other framework detections
else if (dependencies['live-server']) framework = 'live-server';
```

**Impact**: 
- ✅ Fixes Simple HTML port detection
- ✅ No impact on other frameworks
- ✅ Follows established detection pattern

### **2. Port Assignment**
**File**: `src/extension.ts`  
**Location**: Port assignment switch statement

```typescript
case 'live-server': 
  port = 8080; 
  this.outputChannel.appendLine(`🎯 Detected live-server project - using port 8080`);
  break;
```

**Impact**: 
- ✅ Sets correct default port for live-server projects
- ✅ Maintains consistency with other framework types

### **3. Configuration Validation**
**File**: `src/extension.ts`  
**Location**: Add new method `validateLiveServerConfig()`

```typescript
private async validateLiveServerConfig(): Promise<void> {
  if (this.config?.framework !== 'live-server') return;
  
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) return;

  const packageJsonPath = path.join(workspaceRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};
      
      // Extract the actual port from package.json scripts
      const devScript = scripts.dev || scripts.start || '';
      const portMatch = devScript.match(/--port=(\d+)/);
      if (portMatch) {
        const liveServerPort = parseInt(portMatch[1]);
        this.outputChannel.appendLine(`🔍 live-server config port: ${liveServerPort}`);
        
        // 🚨 CRITICAL: Force update the extension port
        if (this.config.port !== liveServerPort) {
          this.outputChannel.appendLine(`🔄 FORCING extension port from ${this.config.port} to live-server port ${liveServerPort}`);
          this.config.port = liveServerPort; // This is the key line!
        }
        
        if (liveServerPort !== 8080) {
          this.outputChannel.appendLine(`⚠️ live-server config port ${liveServerPort} is not standard (8080), but will use it`);
        }
      } else {
        this.outputChannel.appendLine(`⚠️ No port found in live-server scripts, using default 8080`);
        this.config.port = 8080;
      }
    } catch (error) {
      this.outputChannel.appendLine(`⚠️ Could not validate live-server config: ${error}`);
    }
  } else {
    this.outputChannel.appendLine(`⚠️ No package.json found, using default port 8080`);
    this.config.port = 8080;
  }
}
```

**Impact**: 
- ✅ **Actively overrides** preview system port
- ✅ Reads actual port from package.json scripts
- ✅ Ensures port synchronization

### **4. Call Validation Method**
**File**: `src/extension.ts`  
**Location**: After Vite validation call

```typescript
// Validate Vite config if needed
await this.validateViteConfig();

// Validate live-server config if needed
await this.validateLiveServerConfig();
```

**Impact**: 
- ✅ Ensures validation runs before port assignment
- ✅ Port assignment uses updated configuration

### **5. Ready Signal Detection**
**File**: `src/extension.ts`  
**Location**: `isServerReady()` method

```typescript
case 'live-server':
  return lowerOutput.includes('serving') || 
         lowerOutput.includes('available at') || 
         lowerOutput.includes('localhost');
```

**Impact**: 
- ✅ Proper ready signal detection for live-server
- ✅ Prevents premature preview opening

### **6. Port Extraction from Output**
**File**: `src/extension.ts`  
**Location**: Server ready signal handler

```typescript
// For live-server, extract the actual port from the output
if (this.config?.framework === 'live-server') {
  const portMatch = output.match(/Serving:\s*http:\/\/localhost:(\d+)/);
  if (portMatch) {
    const actualPort = parseInt(portMatch[1]);
    this.outputChannel.appendLine(`🔄 live-server is running on port ${actualPort}, updating configuration...`);
    this.status.port = actualPort;
    this.status.url = `http://localhost:${actualPort}`;
  }
}
```

**Impact**: 
- ✅ Updates preview system with actual running port
- ✅ Handles cases where live-server uses different ports

---

## 🚨 **Why Previous Attempt Failed**

### **What Was Missing:**
1. **Framework detection** was added ✅
2. **Port assignment** was set ✅
3. **❌ Port validation and override** was missing
4. **❌ Active port change** didn't happen

### **The Key Issue:**
```typescript
// Last time: Only detection, no active change
else if (dependencies['live-server']) framework = 'live-server';

// This time: Detection + validation + active override
await this.validateLiveServerConfig(); // This actively changes this.config.port
```

---

## 🧪 **Testing Strategy**

### **To Verify Fix Works:**
1. **Check logs** for: `🎯 Detected live-server project - using port 8080`
2. **Check logs** for: `🔄 FORCING extension port from 3000 to live-server port 8080`
3. **Check logs** for: `🌐 Using port: 8080 (requested: 8080)`
4. **Preview should open** on port 8080, not 3000

### **Test Scenarios:**
1. **Fresh Simple HTML project** creation
2. **Existing Simple HTML project** preview
3. **Port 8080 already in use** (should use conflict resolution)
4. **Custom port in package.json** (should respect custom port)

---

## 📊 **Impact Analysis**

### **✅ What Will Be Impacted:**
- **Simple HTML Template** → Fixed port mismatch
- **Future live-server projects** → Consistent behavior

### **❌ What Will NOT Be Impacted:**
- **All other frameworks** (React, Next.js, Vite, etc.)
- **Generic/unknown projects**
- **Existing port conflict resolution**

### **Risk Assessment:**
- **Port 8080 conflicts**: LOW (handled by existing conflict resolution)
- **False positives**: MINIMAL (live-server rarely used outside HTML projects)
- **Performance impact**: NEGLIGIBLE (minimal validation overhead)

---

## 🎯 **Implementation Priority**

### **Phase 1**: Core Framework Detection
- Add `live-server` framework detection
- Add port assignment (8080)

### **Phase 2**: Port Validation & Override
- Implement `validateLiveServerConfig()` method
- Call validation before port assignment

### **Phase 3**: Enhanced Integration
- Add ready signal detection
- Add port extraction from output

---

## 💡 **Alternative Solutions Considered**

### **1. Hardcode Port 8080**
- **Pros**: Immediate fix, simple implementation
- **Cons**: No fallback, rigid configuration, goes against architecture
- **Decision**: ❌ Rejected - not robust

### **2. Framework Detection (Chosen)**
- **Pros**: Follows architecture, handles conflicts, maintainable
- **Cons**: More complex implementation
- **Decision**: ✅ Chosen - better long-term solution

---

## 📚 **Related Documentation**

- **PORT_HANDLOWING.md**: Port management architecture
- **MILESTONE_0.1.6.md**: Current stable version
- **TESTING.md**: Testing procedures for port handling

---

## 🚀 **Future Implementation Steps**

1. **Create feature branch** for Simple HTML port fix
2. **Implement framework detection** (Phase 1)
3. **Test basic detection** and port assignment
4. **Implement port validation** (Phase 2)
5. **Test port override** functionality
6. **Implement enhanced integration** (Phase 3)
7. **Comprehensive testing** across all scenarios
8. **Documentation updates** and release notes

---

## 🎊 **Success Criteria**

### **When the fix is complete:**
- ✅ Simple HTML projects detected as `live-server` framework
- ✅ Preview system uses port 8080 for Simple HTML projects
- ✅ Port conflicts handled gracefully
- ✅ No impact on other framework types
- ✅ Comprehensive logging for debugging

---

*Document Version: 1.0*  
*Last Updated: December 2024*  
*Status: 📋 PLANNED FOR FUTURE IMPLEMENTATION*
