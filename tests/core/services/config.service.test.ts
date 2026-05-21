import { jest } from '@jest/globals';
import { ConfigService } from '../../../src/core/services/config.service.js';
import { FileSystemInterface } from '../../../src/core/domain/interfaces/file-system.interface.js';

describe('ConfigService', () => {
  let configService: ConfigService;
  let mockFs: jest.Mocked<FileSystemInterface>;

  beforeEach(() => {
    mockFs = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      exists: jest.fn(),
      mkdir: jest.fn(),
    } as any;

    configService = new ConfigService(mockFs);
  });

  describe('loadConfig', () => {
    it('should load and validate a valid config file', async () => {
      const mockConfig = {
        db: {
          host: 'localhost',
          user: 'root',
          password: 'password',
          database: 'test_db'
        },
        queryDirs: ['./queries'],
        outputDir: './generated'
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));

      const config = await configService.loadConfig('config.json');

      expect(config).toMatchObject(mockConfig);
      expect(mockFs.readFile).toHaveBeenCalledWith(expect.stringContaining('config.json'), 'utf-8');
    });

    it('should throw error for invalid config', async () => {
      const invalidConfig = {
        db: {
          host: 'localhost'
        }
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));

      await expect(configService.loadConfig('config.json')).rejects.toThrow('Invalid configuration');
    });

    it('should throw error if file not found', async () => {
      const error = new Error('File not found');
      (error as any).code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

      await expect(configService.loadConfig('not-found.json')).rejects.toThrow('Configuration file not found');
    });
  });
});
