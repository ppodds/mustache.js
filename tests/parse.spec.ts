import {
  parse,
  ParsedToken,
  TagType,
  TemplateCache,
  getTemplateCache,
  clearCache,
  getTags,
  setTags,
  setTemplateCache,
} from "../src";

// A map of templates to their expected token output. Tokens are in the format:
// [type, value, startIndex, endIndex, subTokens].
const expectations: { [key: string]: ParsedToken[] } = {
  "": [],
  "{{hi}}": [["name", "hi", 0, 6]],
  "{{hi.world}}": [["name", "hi.world", 0, 12]],
  "{{hi . world}}": [["name", "hi . world", 0, 14]],
  "{{ hi}}": [["name", "hi", 0, 7]],
  "{{hi }}": [["name", "hi", 0, 7]],
  "{{ hi }}": [["name", "hi", 0, 8]],
  "{{{hi}}}": [[TagType.UnEscaped, "hi", 0, 8]],
  "{{!hi}}": [[TagType.Comment, "hi", 0, 7]],
  "{{! hi}}": [[TagType.Comment, "hi", 0, 8]],
  "{{! hi }}": [[TagType.Comment, "hi", 0, 9]],
  "{{ !hi}}": [[TagType.Comment, "hi", 0, 8]],
  "{{ ! hi}}": [[TagType.Comment, "hi", 0, 9]],
  "{{ ! hi }}": [[TagType.Comment, "hi", 0, 10]],
  "a\n b": [["text", "a\n b", 0, 4]],
  "a{{hi}}": [
    ["text", "a", 0, 1],
    ["name", "hi", 1, 7],
  ],
  "a {{hi}}": [
    ["text", "a ", 0, 2],
    ["name", "hi", 2, 8],
  ],
  " a{{hi}}": [
    ["text", " a", 0, 2],
    ["name", "hi", 2, 8],
  ],
  " a {{hi}}": [
    ["text", " a ", 0, 3],
    ["name", "hi", 3, 9],
  ],
  "a{{hi}}b": [
    ["text", "a", 0, 1],
    ["name", "hi", 1, 7],
    ["text", "b", 7, 8],
  ],
  "a{{hi}} b": [
    ["text", "a", 0, 1],
    ["name", "hi", 1, 7],
    ["text", " b", 7, 9],
  ],
  "a{{hi}}b ": [
    ["text", "a", 0, 1],
    ["name", "hi", 1, 7],
    ["text", "b ", 7, 9],
  ],
  "a\n{{hi}} b \n": [
    ["text", "a\n", 0, 2],
    ["name", "hi", 2, 8],
    ["text", " b \n", 8, 12],
  ],
  "a\n {{hi}} \nb": [
    ["text", "a\n ", 0, 3],
    ["name", "hi", 3, 9],
    ["text", " \nb", 9, 12],
  ],
  "a\n {{!hi}} \nb": [
    ["text", "a\n", 0, 2],
    [TagType.Comment, "hi", 3, 10],
    ["text", "b", 12, 13],
  ],
  "a\n{{#a}}{{/a}}\nb": [
    ["text", "a\n", 0, 2],
    [TagType.Section, "a", 2, 8, [], 8],
    ["text", "b", 15, 16],
  ],
  "a\n {{#a}}{{/a}}\nb": [
    ["text", "a\n", 0, 2],
    [TagType.Section, "a", 3, 9, [], 9],
    ["text", "b", 16, 17],
  ],
  "a\n {{#a}}{{/a}} \nb": [
    ["text", "a\n", 0, 2],
    [TagType.Section, "a", 3, 9, [], 9],
    ["text", "b", 17, 18],
  ],
  "a\n{{#a}}\n{{/a}}\nb": [
    ["text", "a\n", 0, 2],
    [TagType.Section, "a", 2, 8, [], 9],
    ["text", "b", 16, 17],
  ],
  "a\n {{#a}}\n{{/a}}\nb": [
    ["text", "a\n", 0, 2],
    [TagType.Section, "a", 3, 9, [], 10],
    ["text", "b", 17, 18],
  ],
  "a\n {{#a}}\n{{/a}} \nb": [
    ["text", "a\n", 0, 2],
    [TagType.Section, "a", 3, 9, [], 10],
    ["text", "b", 18, 19],
  ],
  "a\n{{#a}}\n{{/a}}\n{{#b}}\n{{/b}}\nb": [
    ["text", "a\n", 0, 2],
    [TagType.Section, "a", 2, 8, [], 9],
    [TagType.Section, "b", 16, 22, [], 23],
    ["text", "b", 30, 31],
  ],
  "a\n {{#a}}\n{{/a}}\n{{#b}}\n{{/b}}\nb": [
    ["text", "a\n", 0, 2],
    [TagType.Section, "a", 3, 9, [], 10],
    [TagType.Section, "b", 17, 23, [], 24],
    ["text", "b", 31, 32],
  ],
  "a\n {{#a}}\n{{/a}}\n{{#b}}\n{{/b}} \nb": [
    ["text", "a\n", 0, 2],
    [TagType.Section, "a", 3, 9, [], 10],
    [TagType.Section, "b", 17, 23, [], 24],
    ["text", "b", 32, 33],
  ],
  "a\n{{#a}}\n{{#b}}\n{{/b}}\n{{/a}}\nb": [
    ["text", "a\n", 0, 2],
    [TagType.Section, "a", 2, 8, [[TagType.Section, "b", 9, 15, [], 16]], 23],
    ["text", "b", 30, 31],
  ],
  "a\n {{#a}}\n{{#b}}\n{{/b}}\n{{/a}}\nb": [
    ["text", "a\n", 0, 2],
    [TagType.Section, "a", 3, 9, [[TagType.Section, "b", 10, 16, [], 17]], 24],
    ["text", "b", 31, 32],
  ],
  "a\n {{#a}}\n{{#b}}\n{{/b}}\n{{/a}} \nb": [
    ["text", "a\n", 0, 2],
    [TagType.Section, "a", 3, 9, [[TagType.Section, "b", 10, 16, [], 17]], 24],
    ["text", "b", 32, 33],
  ],
  "{{>abc}}": [[TagType.Partial, "abc", 0, 8, "", 0, false]],
  "{{> abc }}": [[TagType.Partial, "abc", 0, 10, "", 0, false]],
  "{{ > abc }}": [[TagType.Partial, "abc", 0, 11, "", 0, false]],
  "  {{> abc }}\n": [[TagType.Partial, "abc", 2, 12, "  ", 0, false]],
  "  {{> abc }} {{> abc }}\n": [
    [TagType.Partial, "abc", 2, 12, "  ", 0, false],
    [TagType.Partial, "abc", 13, 23, "   ", 1, false],
  ],
  "{{=<% %>=}}": [[TagType.ChangeTag, "<% %>", 0, 11]],
  "{{= <% %> =}}": [[TagType.ChangeTag, "<% %>", 0, 13]],
  "{{=<% %>=}}<%={{ }}=%>": [
    [TagType.ChangeTag, "<% %>", 0, 11],
    [TagType.ChangeTag, "{{ }}", 11, 22],
  ],
  "{{=<% %>=}}<%hi%>": [
    [TagType.ChangeTag, "<% %>", 0, 11],
    ["name", "hi", 11, 17],
  ],
  "{{#a}}{{/a}}hi{{#b}}{{/b}}\n": [
    [TagType.Section, "a", 0, 6, [], 6],
    ["text", "hi", 12, 14],
    [TagType.Section, "b", 14, 20, [], 20],
    ["text", "\n", 26, 27],
  ],
  "{{a}}\n{{b}}\n\n{{#c}}\n{{/c}}\n": [
    ["name", "a", 0, 5],
    ["text", "\n", 5, 6],
    ["name", "b", 6, 11],
    ["text", "\n\n", 11, 13],
    [TagType.Section, "c", 13, 19, [], 20],
  ],
  "{{#foo}}\n  {{#a}}\n    {{b}}\n  {{/a}}\n{{/foo}}\n": [
    [
      TagType.Section,
      "foo",
      0,
      8,
      [
        [
          TagType.Section,
          "a",
          11,
          17,
          [
            ["text", "    ", 18, 22],
            ["name", "b", 22, 27],
            ["text", "\n", 27, 28],
          ],
          30,
        ],
      ],
      37,
    ],
  ],
};

describe("parse", () => {
  let originalTemplateCache: TemplateCache | undefined;

  beforeAll(() => {
    originalTemplateCache = getTemplateCache();
  });

  beforeEach(() => {
    clearCache();
    setTemplateCache(originalTemplateCache);
  });

  for (const template in expectations) {
    ((template, tokens: ParsedToken[]) => {
      it("knows how to parse " + JSON.stringify(template), () => {
        expect(parse(template)).toEqual(tokens);
      });
    })(template, expectations[template]);
  }

  describe("when there is an unclosed tag", () => {
    it("throws an error", () => {
      expect(() => parse("My name is {{name")).toThrow(/unclosed tag at 17/i);
    });
  });

  describe("when there is an unclosed section", () => {
    it("throws an error", () => {
      expect(() => parse("A list: {{#people}}{{name}}")).toThrow(
        /unclosed section "people" at 27/i,
      );
    });
  });

  describe("when there is an unopened section", () => {
    it("throws an error", () => {
      expect(() => parse("A list: {{/people}}")).toThrow(
        /unopened section "people" at 8/i,
      );
    });
  });

  describe("when invalid tags are given as an argument", () => {
    it("throws an error", () => {
      expect(() =>
        parse("A template {{name}}", ["<%"] as unknown as [string, string]),
      ).toThrow(/invalid tags/i);
    });
  });

  describe("when the template contains invalid tags", () => {
    it("throws an error", () => {
      expect(() => parse("A template {{=<%=}}")).toThrow(/invalid tags/i);
    });
  });

  describe("when parsing a template without tags specified followed by the same template with tags specified", () => {
    it("returns different tokens for the latter parse", () => {
      const template = "{{foo}}[bar]";
      const parsedWithBraces = parse(template);
      const parsedWithBrackets = parse(template, ["[", "]"]);
      expect(parsedWithBrackets).not.toEqual(parsedWithBraces);
    });
  });

  describe("when parsing a template with tags specified followed by the same template with different tags specified", () => {
    it("returns different tokens for the latter parse", () => {
      const template = "(foo)[bar]";
      const parsedWithParens = parse(template, ["(", ")"]);
      const parsedWithBrackets = parse(template, ["[", "]"]);
      expect(parsedWithBrackets).not.toEqual(parsedWithParens);
    });
  });

  describe("when parsing a template after already having parsed that template with a different tags", () => {
    it("returns different tokens for the latter parse", () => {
      const template = "{{foo}}[bar]";
      const parsedWithBraces = parse(template);

      const oldTags = getTags();
      setTags(["[", "]"]);
      const parsedWithBrackets = parse(template);
      setTags(oldTags);

      expect(parsedWithBrackets).not.toEqual(parsedWithBraces);
    });
  });

  describe("when parsing a template with the same tags second time, return the cached tokens", () => {
    it("returns the same tokens for the latter parse", () => {
      const template = "{{foo}}[bar]";
      const parsedResult1 = parse(template);
      const parsedResult2 = parse(template);

      expect(parsedResult1).toEqual(parsedResult2);
      expect(parsedResult1).toBe(parsedResult2);
    });
  });

  describe("when parsing a template with caching disabled and the same tags second time, do not return the cached tokens", () => {
    it("returns different tokens for the latter parse", () => {
      setTemplateCache(undefined);
      const template = "{{foo}}[bar]";
      const parsedResult1 = parse(template);
      const parsedResult2 = parse(template);

      expect(parsedResult1).toEqual(parsedResult2);
      expect(parsedResult1).not.toBe(parsedResult2);
    });
  });

  describe("when parsing a template with custom caching and the same tags second time, do not return the cached tokens", () => {
    it("returns the same tokens for the latter parse", () => {
      class CustomTemplateCache implements TemplateCache {
        private _cache: [string, ParsedToken[]][];

        constructor() {
          this._cache = [];
        }

        set(key: string, value: ParsedToken[]) {
          this._cache.push([key, value]);
        }

        get(key: string) {
          const cacheLength = this._cache.length;
          for (let i = 0; i < cacheLength; i++) {
            const entry = this._cache[i];
            if (entry[0] === key) {
              return entry[1];
            }
          }
          return undefined;
        }
        clear() {
          this._cache = [];
        }
      }

      setTemplateCache(new CustomTemplateCache());

      const template = "{{foo}}[bar]";
      const parsedResult1 = parse(template);
      const parsedResult2 = parse(template);

      expect(parsedResult1).toEqual(parsedResult2);
      expect(parsedResult1).toBe(parsedResult2);
    });
  });
});
