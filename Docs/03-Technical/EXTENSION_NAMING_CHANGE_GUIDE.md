# 🔄 Extension Naming Change Guide

**Complete guide for changing the extension name in the Pistachio Vibe project**

## 🎯 **Overview**

This guide documents the complete process of changing the extension name, including all files that need updates, potential pitfalls, and step-by-step procedures. This is essential for future maintenance and rebranding efforts.

## ⚠️ **Why Extension Name Changes Are Complex**

Changing an extension name affects multiple systems:
- **Extension ID** (publisher.name)
- **Command IDs** (extension.command)
- **Activation events** (onCommand:extension.command)
- **UI component references** (extension ID lookups)
- **Marketplace conflicts** (name uniqueness)
- **User installations** (breaking changes)

## 📋 **Complete Checklist for Name Changes**

### **Phase 1: Package.json Updates**
- [ ] **Extension name** (`name` field)
- [ ] **Display name** (`displayName` field)
- [ ] **Version bump** (recommended for breaking changes)
- [ ] **All command IDs** in `contributes.commands`
- [ ] **All activation events** in `activationEvents`
- [ ] **Menu references** in `contributes.menus`

### **Phase 2: Source Code Updates**
- [ ] **Command registrations** in `src/extension.ts`
- [ ] **Status bar commands** in `src/extension.ts`
- [ ] **UI component command calls** in `src/ui/*.ts`
- [ ] **Test file assertions** in `src/test/suite/*.ts`
- [ ] **Extension ID lookups** in UI components

### **Phase 3: Documentation Updates**
- [ ] **README.md** titles and references
- [ ] **Docs/INDEX.md** titles and descriptions
- [ ] **All documentation files** with old references
- [ ] **Marketplace search references**
- [ ] **Installation instructions**

### **Phase 4: Testing & Validation**
- [ ] **Compile without errors**
- [ ] **Package extension successfully**
- [ ] **Install and test in editor**
- [ ] **Verify UI loads correctly**
- [ ] **Test all commands work**
- [ ] **Check marketplace compatibility**

## 🔧 **Detailed Update Procedures**

### **1. Package.json Changes**

#### **Extension Name Field**
```json
// BEFORE
"name": "pistachio",

// AFTER  
"name": "pistachio-vibe",
```

#### **Display Name Field**
```json
// BEFORE
"displayName": "Pistachio: Visual Vibe coding in IDE",

// AFTER
"displayName": "Pistachio Vibe: Visual App Creation",
```

#### **Command IDs (ALL must be updated)**
```json
// BEFORE
"command": "pistachio.run",
"command": "pistachio.stop",
"command": "pistachio.restart",

// AFTER
"command": "pistachio-vibe.run",
"command": "pistachio-vibe.stop", 
"command": "pistachio-vibe.restart",
```

#### **Activation Events (ALL must be updated)**
```json
// BEFORE
"onCommand:pistachio.run",
"onCommand:pistachio.stop",

// AFTER
"onCommand:pistachio-vibe.run",
"onCommand:pistachio-vibe.stop",
```

### **2. Source Code Updates**

#### **Command Registrations in extension.ts**
```typescript
// BEFORE
vscode.commands.registerCommand('pistachio.run', () => {
vscode.commands.registerCommand('pistachio.stop', () => {

// AFTER
vscode.commands.registerCommand('pistachio-vibe.run', () => {
vscode.commands.registerCommand('pistachio-vibe.stop', () => {
```

#### **Status Bar Commands**
```typescript
// BEFORE
this.statusBarItem.command = 'pistachio.run';
this.statusBarItem.command = 'pistachio.stop';

// AFTER
this.statusBarItem.command = 'pistachio-vibe.run';
this.statusBarItem.command = 'pistachio-vibe.stop';
```

#### **UI Component Command Calls**
```typescript
// BEFORE
vscode.commands.executeCommand('pistachio.run');
vscode.commands.executeCommand('pistachio.stop');

// AFTER
vscode.commands.executeCommand('pistachio-vibe.run');
vscode.commands.executeCommand('pistachio-vibe.stop');
```

#### **Extension ID Lookups (CRITICAL)**
```typescript
// BEFORE
const extensionUri = vscode.extensions.getExtension('H10B.pistachio')?.extensionUri;

// AFTER
const extensionUri = vscode.extensions.getExtension('H10B.pistachio-vibe')?.extensionUri;
```

### **3. Documentation Updates**

#### **README.md**
```markdown
// BEFORE
# 🎨 Pistachio: Visual App Creation for Everyone
- Search for "Pistachio" in the VS Code Extensions marketplace

// AFTER
# 🎨 Pistachio Vibe: Visual App Creation for Everyone
- Search for "Pistachio Vibe" in the VS Code Extensions marketplace
```

#### **Docs/INDEX.md**
```markdown
// BEFORE
# 📚 Pistachio Extension - Documentation Index
**Pistachio** is a VS Code extension that transforms...

// AFTER
# 📚 Pistachio Vibe Extension - Documentation Index
**Pistachio Vibe** is a VS Code extension that transforms...
```

## 🚨 **Common Pitfalls & Solutions**

### **Pitfall 1: Extension ID Mismatch**
**Problem**: UI components can't find the extension
**Symptoms**: UI doesn't load, assets missing, commands fail
**Solution**: Update ALL extension ID lookups to new format

### **Pitfall 2: Command ID Mismatch**
**Problem**: Commands don't execute
**Symptoms**: Clicking buttons does nothing, command palette fails
**Solution**: Update ALL command IDs consistently

### **Pitfall 3: Activation Event Mismatch**
**Problem**: Extension doesn't activate
**Symptoms**: Extension shows as disabled, no status bar
**Solution**: Update ALL activation events to match command IDs

### **Pitfall 4: Marketplace Conflicts**
**Problem**: Extension name already exists
**Symptoms**: Upload fails with "extension already exists" error
**Solution**: Use unique name or add descriptive suffix

## 🛠️ **Automated Update Scripts**

### **Sed Commands for Bulk Updates**
```bash
# Update all command IDs in source files
sed -i '' 's/pistachio\.run/pistachio-vibe.run/g' src/**/*.ts
sed -i '' 's/pistachio\.stop/pistachio-vibe.stop/g' src/**/*.ts
sed -i '' 's/pistachio\.restart/pistachio-vibe.restart/g' src/**/*.ts

# Update extension ID lookups
sed -i '' 's/H10B\.pistachio/H10B.pistachio-vibe/g' src/**/*.ts
```

### **Find and Replace Patterns**
```bash
# Find all files with old references
grep -r "pistachio\." src/
grep -r "H10B\.pistachio" src/

# Count occurrences
grep -r "pistachio\." src/ | wc -l
```

## 📊 **Impact Analysis**

### **Breaking Changes**
- **Extension ID**: `H10B.pistachio` → `H10B.pistachio-vibe`
- **Command namespace**: `pistachio.*` → `pistachio-vibe.*`
- **User installations**: May need to reinstall

### **Non-Breaking Changes**
- **Display name**: What users see in marketplace
- **Description**: Extension description text
- **Keywords**: Search terms and discoverability

### **User Experience Impact**
- **Existing users**: May see extension as disabled
- **New users**: Will see new branding
- **Marketplace**: Different search results

## 🔄 **Rollback Procedures**

### **If Something Goes Wrong**
1. **Revert package.json** to previous name
2. **Revert all source code changes**
3. **Recompile and repackage**
4. **Test thoroughly before proceeding**

### **Version Control Strategy**
- **Create feature branch** for name change
- **Test completely** before merging
- **Keep old version** as backup
- **Document all changes** in commit messages

## 📚 **Reference Examples**

### **Complete Before/After Example**
```json
// BEFORE: package.json
{
  "name": "pistachio",
  "displayName": "Pistachio: Visual Vibe coding in IDE",
  "activationEvents": [
    "onCommand:pistachio.run",
    "onCommand:pistachio.stop"
  ],
  "contributes": {
    "commands": [
      {
        "command": "pistachio.run",
        "title": "Pistachio: Start Preview"
      }
    ]
  }
}

// AFTER: package.json
{
  "name": "pistachio-vibe",
  "displayName": "Pistachio Vibe: Visual App Creation",
  "activationEvents": [
    "onCommand:pistachio-vibe.run",
    "onCommand:pistachio-vibe.stop"
  ],
  "contributes": {
    "commands": [
      {
        "command": "pistachio-vibe.run",
        "title": "Pistachio Vibe: Start Preview"
      }
    ]
  }
}
```

## 🎯 **Best Practices**

### **Before Making Changes**
1. **Research marketplace** for name conflicts
2. **Plan all updates** systematically
3. **Create backup** of current working version
4. **Test in development** environment first

### **During Updates**
1. **Update systematically** by category
2. **Test after each major change**
3. **Use search/replace** for consistency
4. **Document all changes** as you go

### **After Updates**
1. **Compile and test** thoroughly
2. **Package and install** extension
3. **Verify all functionality** works
4. **Update documentation** completely

## 📝 **Change Log Template**

```markdown
## Extension Name Change: [OLD] → [NEW]

### **Files Modified**
- [ ] package.json
- [ ] src/extension.ts
- [ ] src/ui/TemplatePanel.ts
- [ ] src/ui/ProjectControlPanel.ts
- [ ] src/ui/UIManager.ts
- [ ] src/test/suite/index.ts
- [ ] README.md
- [ ] Docs/INDEX.md

### **Changes Made**
- Extension name: [OLD] → [NEW]
- Command IDs: [OLD].* → [NEW].*
- Extension ID: H10B.[OLD] → H10B.[NEW]
- Display name: [OLD description] → [NEW description]

### **Testing Results**
- [ ] Extension compiles without errors
- [ ] Extension packages successfully
- [ ] Extension installs correctly
- [ ] UI loads and displays properly
- [ ] All commands execute correctly
- [ ] Status bar shows correct buttons
- [ ] Assets (banner, icon) display correctly

### **Notes**
- [Any special considerations or issues encountered]
- [Dependencies or external references that need updates]
- [User impact and migration considerations]
```

---

## 🎉 **Success Criteria**

A successful extension name change means:
- ✅ **Extension loads** without errors
- ✅ **UI displays** correctly with all assets
- ✅ **Commands execute** as expected
- ✅ **Status bar** shows correct buttons
- ✅ **Marketplace upload** succeeds
- ✅ **Documentation** reflects new branding
- ✅ **No breaking changes** for users

---

*This guide should be updated whenever extension naming changes are made to ensure future changes follow the same systematic approach.*
