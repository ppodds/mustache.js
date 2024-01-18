import { ParsedToken } from "./token";

export class TemplateCache {
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
