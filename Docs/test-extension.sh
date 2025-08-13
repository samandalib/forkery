#!/bin/bash

echo "🧪 Testing One-Click Preview Extension"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "src/extension.ts" ]; then
    echo "❌ Error: Please run this script from the extension root directory"
    exit 1
fi

echo "✅ Found extension files"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Compile the extension
echo "🔨 Compiling extension..."
npm run compile

if [ $? -eq 0 ]; then
    echo "✅ Extension compiled successfully!"
    echo ""
    echo "🚀 To test the extension:"
    echo "1. Open this folder in Cursor"
    echo "2. Press F5 to start debugging"
    echo "3. A new Extension Development Host window will open"
    echo "4. Test with empty workspace (should show 🚀 New Project)"
    echo "5. Test with sample-project (should show ▶ Preview)"
    echo ""
    echo "🎯 Test Scenarios:"
    echo "- Empty workspace → Click 🚀 New Project → Choose template"
    echo "- Existing project → Click ▶ Preview → See preview open"
    echo "- Stop preview → Click ● button → Server stops"
    echo ""
    echo "📁 Sample project available in: sample-project/"
    echo "📚 Documentation: README.md, DEMO.md, DEVELOPMENT.md"
else
    echo "❌ Compilation failed. Check the errors above."
    exit 1
fi




