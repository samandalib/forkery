# Changelog

All notable changes to the Pistachio Vibe extension will be documented in this file.

## [1.1.1-csp-fix] - 2024-12-19

### 🚨 **Critical Fix: Content Security Policy (CSP) Issues Resolved**

#### **Problem**
- Localhost projects (React, Next.js, etc.) were showing blank pages in Simple Browser
- CSP violation errors prevented iframe embedding of localhost content
- Users had to manually switch to external browser for working previews

#### **Solution**
- **Automatic CSP Detection**: Extension now detects localhost projects automatically
- **Intelligent Fallback**: Attempts Simple Browser first, then falls back to external browser
- **User Guidance**: Clear explanations and action buttons for CSP issues
- **Configurable Behavior**: New `preview.cspFallback` setting for user preferences

#### **New Features**
- **CSP Fallback Setting**: `preview.cspFallback` (default: true)
- **External Browser Command**: "Pistachio Vibe: Open in External Browser"
- **Enhanced Error Handling**: Graceful degradation for all failure scenarios
- **Smart URL Detection**: Different handling for localhost vs external URLs

#### **Technical Improvements**
- **Type Safety**: Fixed TypeScript null reference issues
- **Error Recovery**: Multiple fallback paths for robust operation
- **User Experience**: Informative messages and quick recovery options
- **Logging**: Enhanced output channel information for debugging

#### **Configuration Changes**
```json
{
  "preview.cspFallback": true,        // NEW: Handle CSP issues automatically
  "preview.browserMode": "in-editor", // ENHANCED: Better localhost handling
  "preview.port": null,               // UNCHANGED: Auto-detection
  "preview.defaultScript": "dev"      // UNCHANGED: Default npm script
}
```

#### **Commands Added**
- `pistachio-vibe.openExternal` - Force external browser for current project

#### **User Experience Improvements**
- **Automatic Mode**: No manual configuration needed for CSP issues
- **Manual Override**: Quick access to external browser when needed
- **Clear Information**: Users understand what's happening and why
- **Seamless Recovery**: Always provides a working preview option

---

## [1.1.1] - 2024-12-19

### 🏗️ **Hybrid Architecture Release**

#### **Core Features**
- Enhanced reliability with v1.0.0 preview functionality
- Modern UI/UX with improved TemplatePanel
- Working stop button with multi-layer process termination
- Cross-platform support for all operating systems
- User configuration for browser mode preferences

#### **Technical Improvements**
- Robust process management
- Enhanced error handling
- Improved port detection
- Better UI state management

---

## [1.0.26] - 2024-12-19

### 🐛 **UI Loading Fixes**

#### **Bug Fixes**
- Fixed UI loading issues in certain environments
- Improved webview initialization
- Enhanced error recovery for UI components

---

## [1.0.0] - 2024-12-19

### 🎉 **Initial Release**

#### **Core Features**
- One-click project preview
- Project template creation
- Smart framework detection
- Integrated development workflow

#### **Supported Frameworks**
- React (Vite)
- Next.js
- Express + React
- Node.js + Next.js
- HTML/CSS/JS

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/) with the following format:
- **Major.Minor.Patch-suffix**
- **Major**: Breaking changes
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, backward compatible
- **Suffix**: Special releases (e.g., `-csp-fix`, `-beta`)

## Release Types

- **Stable**: Production-ready releases (e.g., `1.1.1`)
- **Fix**: Bug fix releases (e.g., `1.1.1-csp-fix`)
- **Beta**: Pre-release testing (e.g., `1.1.1-beta`)
- **Alpha**: Early development (e.g., `1.1.1-alpha`)
