"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const head_1 = __importDefault(require("next/head"));
function Home() {
    const [count, setCount] = (0, react_1.useState)(0);
    return (<>
      <head_1.default>
        <title>Sample Next.js Project</title>
        <meta name="description" content="A sample project to test the One-Click Preview extension"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="icon" href="/favicon.ico"/>
      </head_1.default>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-8">
            🚀 One-Click Preview
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-md">
            This is a sample Next.js project to demonstrate the Cursor extension.
            Click the button below to see it in action!
          </p>
          <div className="space-y-4">
            <button onClick={() => setCount(count + 1)} className="px-8 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-lg font-semibold">
              Clicked {count} times
            </button>
            <div className="text-sm text-gray-500">
              Counter: {count}
            </div>
          </div>
          <div className="mt-12 p-4 bg-white rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Extension Features
            </h2>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✅ Automatic framework detection</li>
              <li>✅ Smart port selection</li>
              <li>✅ Background process management</li>
              <li>✅ In-editor preview</li>
              <li>✅ One-click start/stop</li>
            </ul>
          </div>
        </div>
      </main>
    </>);
}
exports.default = Home;
//# sourceMappingURL=index.js.map