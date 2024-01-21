import { ParsedToken } from "./token";

export interface TemplateCache {
  set(key: string, value: ParsedToken[]): void;
  get(key: string): ParsedToken[] | undefined;
  clear(): void;
}

export class DefaultTemplateCache implements TemplateCache {
  private _cache: Record<string, ParsedToken[] | undefined>;

  constructor() {
    this._cache = {};
  }

  set(key: string, value: ParsedToken[]) {
    this._cache[key] = value;
  }

  get(key: string) {
    return this._cache[key];
  }

  clear() {
    this._cache = {};
  }
}
