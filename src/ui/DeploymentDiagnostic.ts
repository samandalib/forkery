import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface DeploymentDiagnostic {
    score: number;
    status: 'READY' | 'NEEDS_CONFIG' | 'HIGH_RISK' | 'UNKNOWN';
    issues: string[];
    warnings: string[];
    recommendations: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    lastChecked: string;
    projectStructure: {
        hasPackageJson: boolean;
        hasLockFile: boolean;
        hasConfigFiles: boolean;
        hasBuildScripts: boolean;
        hasDependencies: boolean;
    };
    dependencies: {
        hasExactVersions: boolean;
        hasStableVersions: boolean;
        packageManagerConsistent: boolean;
        noConflicts: boolean;
    };
    buildProcess: {
        hasBuildScript: boolean;
        hasDevScript: boolean;
        hasStartScript: boolean;
        buildCommand: string;
    };
}

export class DeploymentDiagnosticService {
    
    /**
     * Run a comprehensive deployment readiness diagnostic
     */
    public static async runDiagnostic(): Promise<DeploymentDiagnostic> {
        try {
            vscode.window.showInformationMessage('🔍 Running deployment readiness diagnostic...');
            
            const diagnostic = await this.analyzeDeploymentReadiness();
            return diagnostic;
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to run deployment diagnostic: ${error}`);
            return this.createEmptyDiagnostic('Diagnostic failed to run');
        }
    }

    /**
     * Analyze the current project for deployment readiness
     */
    private static async analyzeDeploymentReadiness(): Promise<DeploymentDiagnostic> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return this.createEmptyDiagnostic('No workspace found');
        }

        const projectPath = workspaceFolders[0].uri.fsPath;
        const diagnostic: DeploymentDiagnostic = {
            score: 0,
            status: 'UNKNOWN',
            issues: [],
            warnings: [],
            recommendations: [],
            riskLevel: 'HIGH',
            lastChecked: new Date().toISOString(),
            projectStructure: {
                hasPackageJson: false,
                hasLockFile: false,
                hasConfigFiles: false,
                hasBuildScripts: false,
                hasDependencies: false
            },
            dependencies: {
                hasExactVersions: false,
                hasStableVersions: false,
                packageManagerConsistent: false,
                noConflicts: false
            },
            buildProcess: {
                hasBuildScript: false,
                hasDevScript: false,
                hasStartScript: false,
                buildCommand: ''
            }
        };

        // Analyze project structure
        await this.analyzeProjectStructure(projectPath, diagnostic);
        
        // Analyze dependencies
        await this.analyzeDependencies(projectPath, diagnostic);
        
        // Analyze build process
        await this.analyzeBuildProcess(projectPath, diagnostic);
        
        // Calculate score and determine status
        this.calculateDiagnosticScore(diagnostic);
        
        return diagnostic;
    }

    /**
     * Analyze project structure and configuration files
     */
    private static async analyzeProjectStructure(projectPath: string, diagnostic: DeploymentDiagnostic): Promise<void> {
        const packageJsonPath = path.join(projectPath, 'package.json');
        const lockFilePath = path.join(projectPath, 'package-lock.json');
        const yarnLockPath = path.join(projectPath, 'yarn.lock');
        const pnpmLockPath = path.join(projectPath, 'pnpm-lock.yaml');
        
        // Check package.json
        if (fs.existsSync(packageJsonPath)) {
            diagnostic.projectStructure.hasPackageJson = true;
            diagnostic.score += 10;
        } else {
            diagnostic.issues.push('Missing package.json - project is not properly initialized');
        }
        
        // Check lock files
        const lockFiles = [lockFilePath, yarnLockPath, pnpmLockPath].filter(fs.existsSync);
        if (lockFiles.length > 0) {
            diagnostic.projectStructure.hasLockFile = true;
            diagnostic.score += 5;
            
            if (lockFiles.length > 1) {
                diagnostic.warnings.push('Multiple lock files detected - this can cause dependency conflicts');
                diagnostic.dependencies.noConflicts = false;
            } else {
                diagnostic.dependencies.noConflicts = true;
                diagnostic.score += 5;
            }
        } else {
            diagnostic.warnings.push('No lock file found - dependencies may not be consistent');
        }
        
        // Check for configuration files
        const configFiles = [
            'next.config.js', 'next.config.mjs', 'next.config.ts',
            'vite.config.js', 'vite.config.ts',
            'tailwind.config.js', 'postcss.config.js',
            'vercel.json', 'netlify.toml'
        ];
        
        const hasConfig = configFiles.some(config => fs.existsSync(path.join(projectPath, config)));
        if (hasConfig) {
            diagnostic.projectStructure.hasConfigFiles = true;
            diagnostic.score += 5;
        } else {
            diagnostic.warnings.push('No framework configuration files found');
        }
    }

    /**
     * Analyze dependencies for version stability and conflicts
     */
    private static async analyzeDependencies(projectPath: string, diagnostic: DeploymentDiagnostic): Promise<void> {
        const packageJsonPath = path.join(projectPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) return;
        
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const dependencies = packageJson.dependencies || {};
            const devDependencies = packageJson.devDependencies || {};
            const allDeps = { ...dependencies, ...devDependencies };
            
            // Check for exact versions
            let hasExactVersions = true;
            let hasStableVersions = true;
            
            for (const [name, version] of Object.entries(allDeps)) {
                const versionStr = version as string;
                
                // Check if version is exact (no ^ or ~)
                if (versionStr.startsWith('^') || versionStr.startsWith('~')) {
                    hasExactVersions = false;
                    diagnostic.warnings.push(`Package '${name}' uses flexible version '${versionStr}' - consider locking to exact version`);
                }
                
                // Check for alpha/beta versions
                if (versionStr.includes('alpha') || versionStr.includes('beta') || versionStr.includes('rc')) {
                    hasStableVersions = false;
                    diagnostic.issues.push(`Package '${name}' uses unstable version '${versionStr}' - not recommended for production`);
                }
            }
            
            if (hasExactVersions) {
                diagnostic.dependencies.hasExactVersions = true;
                diagnostic.score += 15;
            }
            
            if (hasStableVersions) {
                diagnostic.dependencies.hasStableVersions = true;
                diagnostic.score += 10;
            }
            
            // Check for dependencies
            if (Object.keys(allDeps).length > 0) {
                diagnostic.projectStructure.hasDependencies = true;
                diagnostic.score += 5;
            } else {
                diagnostic.warnings.push('No dependencies found - project may not be properly configured');
            }
            
        } catch (error) {
            diagnostic.issues.push('Failed to analyze dependencies: ' + error);
        }
    }

    /**
     * Analyze build process and scripts
     */
    private static async analyzeBuildProcess(projectPath: string, diagnostic: DeploymentDiagnostic): Promise<void> {
        const packageJsonPath = path.join(projectPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) return;
        
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const scripts = packageJson.scripts || {};
            
            // Check for build script
            if (scripts.build) {
                diagnostic.buildProcess.hasBuildScript = true;
                diagnostic.score += 15;
                diagnostic.buildProcess.buildCommand = scripts.build;
            } else {
                diagnostic.issues.push('Missing build script - deployment will likely fail');
            }
            
            // Check for dev script
            if (scripts.dev) {
                diagnostic.buildProcess.hasDevScript = true;
                diagnostic.score += 5;
            }
            
            // Check for start script
            if (scripts.start) {
                diagnostic.buildProcess.hasStartScript = true;
                diagnostic.score += 10;
            } else {
                diagnostic.warnings.push('Missing start script - production deployment may fail');
            }
            
            // Check for framework-specific scripts
            if (scripts['dev:frontend'] || scripts['dev:backend']) {
                diagnostic.warnings.push('Complex script structure detected - ensure deployment platform supports your build process');
            }
            
        } catch (error) {
            diagnostic.issues.push('Failed to analyze build process: ' + error);
        }
    }

    /**
     * Calculate final diagnostic score and determine status
     */
    private static calculateDiagnosticScore(diagnostic: DeploymentDiagnostic): void {
        // Additional scoring based on specific patterns
        if (diagnostic.projectStructure.hasPackageJson && diagnostic.projectStructure.hasLockFile) {
            diagnostic.score += 5;
        }
        
        if (diagnostic.dependencies.hasExactVersions && diagnostic.dependencies.hasStableVersions) {
            diagnostic.score += 10;
        }
        
        if (diagnostic.buildProcess.hasBuildScript && diagnostic.buildProcess.hasStartScript) {
            diagnostic.score += 5;
        }
        
        // Cap score at 100
        diagnostic.score = Math.min(diagnostic.score, 100);
        
        // Determine status and risk level
        if (diagnostic.score >= 80) {
            diagnostic.status = 'READY';
            diagnostic.riskLevel = 'LOW';
        } else if (diagnostic.score >= 50) {
            diagnostic.status = 'NEEDS_CONFIG';
            diagnostic.riskLevel = 'MEDIUM';
        } else {
            diagnostic.status = 'HIGH_RISK';
            diagnostic.riskLevel = 'HIGH';
        }
        
        // Add recommendations based on score
        if (diagnostic.score < 80) {
            diagnostic.recommendations.push('Review and fix the identified issues before deployment');
            diagnostic.recommendations.push('Consider using exact version numbers for all dependencies');
            diagnostic.recommendations.push('Ensure build and start scripts are properly configured');
        }
        
        if (diagnostic.score < 50) {
            diagnostic.recommendations.push('Project needs significant configuration before deployment');
            diagnostic.recommendations.push('Consider starting with a simpler project structure');
            diagnostic.recommendations.push('Test build process locally before attempting deployment');
        }
        
        // Add specific recommendations based on issues
        if (!diagnostic.projectStructure.hasPackageJson) {
            diagnostic.recommendations.push('Initialize project with npm init or equivalent');
        }
        
        if (!diagnostic.buildProcess.hasBuildScript) {
            diagnostic.recommendations.push('Add build script to package.json scripts section');
        }
        
        if (!diagnostic.buildProcess.hasStartScript) {
            diagnostic.recommendations.push('Add start script for production deployment');
        }
    }

    /**
     * Create an empty diagnostic for error cases
     */
    private static createEmptyDiagnostic(reason: string): DeploymentDiagnostic {
        return {
            score: 0,
            status: 'UNKNOWN',
            issues: [reason],
            warnings: [],
            recommendations: ['Open a project folder to run deployment diagnostic'],
            riskLevel: 'HIGH',
            lastChecked: new Date().toISOString(),
            projectStructure: {
                hasPackageJson: false,
                hasLockFile: false,
                hasConfigFiles: false,
                hasBuildScripts: false,
                hasDependencies: false
            },
            dependencies: {
                hasExactVersions: false,
                hasStableVersions: false,
                packageManagerConsistent: false,
                noConflicts: false
            },
            buildProcess: {
                hasBuildScript: false,
                hasDevScript: false,
                hasStartScript: false,
                buildCommand: ''
            }
        };
    }

    /**
     * Generate a formatted deployment report for copying
     */
    public static generateDeploymentReport(diagnostic: DeploymentDiagnostic): string {
        const timestamp = new Date().toLocaleString();
        let report = `# Deployment Readiness Report\n`;
        report += `Generated: ${timestamp}\n\n`;
        report += `## Summary\n`;
        report += `- **Score**: ${diagnostic.score}/100\n`;
        report += `- **Status**: ${diagnostic.status}\n`;
        report += `- **Risk Level**: ${diagnostic.riskLevel}\n\n`;
        
        if (diagnostic.issues.length > 0) {
            report += `## Issues Found\n`;
            diagnostic.issues.forEach(issue => {
                report += `- ${issue}\n`;
            });
            report += `\n`;
        }
        
        if (diagnostic.warnings.length > 0) {
            report += `## Warnings\n`;
            diagnostic.warnings.forEach(warning => {
                report += `- ${warning}\n`;
            });
            report += `\n`;
        }
        
        if (diagnostic.recommendations.length > 0) {
            report += `## Recommendations\n`;
            diagnostic.recommendations.forEach(rec => {
                report += `- ${rec}\n`;
            });
            report += `\n`;
        }
        
        report += `## Next Steps\n`;
        report += `Copy this report and share it with your AI agent to get specific guidance on fixing the identified issues.\n`;
        report += `The agent can help you implement the recommended changes to make your project deployment-ready.\n`;
        
        return report;
    }
}
