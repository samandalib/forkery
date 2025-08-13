# One-Click Local Preview for Cursor

A Cursor extension that provides one-click local preview for frontend projects without requiring terminal knowledge.

## 🎯 Purpose

Designers often struggle to run local development servers because most workflows require:
- Opening the terminal
- Knowing the correct CLI command
- Watching for logs and manually opening the preview URL

This extension removes that friction by:
- Detecting the correct start command for the project
- Running it invisibly in the background
- Automatically opening the preview in-editor (or in a browser)
- Providing Start / Stop / Restart controls in the Cursor UI

**The goal: A designer clicks an icon → the local site appears. No terminal. No commands.**

## ✨ Features

### 🚀 One-Click Preview
- **Smart Detection**: Automatically detects your project framework (React, Next.js, Vite, Astro, Gatsby, Remix, etc.)
- **Auto-Port**: Finds the correct port based on framework conventions
- **Dependency Management**: Automatically installs missing dependencies
- **Background Process**: Runs servers invisibly without terminal clutter

### 🎛️ Simple Controls
- **Start**: Click the ▶ button to launch preview
- **Stop**: Click the ● button to stop the server
- **Restart**: Use command palette to restart when needed
- **Status Indicator**: Always see the current preview status

### 🌐 Preview Options
- **In-Editor**: Opens preview in Cursor's Simple Browser panel
- **External Browser**: Opens in your default browser
- **Configurable**: Choose your preferred preview method

## 🎨 Supported Frameworks

| Framework | Default Port | Script Detection | Project Creation |
|-----------|--------------|------------------|------------------|
| **Next.js** | 3000 | `dev` → `start` | ✅ Full-stack with TypeScript + Tailwind |
| **Vite** | 5173 | `dev` → `serve` | ✅ React + TypeScript template |
| **Gatsby** | 8000 | `develop` → `start` | ✅ Static site generator |
| **Astro** | 4321 | `dev` → `start` | ✅ Component islands + TypeScript |
| **Remix** | 3000 | `dev` → `start` | ✅ Full-stack with nested routing |
| **Vanilla** | 8080 | `start` | ✅ HTML/CSS/JS with live reload |

## 🚀 Installation

### From Source
1. Clone this repository
2. Install dependencies: `npm install`
3. Compile: `npm run compile`
4. Press `F5` in Cursor to run the extension in debug mode

### From VSIX
1. Download the `.vsix` file
2. In Cursor: `Cmd+Shift+P` → "Extensions: Install from VSIX"
3. Select the downloaded file

## 📖 Usage

### Quick Start (Existing Project)
1. Open a frontend project in Cursor
2. Look for the **▶ Preview** button in the status bar (bottom left)
3. Click it to start your local preview
4. The preview will open automatically when ready

### Quick Start (From Scratch)
1. Open an empty workspace in Cursor
2. Look for the **🚀 New Project** button in the status bar
3. Click it to choose from project templates
4. Select your preferred framework
5. The extension creates the project and offers to start preview immediately

### Commands
- **Preview: Run** - Start the preview server
- **Preview: Stop** - Stop the running server
- **Preview: Restart** - Restart the server
- **Preview: Create New Project** - Create a new project from scratch

### Status Indicators
- **🚀 New Project** - Click to create a new project (empty workspace)
- **▶ Preview** - Click to start preview (existing project)
- **⟳ Starting...** - Server is starting up
- **● Preview: Running on :PORT** - Server is running (click to stop)

## ⚙️ Configuration

### Settings
Add to your Cursor settings:

```json
{
  "preview.port": 3000,           // Custom port (null = auto-detect)
  "preview.browserMode": "in-editor", // "in-editor" or "external"
  "preview.defaultScript": "dev"   // Default npm script to run
}
```

### Port Override
If you need a specific port:
1. Open Command Palette: `Cmd+Shift+P`
2. "Preferences: Open Settings (JSON)"
3. Add: `"preview.port": 8080`

## 🔧 How It Works

### 1. Project Creation (From Scratch)
- Detects empty workspaces automatically
- Offers curated project templates
- Runs framework-specific creation commands
- Installs dependencies automatically
- Offers immediate preview launch

### 2. Project Detection (Existing)
- Scans `package.json` for framework dependencies
- Identifies available npm scripts
- Detects package manager (npm, yarn, pnpm)

### 2. Smart Port Selection
- Uses framework-specific default ports
- Automatically finds available ports if default is taken
- Respects custom port configuration

### 3. Process Management
- Spawns development server as background process
- Monitors server output for "ready" signals
- Handles graceful shutdown and cleanup

### 4. Preview Display
- Attempts to open in Cursor's Simple Browser first
- Falls back to external browser if needed
- Configurable display preferences

## 🐛 Troubleshooting

### Common Issues

**"Dependencies not installed"**
- The extension will prompt to install dependencies
- Click "Yes" to automatically install them

**"Port already in use"**
- The extension will automatically find an available port
- Check the output panel for the actual port being used

**"Server failed to start"**
- Check the "Preview Logs" output panel for error details
- Ensure your project has the correct start scripts

**Preview doesn't open**
- Check browser mode setting (in-editor vs external)
- Verify the server started successfully in the status bar

### Debug Mode
1. Press `F5` to run extension in debug mode
2. Check the Debug Console for detailed logs
3. Use the "Preview Logs" output panel for server output

## 🎯 Target Users

- **Primary**: Designers working with frontend projects who want to avoid terminal workflows
- **Secondary**: Developers who want quick-start previews without typing commands
- **Use Cases**: React, Next.js, Vite, Astro, Gatsby, Remix, and other frontend frameworks

## 🚀 Project Templates

The extension includes pre-configured templates for popular frameworks:

- **Next.js App**: Full-stack React with TypeScript, Tailwind CSS, ESLint, and App Router
- **Vite + React**: Fast build tool with React + TypeScript template
- **Astro Site**: Static site generator with component islands and TypeScript
- **Remix App**: Full-stack React with nested routing and server-side rendering
- **Gatsby Site**: React-based static site generator with GraphQL
- **Vanilla HTML/CSS/JS**: Simple static site with live reload server

## 🚧 Limitations

- **Frontend Only**: Does not support backend services
- **Single Project**: One workspace = one preview (v1)
- **Node.js Required**: Projects must use Node.js package management

## 🔮 Future Enhancements

- Device presets (iPhone/iPad/Desktop)
- Grid overlay for layout checking
- Screenshot tool
- Auto-preview on file save
- Multiple project tabs
- Backend service support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built for the Cursor community
- Inspired by designers' need for simpler development workflows
- Uses the excellent `detect-port` package for port management

---

**Made with ❤️ for designers who code**
