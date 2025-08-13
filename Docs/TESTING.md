# 🧪 Testing Guide

This guide will walk you through testing all the features of the One-Click Local Preview extension.

## 🚀 Quick Start Testing

### Prerequisites
- ✅ Extension compiled successfully (`npm run compile`)
- ✅ Cursor or VS Code installed
- ✅ Node.js 16+ installed

### Step 1: Open Extension in Cursor
1. Open the `forkery` folder in Cursor
2. Press `F5` to start debugging
3. A new "Extension Development Host" window will open
4. **Keep both windows open** - the original for code, the new one for testing

## 🎯 Test Scenarios

### Scenario 1: Empty Workspace (New Project Creation)

**Goal**: Test the "from scratch" workflow for designers

**Steps**:
1. In the Extension Development Host window:
   - File → Open Folder
   - Create a new empty folder (e.g., "test-project")
   - Open it

2. **Expected Result**: Status bar shows **🚀 New Project**

3. Click the **🚀 New Project** button

4. **Expected Result**: Template picker opens with 6 options:
   - Next.js App
   - Vite + React
   - Astro Site
   - Remix App
   - Gatsby Site
   - Vanilla HTML/CSS/JS

5. Choose **"Next.js App"**

6. **Expected Result**: Confirmation dialog appears

7. Click **"Yes"**

8. **Expected Result**: 
   - Progress notification: "Creating Next.js App project..."
   - Output panel shows creation logs
   - Success message: "🎉 Next.js App project created successfully! Start preview now?"

9. Click **"Start Preview"**

10. **Expected Result**:
    - Status bar shows: **⟳ Starting...**
    - Then: **● Preview: Running on :3000**
    - Preview opens in Simple Browser panel
    - Next.js welcome page loads

### Scenario 2: Existing Project (Preview Functionality)

**Goal**: Test the preview system with an existing project

**Steps**:
1. In the Extension Development Host window:
   - File → Open Folder
   - Navigate to the `sample-project/` folder in this repository
   - Open it

2. **Expected Result**: Status bar shows **▶ Preview**

3. Click the **▶ Preview** button

4. **Expected Result**:
   - Status bar shows: **⟳ Starting...**
   - Output panel shows server logs
   - Then: **● Preview: Running on :3000**
   - Preview opens with the sample Next.js page

5. **Test the sample page**:
   - Click the counter button (should increment)
   - Verify the extension features list is visible
   - Check that the page is responsive

### Scenario 3: Stop and Restart Preview

**Goal**: Test process management

**Steps**:
1. With preview running (from Scenario 1 or 2):
   - Status bar should show: **● Preview: Running on :3000**

2. Click the **●** button

3. **Expected Result**:
   - Status bar shows: **▶ Preview** (or **🚀 New Project** if no project)
   - Server stops
   - Preview closes
   - Notification: "Preview stopped"

4. **Test restart**:
   - Command Palette: `Cmd+Shift+P` → "Preview: Restart"
   - **Expected Result**: Server starts again, preview reopens

### Scenario 4: Command Palette Integration

**Goal**: Test all commands are accessible

**Steps**:
1. Open Command Palette: `Cmd+Shift+P`

2. Type "Preview:" and verify these commands appear:
   - **Preview: Run** (when no preview is running)
   - **Preview: Stop** (when preview is running)
   - **Preview: Restart** (when preview is running)
   - **Preview: Create New Project** (always available)

3. Test each command to ensure they work correctly

### Scenario 5: Error Handling

**Goal**: Test graceful error handling

**Steps**:
1. **Test missing dependencies**:
   - Create a new project
   - Delete the `node_modules` folder
   - Try to start preview
   - **Expected Result**: Extension prompts to install dependencies

2. **Test port conflicts**:
   - Start a preview (e.g., on port 3000)
   - In another terminal: `npx http-server -p 3000`
   - Try to start another preview
   - **Expected Result**: Extension finds an available port automatically

3. **Test invalid project**:
   - Open a folder without `package.json`
   - Try to start preview
   - **Expected Result**: Extension offers to create a new project

## 🔍 Debugging Tips

### Check Extension Logs
1. In the Extension Development Host:
   - View → Output
   - Select "Preview Logs" from dropdown
   - Look for detailed server output and error messages

### Check Debug Console
1. In the original Cursor window:
   - View → Debug Console
   - Look for extension activation and command execution logs

### Common Issues
- **Extension not activating**: Check `package.json` activation events
- **Commands not working**: Verify command registration in `registerCommands()`
- **Preview not opening**: Check browser mode setting and Simple Browser extension
- **Port conflicts**: Check if another service is using the port

## 📊 Testing Checklist

### Core Functionality
- [ ] Extension activates in empty workspace
- [ ] Extension activates in existing project
- [ ] Status bar shows correct text for each state
- [ ] Project creation works for all templates
- [ ] Preview starts successfully
- [ ] Preview stops gracefully
- [ ] Preview restarts correctly

### User Experience
- [ ] Template picker is intuitive
- [ ] Progress notifications are clear
- [ ] Error messages are helpful
- [ ] Success confirmations appear
- [ ] Status bar updates correctly
- [ ] Commands are accessible

### Framework Support
- [ ] Next.js detection and setup
- [ ] Vite detection and setup
- [ ] Astro detection and setup
- [ ] Remix detection and setup
- [ ] Gatsby detection and setup
- [ ] Generic project handling

### Edge Cases
- [ ] Empty workspace handling
- [ ] Missing dependencies
- [ ] Port conflicts
- [ ] Process crashes
- [ ] Invalid project structures

## 🎯 Success Criteria

The extension is working correctly when:

1. **Empty Workspace**: Shows "🚀 New Project" and creates projects successfully
2. **Existing Project**: Shows "▶ Preview" and launches previews correctly
3. **Process Management**: Starts, stops, and restarts servers gracefully
4. **Error Handling**: Provides helpful messages and recovery options
5. **User Experience**: All interactions feel smooth and intuitive

## 🚀 Next Steps After Testing

Once you've verified the extension works:

1. **Package for distribution**: `vsce package`
2. **Install locally**: `code --install-extension cursor-preview-0.1.0.vsix`
3. **Test in production**: Restart Cursor and test normally
4. **Share with designers**: Get feedback on the workflow
5. **Iterate and improve**: Based on real-world usage

---

**Happy testing! 🧪✨**




