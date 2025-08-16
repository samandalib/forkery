# 🎨 UI Troubleshooting Guide

> **Complete guide to fixing UI issues in the One-Click Local Preview extension.**

## 🚨 Common UI Issues & Solutions

### **Issue 1: "There is no data provider registered"**

#### **Symptoms**
- Sidebar shows error message: "There is no data provider registered that can provide view data"
- UI panel is empty or shows error
- Extension appears broken

#### **Root Causes**
1. **Missing `"type": "webview"` in package.json**
2. **View ID mismatch between package.json and ViewProvider**
3. **ViewProvider not registered or registered too late**
4. **Extension activation timing issues**

#### **Solutions**

**Step 1: Check package.json configuration**
```json
{
  "views": {
    "preview": [
      {
        "type": "webview",           // ← MUST be present
        "id": "preview.templates",   // ← Must match ViewProvider.viewType
        "name": "Project Templates",
        "when": "!preview.isRunning"
      }
    ]
  }
}
```

**Step 2: Verify ViewProvider registration**
```typescript
// In extension.ts constructor
this.registerViewProviders(); // ← Must be called BEFORE commands

private registerViewProviders(): void {
  const templateViewProvider = new TemplateViewProvider(TemplatePanel.getInstance());
  vscode.window.registerWebviewViewProvider(
    TemplateViewProvider.viewType,  // ← Must match package.json "id"
    templateViewProvider
  );
}
```

**Step 3: Check ViewProvider.viewType**
```typescript
export class TemplateViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'preview.templates'; // ← Must match package.json
}
```

**Step 4: Restart extension host**
- `Cmd+Shift+P` → "Developer: Reload Window"

---

### **Issue 2: Sidebar not visible or rocket icon missing**

#### **Symptoms**
- No rocket icon in left activity bar
- Can't access preview sidebar
- Extension appears to have no UI

#### **Root Causes**
1. **Missing `viewsContainers` in package.json**
2. **Extension not activating properly**
3. **Package.json syntax errors**

#### **Solutions**

**Step 1: Verify viewsContainers**
```json
{
  "viewsContainers": {
    "activitybar": [
      {
        "id": "preview",
        "title": "Preview",
        "icon": "$(rocket)"
      }
    ]
  }
}
```

**Step 2: Check extension activation**
```json
{
  "activationEvents": [
    "onStartupFinished"  // ← Ensures extension loads on startup
  ]
}
```

**Step 3: Verify main file path**
```json
{
  "main": "./out/extension.js"  // ← Must point to compiled JavaScript
}
```

---

### **Issue 3: Views not switching automatically**

#### **Symptoms**
- Always shows same view (templates or project control)
- Views don't change when project starts/stops
- Context-based switching broken

#### **Root Causes**
1. **Context key `preview.isRunning` not being set**
2. **UIManager not updating context**
3. **When clauses not working properly**

#### **Solutions**

**Step 1: Set context key in UIManager**
```typescript
public updateProjectStatus(status: ProjectStatus): void {
  this.currentProjectStatus = status;
  this.projectControlPanel.updateStatus(status);
  
  // ← CRITICAL: Set context key for view switching
  vscode.commands.executeCommand('setContext', 'preview.isRunning', status.isRunning);
}
```

**Step 2: Initialize context key on startup**
```typescript
constructor() {
  // ← Set initial context key
  vscode.commands.executeCommand('setContext', 'preview.isRunning', false);
}
```

**Step 3: Verify when clauses**
```json
{
  "views": {
    "preview": [
      {
        "id": "preview.templates",
        "when": "!preview.isRunning"  // ← Shows when no project running
      },
      {
        "id": "preview.control",
        "when": "preview.isRunning"    // ← Shows when project is running
      }
    ]
  }
}
```

---

### **Issue 4: Webview content not rendering**

#### **Symptoms**
- Sidebar opens but content is empty
- HTML not displaying properly
- Webview appears broken

#### **Root Causes**
1. **Webview HTML not set**
2. **Security options not configured**
3. **HTML content malformed**

#### **Solutions**

**Step 1: Set webview HTML properly**
```typescript
public setView(view: vscode.WebviewView): void {
  this.view = view;
  
  // ← Set security options
  this.view.webview.options = {
    enableScripts: true,
    localResourceRoots: []
  };
  
  // ← Set HTML content
  this.view.webview.html = this.getWebviewContent();
}
```

**Step 2: Test with simple HTML first**
```typescript
// ← Use simple test HTML to verify webview works
const testHtml = `
  <!DOCTYPE html>
  <html>
  <body style="background: #1e1e1e; color: white;">
    <h1>Test</h1>
    <p>If you see this, webview is working!</p>
  </body>
  </html>
`;
this.view.webview.html = testHtml;
```

**Step 3: Check HTML content generation**
```typescript
private getWebviewContent(): string {
  // ← Ensure this returns valid HTML
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Project Templates</title>
    </head>
    <body>
      <h1>Content</h1>
    </body>
    </html>
  `;
}
```

---

## 🔍 Debugging Steps

### **Step 1: Enable Console Logging**
```typescript
// Add these logs to see what's happening
console.log('TemplateViewProvider: resolveWebviewView called');
console.log('TemplatePanel: setView called with view:', view);
console.log('PreviewManager: TemplateViewProvider registered');
```

### **Step 2: Check Developer Console**
- `Help` → `Toggle Developer Tools`
- Look for console logs and errors
- Check for JavaScript errors

### **Step 3: Verify Extension Activation**
- Check "Extensions" panel
- Look for activation errors
- Verify extension is enabled

### **Step 4: Test Basic Functionality**
- Try simple commands first
- Test with minimal configuration
- Verify each component individually

---

## 🛠️ Quick Fixes

### **Immediate Actions**
1. **Reload Window**: `Cmd+Shift+P` → "Developer: Reload Window"
2. **Check Console**: Look for error messages
3. **Verify Files**: Ensure all UI files are compiled
4. **Test Commands**: Try basic extension commands

### **Configuration Fixes**
1. **Add `"type": "webview"`** to all views in package.json
2. **Match view IDs** between package.json and ViewProvider
3. **Set context keys** in UIManager
4. **Register view providers** in constructor

### **Code Fixes**
1. **Initialize webview properly** in setView method
2. **Set webview HTML** after view is assigned
3. **Handle errors gracefully** in webview setup
4. **Test webview content** before deployment

---

## ✅ UI Working Checklist

- [ ] Rocket icon visible in activity bar
- [ ] Clicking rocket opens preview sidebar
- [ ] No "data provider" errors
- [ ] Template view shows when no project
- [ ] Project control view shows when project running
- [ ] Views switch automatically
- [ ] Webview content renders properly
- [ ] No console errors
- [ ] Extension activates on startup

---

## 🚫 What NOT to Do

1. **Don't remove `"type": "webview"`** - This breaks everything
2. **Don't change view IDs** without updating both package.json and ViewProvider
3. **Don't register view providers after commands** - Register in constructor
4. **Don't forget context keys** - They control view switching
5. **Don't skip webview HTML setup** - Always set content in setView

---

## 🔧 Emergency Recovery

If the UI is completely broken:

1. **Revert to last working version**
2. **Check git history** for working configuration
3. **Compare package.json** with working version
4. **Verify all imports** are correct
5. **Test with minimal configuration**

---

## 🚨 Critical Bug: Status Override Issue (v0.1.8)

### **Problem Description**
The Project Control Panel status was incorrectly reverting to "STOPPED" even when the server was running, causing button states to be backwards.

### **Symptoms**
- ✅ Server starts correctly and status shows "STARTING" → "RUNNING"
- ❌ But then status immediately reverts to "STOPPED"
- ❌ Start button becomes enabled, Stop button becomes disabled
- ❌ User sees server running in browser but UI shows "STOPPED"

### **Root Cause**
The `getProjectInfo()` method in `ProjectControlPanel.ts` was **hardcoded** to always send `status: 'stopped'`, even when the server was running. This caused a race condition:

1. Server starts → Status becomes `running` → Buttons update correctly
2. `getProjectInfo()` gets called → Sends `status: 'stopped'` → **Overrides the running status**
3. UI reverts to stopped state → Start button enabled, Stop button disabled

### **Debug Evidence**
Console logs showed the sequence:
```
ProjectControlPanel: updateProjectStatus called with: running
ProjectControlPanel: Setting running state - Start button disabled, Stop button enabled
ProjectControlPanel: Status updated to: running Button states updated
ProjectControlPanel: Received message: {command: "updateProjectInfo", data: {port: "3000", status: "stopped"}}
ProjectControlPanel: Processing updateProjectInfo
ProjectControlPanel: updateProjectStatus called with: stopped
ProjectControlPanel: Setting stopped state - Start button enabled, Stop button disabled
```

### **Solution**
1. **Removed hardcoded status** from `getProjectInfo()` - it now only sends port information
2. **Enhanced logging** to show exactly what's happening
3. **Status updates only happen** when explicitly requested via `updateStatus` messages

### **Code Changes**
```typescript
// Before (PROBLEMATIC):
this.sendProjectInfo({
    port: port,
    status: 'stopped'  // ❌ Always overrides actual status
});

// After (FIXED):
this.sendProjectInfo({
    port: port
    // ✅ No status override - preserves actual server status
});
```

### **Expected Behavior After Fix**
1. Click "Start Server" → Status: `starting` → Start button loading, Stop button disabled
2. Server ready → Status: `running` → Start button disabled, Stop button enabled ✅
3. Status stays `running` → No more overriding by `getProjectInfo()` ✅
4. Click "Stop Server" → Status: `stopping` → Start button disabled, Stop button loading
5. Server stopped → Status: `stopped` → Start button enabled, Stop button disabled ✅

### **Prevention**
- Never hardcode status values in methods that get called during normal operation
- Use explicit status update messages for status changes
- Keep project info updates separate from status updates
- Add comprehensive logging to trace status flow

---

**Remember**: The UI is fragile and depends on precise configuration. Small changes can break everything. Always test thoroughly and document any fixes that work.
