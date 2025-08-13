# 👨‍💻 Development Guide

> **Complete setup and development guide for the One-Click Local Preview extension.**

## 🚀 Quick Setup

### **Prerequisites**
- ✅ Cursor or VS Code installed
- ✅ Node.js 16+ installed
- ✅ Git for version control

### **Installation**
```bash
# Clone the repository
git clone <your-repo-url>
cd forkery

# Install dependencies
npm install

# Compile the extension
npm run compile

# Package the extension
vsce package
```

### **Development Workflow**
```bash
# Watch mode for development
npm run watch

# Lint code
npm run lint

# Run tests
npm test
```

## 🏗️ Architecture Overview

### **Core Components**
- **`PreviewManager`** - Main extension logic, project detection, process management
- **`UIManager`** - Coordinates UI display and state management
- **`TemplatePanel`** - Renders project template selection interface
- **`ProjectControlPanel`** - Renders project control interface
- **`ViewProviders`** - VS Code integration for sidebar views

### **Data Flow**
```
User Action → Command → PreviewManager → UIManager → ViewProvider → Webview
```

## 🎨 UI Architecture & What Makes It Work

### **Critical Success Factors**

#### **1. ✅ Package.json Configuration**
The UI only works when these elements are properly configured:

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
  },
  "views": {
    "preview": [
      {
        "type": "webview",           // ← CRITICAL: Must specify "webview" type
        "id": "preview.templates",   // ← Must match ViewProvider.viewType
        "name": "Project Templates",
        "when": "!preview.isRunning" // ← Context key controls view switching
      },
      {
        "type": "webview",
        "id": "preview.control",
        "name": "Project Control", 
        "when": "preview.isRunning"
      }
    ]
  }
}
```

#### **2. ✅ View Provider Registration**
Must be registered in the correct order during extension activation:

```typescript
private registerViewProviders(): void {
  // Register BEFORE commands to ensure views are available
  const templateViewProvider = new TemplateViewProvider(TemplatePanel.getInstance());
  vscode.window.registerWebviewViewProvider(
    TemplateViewProvider.viewType,  // Must match package.json "id"
    templateViewProvider
  );
}
```

#### **3. ✅ Context Key Management**
The `when` clauses depend on context keys being properly set:

```typescript
// Must be set to control which view is shown
vscode.commands.executeCommand('setContext', 'preview.isRunning', false);
```

#### **4. ✅ Webview Content Setup**
Webview must be properly initialized with content:

```typescript
public setView(view: vscode.WebviewView): void {
  this.view = view;
  
  // Set security options
  this.view.webview.options = {
    enableScripts: true,
    localResourceRoots: []
  };
  
  // Set HTML content
  this.view.webview.html = this.getWebviewContent();
}
```

### **What Can Break the UI**

#### **❌ Common Failure Points**

1. **Missing `"type": "webview"`**
   - **Symptom**: "There is no data provider registered" error
   - **Cause**: VS Code doesn't know how to render the view
   - **Fix**: Always include `"type": "webview"` in package.json views

2. **View ID Mismatch**
   - **Symptom**: Views don't appear or show errors
   - **Cause**: `package.json` "id" doesn't match `ViewProvider.viewType`
   - **Fix**: Ensure IDs are identical between package.json and ViewProvider

3. **Context Key Not Set**
   - **Symptom**: Views don't switch or always show same content
   - **Cause**: `preview.isRunning` context key not being updated
   - **Fix**: Call `setContext` whenever project status changes

4. **View Provider Not Registered**
   - **Symptom**: "There is no data provider registered" error
   - **Cause**: `registerWebviewViewProvider` not called or called too late
   - **Fix**: Register in constructor, before commands

5. **Webview HTML Not Set**
   - **Symptom**: Empty or broken webview content
   - **Cause**: `webview.html` not assigned or HTML is malformed
   - **Fix**: Ensure HTML content is valid and properly set

#### **❌ Architecture Anti-Patterns**

1. **Custom Containers**
   - **Problem**: Creating custom `viewsContainers` can cause conflicts
   - **Better**: Use built-in containers like `explorer` or keep custom ones simple

2. **Complex When Clauses**
   - **Problem**: Overly complex `when` conditions can break view switching
   - **Better**: Use simple boolean context keys

3. **Late Registration**
   - **Problem**: Registering view providers after commands are executed
   - **Better**: Register in constructor, before any user interaction

### **Debugging the UI**

#### **🔍 Debug Steps**

1. **Check Console Logs**
   ```typescript
   console.log('TemplateViewProvider: resolveWebviewView called');
   console.log('TemplatePanel: setView called with view:', view);
   ```

2. **Verify View Registration**
   ```typescript
   console.log('PreviewManager: TemplateViewProvider registered with type:', TemplateViewProvider.viewType);
   ```

3. **Test Basic Webview**
   ```typescript
   // Use simple test HTML first
   const testHtml = `<html><body><h1>Test</h1></body></html>`;
   this.view.webview.html = testHtml;
   ```

4. **Check Context Keys**
   ```typescript
   // Verify context key is set
   vscode.commands.executeCommand('setContext', 'preview.isRunning', false);
   ```

#### **🔧 Common Fixes**

1. **Restart Extension Host**
   - `Cmd+Shift+P` → "Developer: Reload Window"

2. **Check Extension Activation**
   - Ensure extension activates on startup
   - Check activation events in package.json

3. **Verify File Structure**
   - All UI files must be compiled to `out/ui/`
   - Check import paths are correct

4. **Clear Extension Cache**
   - Delete `.vscode/extensions` folder
   - Reinstall extension

### **UI Testing Checklist**

- [ ] Rocket icon appears in activity bar
- [ ] Clicking rocket opens preview sidebar
- [ ] Template view shows when no project running
- [ ] Project control view shows when project running
- [ ] Views switch automatically based on context
- [ ] Webview content renders properly
- [ ] No "data provider" errors in console

## 🔧 Development Commands

### **Build Commands**
```bash
npm run compile      # Compile TypeScript
npm run watch        # Watch mode for development
npm run lint         # Run ESLint
npm run test         # Run test suite
```

### **Packaging Commands**
```bash
vsce package         # Create .vsix file
vsce publish         # Publish to marketplace (if configured)
```

## 🧪 Testing

### **Manual Testing**
1. Install extension from .vsix
2. Open empty workspace
3. Test project creation
4. Test preview functionality
5. Test UI interactions

### **Automated Testing**
```bash
npm test             # Run test suite
npm run test:watch   # Watch mode for tests
```

## 🚀 Deployment

### **Local Testing**
```bash
# Package extension
vsce package

# Install in VS Code/Cursor
# Extensions → Install from VSIX
```

### **Production Release**
1. Update version in package.json
2. Run tests: `npm test`
3. Package: `vsce package`
4. Test .vsix file
5. Commit and tag release

## 📚 Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Webview API Guide](https://code.visualstudio.com/api/extension-guides/webview)
- [Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [Extension Marketplace](https://marketplace.visualstudio.com/)

## 🤝 Contributing

### **Code Style**
- Use TypeScript strict mode
- Follow ESLint rules
- Add JSDoc comments for public methods
- Test all changes manually

### **Pull Request Process**
1. Create feature branch from `develop`
2. Make changes and test thoroughly
3. Update documentation
4. Submit PR to `develop` branch
5. Wait for review and merge

---

**Remember**: The UI is fragile and depends on precise configuration. Always test changes thoroughly and document any new patterns discovered.




