import { injectable } from 'inversify';
import { QueryParameter, ReturnField } from '../core/domain/interfaces/template.interface.js';

export interface MatcherResult {
  description?: string;
  param?: QueryParameter;
  returnType?: string;
  returnSingle?: boolean;
  returnField?: { info: string; fields: ReturnField[] };
  returnFunction?: { info: string; fields: ReturnField[] };
}

@injectable()
export class ParameterMatcher {
  private readonly matchers = [
    {
      id: 'description',
      regex: /@description(?:\s*:)?/,
      handler: (line: string): MatcherResult => ({
        description: this.extractValue(line, /@description(?:\s*:)?/),
      }),
    },
    {
      id: 'param',
      regex: /@param(?:\s*:)?/,
      handler: (line: string): MatcherResult => {
        const value = this.extractValue(line, /@param(?:\s*:)?/);
        const [name, type] = value.split(':');
        return {
          param: {
            name: name.trim(),
            type: type ? type.trim() : 'any',
          },
        };
      },
    },
    {
      id: 'returnType',
      regex: /@returnType(?:\s*:)?/,
      handler: (line: string): MatcherResult => ({
        returnType: this.extractValue(line, /@returnType(?:\s*:)?/),
      }),
    },
    {
      id: 'returnSingle',
      regex: /@returnSingle(?:\s*:)?/,
      handler: (line: string): MatcherResult => ({
        returnSingle: this.extractValue(line, /@returnSingle(?:\s*:)?/).toLowerCase() === 'true',
      }),
    },
    {
      id: 'return',
      regex: /@return(?:\s*:)?/,
      handler: (line: string, fields: ReturnField[]): MatcherResult => ({
        returnField: { info: this.extractValue(line, /@return(?:\s*:)?/), fields },
      }),
    },
    {
      id: 'returnFunction',
      regex: /@returnFunction(?:\s*:)?/,
      handler: (line: string, fields: ReturnField[]): MatcherResult => ({
        returnFunction: { info: this.extractValue(line, /@returnFunction(?:\s*:)?/), fields },
      }),
    },
  ];

  processLine(line: string, returnFields: ReturnField[]): MatcherResult | null {
    const trimmed = line.trim();
    
    // Check if the line contains any of our known annotations
    for (const matcher of this.matchers) {
      if (matcher.regex.test(trimmed)) {
        return matcher.handler(trimmed, returnFields);
      }
    }

    return null;
  }

  private extractValue(line: string, regex: RegExp): string {
    return line
      .replace(new RegExp(`.*${regex.source}\\s*`), '')
      .replace(/\*\/$/, '')
      .trim();
  }
}
