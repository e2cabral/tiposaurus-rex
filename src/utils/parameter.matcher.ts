import { QueryParameter, ReturnField } from '../core/domain/interfaces/template.interface.js';

export interface MatcherResult {
  description?: string;
  param?: QueryParameter;
  returnType?: string;
  returnSingle?: boolean;
  returnField?: { info: string; fields: ReturnField[] };
  returnFunction?: { info: string; fields: ReturnField[] };
}

export class ParameterMatcher {
  private static description = {
    matcher: /--\s*@description(?:\s*:)?/,
    action: (line: string): MatcherResult => {
      return {
        description: line.replace(/--\s*@description(?:\s*:)?\s*/, '').trim(),
      };
    },
  };

  private static params = {
    matcher: /--\s*@param(?:\s*:)?/,
    action: (line: string): MatcherResult => {
      const paramPart = line.replace(/--\s*@param(?:\s*:)?\s*/, '').trim();
      const [paramName, paramType] = paramPart.split(':');

      return {
        param: {
          name: paramName.trim(),
          type: paramType ? paramType.trim() : 'any',
        },
      };
    },
  };

  private static returnType = {
    matcher: /--\s*@returnType(?:\s*:)?/,
    action: (line: string): MatcherResult => {
      return {
        returnType: line.replace(/--\s*@returnType(?:\s*:)?\s*/, '').trim(),
      };
    },
  };

  private static returnSingle = {
    matcher: /--\s*@returnSingle(?:\s*:)?/,
    action: (line: string): MatcherResult => {
      const value = line.replace(/--\s*@returnSingle(?:\s*:)?\s*/, '').trim();
      return {
        returnSingle: value.toLowerCase() === 'true',
      };
    },
  };

  private static return = {
    matcher: /--\s*@return(?:\s*:)?/,
    action: (line: string, fields: ReturnField[]): MatcherResult => {
      const info = line.replace(/--\s*@return(?:\s*:)?\s*/, '').trim();
      return {
        returnField: { info, fields },
      };
    },
  };

  private static returnFunction = {
    matcher: /--\s*@returnFunction(?:\s*:)?/,
    action: (line: string, fields: ReturnField[]): MatcherResult => {
      const info = line.replace(/--\s*@returnFunction(?:\s*:)?\s*/, '').trim();
      return {
        returnFunction: { info, fields },
      };
    },
  };

  static matchers = [
    ParameterMatcher.description,
    ParameterMatcher.params,
    ParameterMatcher.returnType,
    ParameterMatcher.returnSingle,
    ParameterMatcher.return,
    ParameterMatcher.returnFunction,
  ];

  static processLine(line: string, returnFields?: ReturnField[]): MatcherResult | null {
    for (const matcher of this.matchers) {
      if (line.match(matcher.matcher)) {
        return matcher.action(line, returnFields || []);
      }
    }
    return null;
  }
}
