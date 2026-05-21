export interface FileSystemInterface {
  readFile(path: string, encoding: 'utf-8'): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, options?: { recursive: boolean }): Promise<void>;
}
