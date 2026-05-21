import { injectable } from 'inversify';
import fs from 'fs/promises';
import { FileSystemInterface } from '../../core/domain/interfaces/file-system.interface.js';

@injectable()
export class NodeFileSystemAdapter implements FileSystemInterface {
  async readFile(path: string, encoding: 'utf-8'): Promise<string> {
    return fs.readFile(path, encoding);
  }

  async writeFile(path: string, content: string): Promise<void> {
    await fs.writeFile(path, content);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async mkdir(path: string, options?: { recursive: boolean }): Promise<void> {
    await fs.mkdir(path, options);
  }
}
