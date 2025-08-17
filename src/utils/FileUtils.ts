import * as fs from 'fs';
import * as path from 'path';

/**
 * Utility functions for file operations
 */
export class FileUtils {
  /**
   * Check if a file exists
   */
  static exists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  /**
   * Check if a directory exists
   */
  static isDirectory(dirPath: string): boolean {
    try {
      const stat = fs.statSync(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if a file exists
   */
  static isFile(filePath: string): boolean {
    try {
      const stat = fs.statSync(filePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Read file content as string
   */
  static readFile(filePath: string): string {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }

  /**
   * Read file content as JSON
   */
  static readJson<T>(filePath: string): T {
    try {
      const content = this.readFile(filePath);
      return JSON.parse(content) as T;
    } catch (error) {
      throw new Error(`Failed to read JSON file ${filePath}: ${error}`);
    }
  }

  /**
   * Write content to file
   */
  static writeFile(filePath: string, content: string): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!this.exists(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, content, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error}`);
    }
  }

  /**
   * Write JSON content to file
   */
  static writeJson<T>(filePath: string, data: T, pretty: boolean = true): void {
    try {
      const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
      this.writeFile(filePath, content);
    } catch (error) {
      throw new Error(`Failed to write JSON file ${filePath}: ${error}`);
    }
  }

  /**
   * Create directory recursively
   */
  static createDirectory(dirPath: string): void {
    try {
      if (!this.exists(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error}`);
    }
  }

  /**
   * Delete file or directory
   */
  static delete(filePath: string): void {
    try {
      if (this.exists(filePath)) {
        if (this.isDirectory(filePath)) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      throw new Error(`Failed to delete ${filePath}: ${error}`);
    }
  }

  /**
   * Copy file or directory
   */
  static copy(source: string, destination: string): void {
    try {
      if (this.isFile(source)) {
        // Copy file
        const content = this.readFile(source);
        this.writeFile(destination, content);
      } else if (this.isDirectory(source)) {
        // Copy directory
        this.createDirectory(destination);
        const items = fs.readdirSync(source);
        
        for (const item of items) {
          const sourcePath = path.join(source, item);
          const destPath = path.join(destination, item);
          
          if (this.isDirectory(sourcePath)) {
            this.copy(sourcePath, destPath);
          } else {
            const content = this.readFile(sourcePath);
            this.writeFile(destPath, content);
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to copy ${source} to ${destination}: ${error}`);
    }
  }

  /**
   * Move file or directory
   */
  static move(source: string, destination: string): void {
    try {
      this.copy(source, destination);
      this.delete(source);
    } catch (error) {
      throw new Error(`Failed to move ${source} to ${destination}: ${error}`);
    }
  }

  /**
   * List files in directory
   */
  static listFiles(dirPath: string, recursive: boolean = false): string[] {
    try {
      if (!this.isDirectory(dirPath)) {
        throw new Error(`${dirPath} is not a directory`);
      }

      const files: string[] = [];
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        
        if (this.isFile(fullPath)) {
          files.push(fullPath);
        } else if (recursive && this.isDirectory(fullPath)) {
          files.push(...this.listFiles(fullPath, true));
        }
      }
      
      return files;
    } catch (error) {
      throw new Error(`Failed to list files in ${dirPath}: ${error}`);
    }
  }

  /**
   * List directories in directory
   */
  static listDirectories(dirPath: string, recursive: boolean = false): string[] {
    try {
      if (!this.isDirectory(dirPath)) {
        throw new Error(`${dirPath} is not a directory`);
      }

      const directories: string[] = [];
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        
        if (this.isDirectory(fullPath)) {
          directories.push(fullPath);
          
          if (recursive) {
            directories.push(...this.listDirectories(fullPath, true));
          }
        }
      }
      
      return directories;
    } catch (error) {
      throw new Error(`Failed to list directories in ${dirPath}: ${error}`);
    }
  }

  /**
   * Get file size in bytes
   */
  static getFileSize(filePath: string): number {
    try {
      if (!this.isFile(filePath)) {
        throw new Error(`${filePath} is not a file`);
      }
      
      const stat = fs.statSync(filePath);
      return stat.size;
    } catch (error) {
      throw new Error(`Failed to get file size for ${filePath}: ${error}`);
    }
  }

  /**
   * Get file modification time
   */
  static getFileModTime(filePath: string): Date {
    try {
      if (!this.isFile(filePath)) {
        throw new Error(`${filePath} is not a file`);
      }
      
      const stat = fs.statSync(filePath);
      return stat.mtime;
    } catch (error) {
      throw new Error(`Failed to get modification time for ${filePath}: ${error}`);
    }
  }

  /**
   * Check if file is empty
   */
  static isEmpty(filePath: string): boolean {
    try {
      if (!this.isFile(filePath)) {
        return true;
      }
      
      return this.getFileSize(filePath) === 0;
    } catch {
      return true;
    }
  }

  /**
   * Get file extension
   */
  static getExtension(filePath: string): string {
    return path.extname(filePath);
  }

  /**
   * Get file name without extension
   */
  static getFileName(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }

  /**
   * Get directory name
   */
  static getDirectoryName(filePath: string): string {
    return path.dirname(filePath);
  }

  /**
   * Normalize file path
   */
  static normalizePath(filePath: string): string {
    return path.normalize(filePath);
  }

  /**
   * Join path segments
   */
  static joinPath(...segments: string[]): string {
    return path.join(...segments);
  }

  /**
   * Resolve relative path to absolute
   */
  static resolvePath(relativePath: string, basePath: string): string {
    return path.resolve(basePath, relativePath);
  }

  /**
   * Check if path is absolute
   */
  static isAbsolutePath(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  /**
   * Get relative path from base
   */
  static getRelativePath(from: string, to: string): string {
    return path.relative(from, to);
  }
}
