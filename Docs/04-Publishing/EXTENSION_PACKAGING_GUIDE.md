# 📦 Extension Packaging Guide

> **Complete guide for packaging and publishing the Forkery extension with all required properties and configurations**

## 📅 **Created**: December 2024  
## 🎯 **Status**: Packaging Guide  
## 🚨 **Priority**: High (Release Preparation)  
## 📋 **Purpose**: Ensure proper extension packaging and marketplace compliance  

---

## 🎯 **Essential Package Properties**

### **Core Extension Information**
These are the **required** properties for any VS Code extension:

```json
{
  "name": "forkery",                    // Unique extension identifier
  "displayName": "Forkery - One-Click Local Preview",
  "description": "One-click local preview for designers and developers - no terminal required",
  "version": "0.2.0",                  // Semantic versioning
  "publisher": "your-publisher-name",  // Your marketplace publisher ID
  "license": "MIT",                     // License type
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/forkery.git"
  },
  "homepage": "https://github.com/your-username/forkery#readme",
  "bugs": {
    "url": "https://github.com/your-username/forkery/issues"
  }
}
```

### **Current vs. Recommended Changes**

| Property | Current | Recommended | Reason |
|----------|---------|-------------|---------|
| **name** | `cursor-preview` | `forkery` | More memorable and unique |
| **displayName** | `One-Click Local Preview` | `Forkery - One-Click Local Preview` | Brand recognition |
| **description** | `One-click local preview for designers - no terminal required` | `One-click local preview for designers and developers - no terminal required` | Broader audience |
| **publisher** | ❌ Missing | `your-publisher-name` | Required for marketplace |
| **license** | ❌ Missing | `MIT` | Required for open source |
| **repository** | ❌ Missing | GitHub URL | Required for marketplace |

---

## 🎨 **Visual Branding Properties**

### **Icons and Graphics**
```json
{
  "icon": "assets/icon-128.png",           // 128x128 PNG icon
  "galleryBanner": {
    "color": "#1e1e1e",                    // Dark theme color
    "theme": "dark"                        // Banner theme
  }
}
```

### **Required Icon Specifications**
- **Main Icon**: `assets/icon-128.png` (128x128 pixels, PNG format)
- **Marketplace Banner**: `assets/banner.png` (1280x200 pixels, PNG format)
- **Icon Formats**: PNG with transparency support
- **Color Scheme**: Should work on both light and dark themes

### **Icon Design Guidelines**
- **Simple and Recognizable**: Should be clear at small sizes
- **Brand Consistency**: Match your extension's purpose
- **Theme Compatibility**: Work well on both light and dark backgrounds
- **Professional Look**: High-quality, polished appearance

---

## 🏷️ **Marketplace Categorization**

### **Categories and Tags**
```json
{
  "categories": [
    "Other",                               // Primary category
    "Programming Languages",               // Secondary category
    "Developer Tools"                      // Tertiary category
  ],
  "keywords": [
    "preview",
    "local development",
    "frontend",
    "react",
    "nextjs",
    "vite",
    "designer tools",
    "no terminal",
    "one-click",
    "live preview"
  ]
}
```

### **Recommended Category Changes**
| Current | Recommended | Reason |
|---------|-------------|---------|
| **Other** | **Web Development** | More specific and discoverable |
| ❌ Missing | **Programming Languages** | Covers framework support |
| ❌ Missing | **Developer Tools** | Describes the tool's purpose |

### **Keywords Strategy**
- **Primary Function**: `preview`, `local development`, `frontend`
- **Framework Support**: `react`, `nextjs`, `vite`, `html`
- **User Experience**: `designer tools`, `no terminal`, `one-click`
- **Technical**: `live preview`, `development server`

---

## 🚀 **Extension Capabilities**

### **Engine Requirements**
```json
{
  "engines": {
    "vscode": "^1.74.0",                  // Minimum VS Code version
    "node": "^16.0.0"                     // Minimum Node.js version
  }
}
```

### **Activation Events**
```json
{
  "activationEvents": [
    "onStartupFinished",                   // Activate when VS Code starts
    "onCommand:preview.run",              // Activate when preview command is used
    "onCommand:preview.stop",             // Activate when stop command is used
    "onCommand:preview.createProject",    // Activate when create project is used
    "onCommand:preview.showUI",           // Activate when UI is shown
    "onCommand:preview.showTemplates",    // Activate when templates are shown
    "onCommand:preview.showProjectControl" // Activate when project control is shown
  ]
}
```

### **Main Entry Point**
```json
{
  "main": "./out/extension.js",           // Compiled extension entry point
  "browser": "./out/extension.js"         // For web-based VS Code
}
```

---

## 🎛️ **User Interface Contributions**

### **Activity Bar Icon**
```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "preview",
          "title": "Forkery Preview",      // Updated title
          "icon": "$(rocket)",             // VS Code icon
          "icon-dark": "$(rocket)",        // Dark theme icon
          "icon-light": "$(rocket)"        // Light theme icon
        }
      ]
    }
  }
}
```

### **Commands with Better Descriptions**
```json
{
  "contributes": {
    "commands": [
      {
        "command": "preview.run",
        "title": "Forkery: Start Preview Server",
        "category": "Forkery",
        "icon": "$(play)"
      },
      {
        "command": "preview.stop",
        "title": "Forkery: Stop Preview Server",
        "category": "Forkery",
        "icon": "$(stop)"
      },
      {
        "command": "preview.createProject",
        "title": "Forkery: Create New Project",
        "category": "Forkery",
        "icon": "$(plus)"
      },
      {
        "command": "preview.showUI",
        "title": "Forkery: Show Project UI",
        "category": "Forkery",
        "icon": "$(layout)"
      }
    ]
  }
}
```

### **Configuration Schema**
```json
{
  "contributes": {
    "configuration": {
      "title": "Forkery",
      "properties": {
        "forkery.port": {
          "type": "number",
          "default": null,
          "description": "Default port for preview (null = auto-detect)",
          "minimum": 1024,
          "maximum": 65535
        },
        "forkery.browserMode": {
          "type": "string",
          "enum": ["in-editor", "external"],
          "default": "in-editor",
          "description": "How to display the preview: in-editor or external browser"
        },
        "forkery.defaultScript": {
          "type": "string",
          "default": "dev",
          "description": "Default npm script to run for preview (dev, start, etc.)"
        },
        "forkery.autoStart": {
          "type": "boolean",
          "default": false,
          "description": "Automatically start preview when project is detected"
        }
      }
    }
  }
}
```

---

## 📱 **Status Bar Integration**

### **Enhanced Status Bar Items**
```json
{
  "contributes": {
    "statusBar": {
      "items": [
        {
          "id": "forkery.status",
          "name": "Forkery Status",
          "alignment": "left",
          "priority": 100,
          "tooltip": "Click to manage your local preview server"
        }
      ]
    }
  }
}
```

---

## 🎨 **Views and Webviews**

### **Enhanced View Descriptions**
```json
{
  "contributes": {
    "views": {
      "preview": [
        {
          "type": "webview",
          "id": "preview.templates",
          "name": "Project Templates",
          "when": "!preview.hasProject",
          "icon": "$(library)",
          "tooltip": "Choose a project template to get started"
        },
        {
          "type": "webview",
          "id": "preview.control",
          "name": "Project Control",
          "when": "preview.hasProject",
          "icon": "$(settings-gear)",
          "tooltip": "Manage your running preview server"
        }
      ]
    }
  }
}
```

---

## 📋 **Dependencies and Bundling**

### **Production Dependencies**
```json
{
  "dependencies": {
    "detect-port": "^1.5.1"
  },
  "devDependencies": {
    "@types/detect-port": "^1.3.5",
    "@types/mocha": "^10.0.10",
    "@types/node": "^16.11.7",
    "@types/vscode": "^1.74.0",
    "@typescript-eslint/eslint-plugin": "^6.21.0",
    "@typescript-eslint/parser": "^6.21.0",
    "@vscode/test-electron": "^2.5.2",
    "eslint": "^8.56.0",
    "typescript": "^4.8.4"
  }
}
```

### **Bundling Configuration**
```json
{
  "bundledDependencies": [
    "detect-port"
  ],
  "bundleDependencies": [
    "detect-port"
  ]
}
```

---

## 🚀 **Build and Packaging Scripts**

### **Enhanced Scripts**
```json
{
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile && npm run lint",
    "lint": "eslint src --ext ts",
    "test": "node ./out/test/runTest.js",
    "package": "vsce package",
    "publish": "vsce publish",
    "build": "npm run compile && npm run package"
  }
}
```

---

## 📖 **Documentation and Help**

### **Help and Documentation Links**
```json
{
  "contributes": {
    "menus": {
      "commandPalette": [
        {
          "command": "preview.showHelp",
          "when": "false"
        }
      ]
    }
  }
}
```

### **README and Documentation**
- **README.md**: Comprehensive user guide
- **CHANGELOG.md**: Version history and changes
- **LICENSE**: MIT license file
- **CONTRIBUTING.md**: Development contribution guide

---

## 🎯 **Marketplace-Specific Properties**

### **Publisher Information**
```json
{
  "publisher": "your-publisher-name",
  "private": false,
  "preview": false
}
```

### **Marketplace Categories**
```json
{
  "categories": [
    "Web Development",
    "Programming Languages",
    "Developer Tools"
  ],
  "tags": [
    "preview",
    "local development",
    "frontend",
    "react",
    "nextjs",
    "vite",
    "designer tools"
  ]
}
```

---

## 🧪 **Testing and Quality**

### **Test Configuration**
```json
{
  "scripts": {
    "test": "node ./out/test/runTest.js",
    "test:watch": "npm run test -- --watch",
    "test:coverage": "nyc npm run test"
  }
}
```

### **Quality Assurance**
- **ESLint**: Code quality and style
- **TypeScript**: Type safety and compilation
- **Unit Tests**: Functionality verification
- **Integration Tests**: VS Code API testing

---

## 📦 **Packaging Process**

### **1. Prepare Assets**
```bash
# Create icon assets
mkdir -p assets
# Add icon-128.png (128x128)
# Add banner.png (1280x200)
```

### **2. Update package.json**
```bash
# Update all properties as shown above
# Ensure version is correct
# Add publisher information
```

### **3. Build and Package**
```bash
npm run compile          # Compile TypeScript
npm run lint            # Check code quality
npm run test            # Run tests
npm run package         # Create .vsix file
```

### **4. Test Package**
```bash
# Install .vsix file in VS Code
# Test all functionality
# Verify UI and commands work
```

---

## 🚨 **Common Packaging Issues**

### **Missing Required Properties**
- ❌ **publisher**: Required for marketplace publishing
- ❌ **license**: Required for open source extensions
- ❌ **repository**: Required for marketplace
- ❌ **icon**: Required for marketplace visibility

### **Version Management**
- ❌ **Version conflicts**: Ensure version is unique
- ❌ **Dependency conflicts**: Check for incompatible versions
- ❌ **Build errors**: Ensure TypeScript compiles cleanly

### **Marketplace Compliance**
- ❌ **Incomplete descriptions**: Provide clear, detailed descriptions
- ❌ **Missing categories**: Use appropriate marketplace categories
- ❌ **Poor keywords**: Include relevant search terms

---

## 🎯 **Recommended Final package.json**

Here's what your final package.json should look like:

```json
{
  "name": "forkery",
  "displayName": "Forkery - One-Click Local Preview",
  "description": "One-click local preview for designers and developers - no terminal required. Supports React, Next.js, Vite, and more with intelligent port management and project templates.",
  "version": "0.2.0",
  "publisher": "your-publisher-name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/forkery.git"
  },
  "homepage": "https://github.com/your-username/forkery#readme",
  "bugs": {
    "url": "https://github.com/your-username/forkery/issues"
  },
  "engines": {
    "vscode": "^1.74.0"
  },
  "categories": [
    "Web Development",
    "Programming Languages",
    "Developer Tools"
  ],
  "keywords": [
    "preview",
    "local development",
    "frontend",
    "react",
    "nextjs",
    "vite",
    "designer tools",
    "no terminal",
    "one-click",
    "live preview"
  ],
  "icon": "assets/icon-128.png",
  "galleryBanner": {
    "color": "#1e1e1e",
    "theme": "dark"
  },
  "activationEvents": [
    "onStartupFinished",
    "onCommand:forkery.run",
    "onCommand:forkery.stop",
    "onCommand:forkery.createProject",
    "onCommand:forkery.showUI"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "forkery.run",
        "title": "Forkery: Start Preview Server",
        "category": "Forkery",
        "icon": "$(play)"
      },
      {
        "command": "forkery.stop",
        "title": "Forkery: Stop Preview Server",
        "category": "Forkery",
        "icon": "$(stop)"
      },
      {
        "command": "forkery.createProject",
        "title": "Forkery: Create New Project",
        "category": "Forkery",
        "icon": "$(plus)"
      },
      {
        "command": "forkery.showUI",
        "title": "Forkery: Show Project UI",
        "category": "Forkery",
        "icon": "$(layout)"
      }
    ],
    "viewsContainers": {
      "activitybar": [
        {
          "id": "preview",
          "title": "Forkery Preview",
          "icon": "$(rocket)"
        }
      ]
    },
    "views": {
      "preview": [
        {
          "type": "webview",
          "id": "preview.templates",
          "name": "Project Templates",
          "when": "!preview.hasProject"
        },
        {
          "type": "webview",
          "id": "preview.control",
          "name": "Project Control",
          "when": "preview.hasProject"
        }
      ]
    },
    "configuration": {
      "title": "Forkery",
      "properties": {
        "forkery.port": {
          "type": "number",
          "default": null,
          "description": "Default port for preview (null = auto-detect)"
        },
        "forkery.browserMode": {
          "type": "string",
          "enum": ["in-editor", "external"],
          "default": "in-editor",
          "description": "How to display the preview"
        },
        "forkery.defaultScript": {
          "type": "string",
          "default": "dev",
          "description": "Default npm script to run for preview"
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile && npm run lint",
    "lint": "eslint src --ext ts",
    "test": "node ./out/test/runTest.js",
    "package": "vsce package",
    "publish": "vsce publish"
  },
  "dependencies": {
    "detect-port": "^1.5.1"
  },
  "devDependencies": {
    "@types/detect-port": "^1.3.5",
    "@types/mocha": "^10.0.10",
    "@types/node": "^16.11.7",
    "@types/vscode": "^1.74.0",
    "@typescript-eslint/eslint-plugin": "^6.21.0",
    "@typescript-eslint/parser": "^6.21.0",
    "@vscode/test-electron": "^2.5.2",
    "eslint": "^8.56.0",
    "typescript": "^4.8.4"
  }
}
```

---

## 🎯 **Next Steps**

### **Immediate Actions**
1. **Create icon assets** (128x128 PNG)
2. **Update package.json** with all recommended properties
3. **Test packaging** with `npm run package`
4. **Verify extension** works correctly

### **Before Publishing**
1. **Test thoroughly** in VS Code
2. **Update documentation** and README
3. **Create marketplace assets** (banner, screenshots)
4. **Prepare release notes** and changelog

---

*Document Version: 1.0*  
*Last Updated: December 2024*  
*Status: 📋 PACKAGING GUIDE - READY FOR IMPLEMENTATION*
