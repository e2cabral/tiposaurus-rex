import { jest } from '@jest/globals';
import 'reflect-metadata';
import { TemplateService } from '../../../src/core/services/template.service.js';
import path from 'path';

describe('TemplateService', () => {
  let templateService: TemplateService;
  let mockTemplateEngine: any;
  let mockFs: any;
  let mockLogger: any;

  beforeEach(() => {
    mockTemplateEngine = {
      renderFromFile: jest.fn(),
      renderFromString: jest.fn()
    };
    mockFs = {
      exists: jest.fn(),
      readFile: jest.fn()
    };
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    templateService = new TemplateService(mockTemplateEngine, mockFs, mockLogger);
  });

  describe('render', () => {
    it('should use unified template if it exists', async () => {
      const templateDir = '/templates';
      const context = { timestamp: 'now' } as any;
      mockFs.exists.mockResolvedValue(true);
      mockTemplateEngine.renderFromFile.mockResolvedValue('unified content');

      await templateService.render(templateDir, context);

      expect(mockFs.exists).toHaveBeenCalledWith(path.join(templateDir, 'unified.hbs'));
    });

    it('should render in parts using local files if they exist', async () => {
      const templateDir = '/templates';
      const context = { 
        timestamp: 'now',
        tables: [{ tableName: 'users' }],
        queries: [{ name: 'getUsers' }]
      } as any;
      
      mockFs.exists.mockImplementation((p: string) => {
        if (p.includes('unified.hbs')) return Promise.resolve(false);
        return Promise.resolve(true);
      });

      mockTemplateEngine.renderFromFile.mockImplementation((p: string) => {
        if (p.includes('interface.hbs')) return Promise.resolve('interface content');
        if (p.includes('query.hbs')) return Promise.resolve('query content');
        if (p.includes('index.hbs')) return Promise.resolve('index content');
        return Promise.resolve('');
      });

      const result = await templateService.render(templateDir, context);

      expect(mockFs.exists).toHaveBeenCalledWith(path.join(templateDir, 'unified.hbs'));
      expect(mockTemplateEngine.renderFromFile).toHaveBeenCalledWith(
        path.join(templateDir, 'interface.hbs'),
        expect.anything()
      );
      expect(result).toContain('interface content');
    });

    it('should use default string templates if files do not exist', async () => {
      const templateDir = '/non-existent';
      const context = { 
        timestamp: 'now',
        tables: [{ tableName: 'users' }],
        queries: [{ name: 'getUsers' }]
      } as any;
      
      mockFs.exists.mockResolvedValue(false);
      mockTemplateEngine.renderFromString.mockResolvedValue('default content');

      const result = await templateService.render(templateDir, context);

      expect(mockTemplateEngine.renderFromString).toHaveBeenCalled();
      expect(result).toContain('default content');
    });
  });
});
