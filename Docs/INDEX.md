# 📚 One-Click Local Preview Extension - Documentation Index

Welcome to the comprehensive documentation for the One-Click Local Preview Cursor extension. This folder contains all the documentation needed to understand, develop, test, and use the extension.

## 📁 Documentation Structure

### 🚀 **User Documentation**
- **[README.md](./README.md)** - Main user guide and feature overview
- **[DEMO.md](./DEMO.md)** - Step-by-step demo of the designer workflow

### 👨‍💻 **Developer Documentation**
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Complete development guide and setup
- **[TESTING.md](./TESTING.md)** - Testing procedures and scenarios

### 🛠️ **Tools & Scripts**
- **[test-extension.sh](./test-extension.sh)** - Quick testing and compilation script
- **[GIT_WORKFLOW.md](./GIT_WORKFLOW.md)** - Git workflow and development process

---

## 🎯 **Quick Start Guide**

### **For Users (Designers)**
1. **Read [README.md](./README.md)** - Understand what the extension does
2. **Follow [DEMO.md](./DEMO.md)** - Step-by-step workflow demonstration
3. **Install the extension** - Use the `.vsix` file in Cursor

### **For Developers**
1. **Read [DEVELOPMENT.md](./DEVELOPMENT.md)** - Complete development setup
2. **Follow [GIT_WORKFLOW.md](./GIT_WORKFLOW.md)** - Git workflow and branching strategy
3. **Use [test-extension.sh](./test-extension.sh)** - Quick testing workflow
4. **Follow [TESTING.md](./TESTING.md)** - Comprehensive testing procedures

---

## 🔍 **Documentation by Topic**

### **Getting Started**
- **What is it?** → [README.md](./README.md#what-is-it)
- **Installation** → [README.md](./README.md#installation)
- **Quick Start** → [DEMO.md](./DEMO.md)

### **Development**
- **Setup** → [DEVELOPMENT.md](./DEVELOPMENT.md#prerequisites)
- **Git Workflow** → [GIT_WORKFLOW.md](./GIT_WORKFLOW.md#development-workflow)
- **Architecture** → [DEVELOPMENT.md](./DEVELOPMENT.md#project-structure)
- **Key Components** → [DEVELOPMENT.md](./DEVELOPMENT.md#key-components)

### **Testing**
- **Test Scenarios** → [TESTING.md](./TESTING.md#test-scenarios)
- **Debugging** → [TESTING.md](./TESTING.md#debugging)
- **Troubleshooting** → [TESTING.md](./TESTING.md#troubleshooting)

---

## 📋 **Current Status**

### **✅ Working Features**
- Extension activation and UI
- Project creation (HTML/CSS/JS, React)
- Project detection and framework identification
- Status bar integration
- Basic port detection (framework-specific)

### **🔧 Version 0.1.1 Improvements**
- Fixed Vite config generation to use port 5173
- Added Vite config validation and port synchronization
- Enhanced port detection logging and debugging
- **RESOLVED: Port conflict handling with automatic port resolution**
- **RESOLVED: Vite config port mismatch issues**
- Improved preview opening with fallback
- Better stop/restart controls and notifications
- Added process cleanup to prevent port conflicts

### **🚀 Version 0.1.2 New Features (COMPLETED ✅)**
- ✅ **Fullstack project templates** with Node.js backends
- ✅ **Express.js + React** fullstack template
- ✅ **Node.js + Next.js** fullstack template
- ✅ **Concurrent backend + frontend** development servers
- ✅ **Automatic fullstack project structure** generation
- ✅ **Backend API endpoints** (health check, sample data)
- ✅ **Frontend integration** with backend APIs
- ✅ **Fullstack process management** and cleanup
- ✅ **Next.js naming restriction handling** with alternative template fallback

### **❌ Known Issues**
- Preview button not consistently opening Simple Browser
- Some framework templates need testing

### **🚧 In Progress**
- Preview functionality improvements
- Browser opening reliability improvements
- Additional framework support (Gatsby, Astro, Remix)

---

## 🔄 **Documentation Updates**

### **Last Updated**
- **README.md**: Extension features and user guide
- **DEVELOPMENT.md**: Complete development workflow
- **TESTING.md**: Comprehensive testing procedures
- **DEMO.md**: User workflow demonstration

### **Version History**
- **v0.1.0**: Initial extension with basic functionality
- **v0.1.1**: Port handling improvements and preview fixes
- **v0.1.2**: Fullstack project templates with Node.js backends (COMPLETED ✅)
- **Current**: Ready for v0.2.0 planning and additional framework support

---

## 📞 **Getting Help**

### **For Users**
- Check [README.md](./README.md) for common questions
- Follow [DEMO.md](./DEMO.md) for step-by-step guidance
- Report issues with detailed error messages

### **For Developers**
- Read [DEVELOPMENT.md](./DEVELOPMENT.md) for technical details
- Use [TESTING.md](./TESTING.md) for debugging procedures
- Check the main project README for build instructions

---

## 🎉 **Success Stories**

The extension successfully:
- ✅ Creates React projects from scratch
- ✅ Detects existing projects automatically
- ✅ Provides one-click project creation
- ✅ Integrates seamlessly with Cursor UI

**Goal**: Enable designers to go from empty workspace to running React app in one click!

---

*This documentation is maintained alongside the extension code. For the latest updates, check the main project repository.*
