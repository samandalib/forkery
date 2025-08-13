# Development Guide

This guide will help you set up the development environment for the One-Click Local Preview extension.

## 🛠️ Prerequisites

- **Node.js** 16+ and npm
- **Cursor** or **VS Code** with Extension Development Host
- **Git** for version control

## 🚀 Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd cursor-preview
npm install
```

### 2. Compile the Extension

```bash
npm run compile
```

### 3. Run in Debug Mode

1. Open the project in Cursor/VS Code
2. Press `F5` to start debugging
3. A new Extension Development Host window will open
4. Open a frontend project in the new window
5. Look for the ▶ Preview button in the status bar

## 🧪 Testing

### Test with Sample Project

The `sample-project/` directory contains a Next.js project for testing:

1. Open the `sample-project/` folder in the Extension Development Host
2. Click the ▶ Preview button
3. The extension should:
   - Detect Next.js framework
   - Use port 3000
   - Run `npm run dev`
   - Open preview in Simple Browser

### Test with Real Projects

Try the extension with various frameworks:

- **Next.js**: `npx create-next-app@latest my-next-app`
- **Vite**: `npm create vite@latest my-vite-app -- --template react`
- **Astro**: `npm create astro@latest my-astro-app`
- **Gatsby**: `npx gatsby new my-gatsby-app`

## 🔧 Development Workflow

### 1. Make Changes

- Edit files in `src/`
- The main logic is in `src/extension.ts`

### 2. Compile Changes

```bash
npm run compile
```

### 3. Reload Extension

- In the Extension Development Host: `Cmd+Shift+P` → "Developer: Reload Window"
- Or restart debugging with `F5`

### 4. Test Changes

- Check the Debug Console for logs
- Use the "Preview Logs" output panel
- Test with different project types

## 📁 Project Structure

```
cursor-preview/
├── src/
│   └── extension.ts          # Main extension logic
├── sample-project/           # Test project
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript config
├── .eslintrc.json           # Linting rules
├── README.md                # User documentation
└── DEVELOPMENT.md           # This file
```

## 🎯 Key Components

### PreviewManager Class

The main class that handles:
- Project detection and configuration
- Process spawning and management
- Status updates and UI
- Preview opening

### Framework Detection

Located in `detectProjectConfig()`:
- Scans `package.json` for dependencies
- Identifies framework-specific ports
- Determines package manager
- Selects appropriate start script

### Process Management

Handled in `spawnProcess()`:
- Spawns development server
- Monitors output for ready signals
- Handles graceful shutdown
- Port availability checking

## 🐛 Debugging

### Extension Logs

- Check the Debug Console in the Extension Development Host
- Look for the "Preview Logs" output panel
- Use `console.log()` statements in the code

### Common Issues

**Extension not activating**
- Check `package.json` activation events
- Verify the main file path is correct
- Check for TypeScript compilation errors

**Commands not working**
- Verify command registration in `registerCommands()`
- Check command palette for available commands
- Ensure proper context key usage

**Preview not opening**
- Check browser mode setting
- Verify Simple Browser extension is available
- Test with external browser mode

## 📦 Building for Distribution

### 1. Install vsce

```bash
npm install -g @vscode/vsce
```

### 2. Build Package

```bash
vsce package
```

This creates a `.vsix` file that can be installed in Cursor/VS Code.

### 3. Install Locally

```bash
code --install-extension cursor-preview-0.1.0.vsix
```

## 🧪 Testing Different Scenarios

### Framework Detection

Test with projects that have:
- Different package managers (npm, yarn, pnpm)
- Various framework dependencies
- Custom port configurations
- Missing dependencies

### Error Handling

Test error scenarios:
- No `package.json` found
- Missing dependencies
- Port already in use
- Server fails to start
- Process crashes

### UI States

Verify status bar shows:
- ▶ Preview (idle)
- ⟳ Starting... (starting)
- ● Preview: Running on :PORT (running)

## 🔄 Continuous Development

### Watch Mode

For automatic compilation during development:

```bash
npm run watch
```

### Linting

Check code quality:

```bash
npm run lint
```

### Type Checking

Verify TypeScript types:

```bash
npx tsc --noEmit
```

## 📚 Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Child Process](https://nodejs.org/api/child_process.html)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Submit a pull request

## 📝 Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Use meaningful variable names
- Add JSDoc comments for public methods
- Handle errors gracefully
- Use async/await for asynchronous operations

---

Happy coding! 🚀




