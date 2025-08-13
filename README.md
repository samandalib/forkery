# 🚀 One-Click Local Preview for Cursor

> **A Cursor extension that provides one-click local preview for frontend projects without requiring terminal knowledge.**

## 🎯 What is it?

This extension removes friction from running local development servers by:
- **Detecting** the correct start command for your project
- **Running** it invisibly in the background  
- **Opening** the preview automatically in-editor or browser
- **Providing** Start/Stop/Restart controls in the Cursor UI

Perfect for designers who want to focus on their work, not terminal commands!

## ✨ Features

- 🚀 **One-Click Preview** - Start your dev server with a single click
- 🆕 **Project Creation** - Create new projects from scratch using templates
- 🔍 **Smart Detection** - Automatically detects React, Next.js, Vite, and more
- 🎛️ **Easy Controls** - Start, stop, and restart from the status bar
- 🌐 **Flexible Preview** - Opens in Cursor's Simple Browser or external browser
- 📱 **Status Indicators** - Always know what's running and where

## 🚀 Quick Start

1. **Install the extension** - Download the `.vsix` file and install in Cursor
2. **Open a project** - Works with existing projects or empty workspaces
3. **Click Preview** - Use the status bar button to start your dev server
4. **Create New** - Click "🚀 New Project" to start from scratch

## 📚 Documentation

**All detailed documentation is available in the [`/Docs`](https://github.com/your-repo/forkery/tree/main/Docs) folder:**

- **[📖 User Guide](https://github.com/your-repo/forkery/blob/main/Docs/README.md)** - Complete feature overview and usage
- **[🎬 Demo](https://github.com/your-repo/forkery/blob/main/Docs/DEMO.md)** - Step-by-step workflow demonstration  
- **[👨‍💻 Development](https://github.com/your-repo/forkery/blob/main/Docs/DEVELOPMENT.md)** - Setup and contribution guide
- **[🧪 Testing](https://github.com/your-repo/forkery/blob/main/Docs/TESTING.md)** - Testing procedures and scenarios
- **[📋 Index](https://github.com/your-repo/forkery/blob/main/Docs/INDEX.md)** - Complete documentation navigation

## 🎨 Supported Frameworks

| Framework | Status | Project Creation | Preview |
|-----------|--------|------------------|---------|
| **React (Vite)** | ✅ Working | ✅ Yes | 🚧 In Progress |
| **Next.js** | 🚧 In Progress | ✅ Yes | ❌ Untested |
| **HTML/CSS/JS** | ✅ Working | ✅ Yes | ✅ Yes |
| **Astro** | 📋 Planned | ❌ No | ❌ No |
| **Remix** | 📋 Planned | ❌ No | ❌ No |
| **Gatsby** | 📋 Planned | ❌ No | ❌ No |

## 🔧 Current Status

**Extension is 70% complete and partially working:**

✅ **What Works:**
- Extension activates and shows UI
- Project creation (HTML/CSS/JS, React)
- Project detection and framework identification
- Status bar integration

❌ **Known Issues:**
- Port configuration mismatch (Vite uses 5173, extension expects 3000)
- Preview opening needs refinement
- Next.js template untested

🚧 **In Progress:**
- Port management fixes
- Preview functionality improvements

## 🚀 Installation

1. **Download** the latest `.vsix` file from releases
2. **Install** in Cursor: `Cmd+Shift+P` → "Extensions: Install from VSIX"
3. **Restart** Cursor if prompted
4. **Look for** the status bar button (🚀 New Project or ▶ Preview)

## 🎯 Use Cases

### **For Designers**
- Start working immediately without terminal knowledge
- Create new projects with pre-configured templates
- Preview changes in real-time

### **For Developers**
- Quick project setup and testing
- Consistent development environment
- Easy project sharing with designers

### **For Teams**
- Standardized project creation
- Reduced onboarding friction
- Consistent development workflow

## 🤝 Contributing

Want to help make this extension better? Check out the [Development Guide](https://github.com/your-repo/forkery/blob/main/Docs/DEVELOPMENT.md) for:
- Setup instructions
- Architecture overview
- Testing procedures
- Contribution guidelines

## 📄 License

This project is open source and available under the [MIT License](https://github.com/your-repo/forkery/blob/main/LICENSE).

## 🙏 Acknowledgments

Built for the Cursor community to make frontend development more accessible to designers and developers alike.

---

**Ready to simplify your local development workflow?** 

📖 **[Read the full documentation](https://github.com/your-repo/forkery/blob/main/Docs/README.md)**  
🎬 **[See it in action](https://github.com/your-repo/forkery/blob/main/Docs/DEMO.md)**  
👨‍💻 **[Contribute to development](https://github.com/your-repo/forkery/blob/main/Docs/DEVELOPMENT.md)**
