import { Context } from "./context";
import { escapeRegExp, isArray, isFunction, isWhitespace } from "../utils";
import { EscapeFunction, WriterConfig } from "./config";
import { Tags } from "./tags";
import { DefaultTemplateCache, TemplateCache } from "./template-cache";
import { View, ViewFunction } from "./view";
import { Paritals, PartialFunction, PartialObject } from "./partials";
import { curlyRe, equalsRe, spaceRe, tagRe, whiteRe } from "./regex";
import { Scanner } from "./scanner";
import {
  NestedToken,
  ParsedToken,
  PartialToken,
  TagType,
  Token,
} from "./token";
import { entityMap } from "./entity-map";

/**
 * A Writer knows how to take a stream of tokens and render them to a
 * string, given a context. It also maintains a cache of templates to
 * avoid the need to parse the same template twice.
 */
export class Writer {
  templateCache: TemplateCache | undefined;
  defaultTags: Tags;

  constructor() {
    this.templateCache = new DefaultTemplateCache();
    this.defaultTags = ["{{", "}}"];
  }

  /**
   * Clears all cached templates in this writer.
   */
  clearCache() {
    // TODO: try to remove this typeof
    if (typeof this.templateCache !== "undefined") {
      this.templateCache.clear();
    }
  }

  /**
   * Parses and caches the given `template` according to the given `tags` or
   * `mustache.tags` if `tags` is omitted,  and returns the array of tokens
   * that is generated from the parse.
   */
  parse(template: string, tags?: Tags): ParsedToken[] {
    const cache = this.templateCache;
    const cacheKey = template + ":" + (tags || this.defaultTags).join(":");
    const isCacheEnabled = cache !== undefined;
    let tokens = isCacheEnabled ? cache.get(cacheKey) : undefined;

    if (tokens == undefined) {
      tokens = this.parseTemplate(template, tags);
      isCacheEnabled && cache.set(cacheKey, tokens);
    }
    return tokens;
  }

  /**
   * High-level method that is used to render the given `template` with
   * the given `view`.
   *
   * The optional `partials` argument may be an object that contains the
   * names and templates of partials that are used in the template. It may
   * also be a function that is used to load partial templates on the fly
   * that takes a single argument: the name of the partial.
   *
   * If the optional `config` argument is given here, then it should be an
   * object with a `tags` attribute or an `escape` attribute or both.
   * If an array is passed, then it will be interpreted the same way as
   * a `tags` attribute on a `config` object.
   *
   * The `tags` attribute of a `config` object must be an array with two
   * string values: the opening and closing tags used in the template (e.g.
   * [ "<%", "%>" ]). The default is to mustache.tags.
   *
   * The `escape` attribute of a `config` object must be a function which
   * accepts a string as input and outputs a safely escaped string.
   * If an `escape` function is not provided, then an HTML-safe string
   * escaping function is used as the default.
   */
  render(
    template: string,
    view: View | Context,
    partials?: Paritals,
    config?: WriterConfig,
  ): string {
    const tags = this.getConfigTags(config);
    const tokens = this.parse(template, tags);
    const context =
      view instanceof Context ? view : new Context(view, undefined);
    return this.renderTokens(
      tokens,
      context,
      partials || {},
      template,
      config || {},
    );
  }

  /**
   * Low-level method that renders the given array of `tokens` using
   * the given `context` and `partials`.
   *
   * Note: The `originalTemplate` is only ever used to extract the portion
   * of the original template that was contained in a higher-order section.
   * If the template doesn't use higher-order sections, this argument may
   * be omitted.
   */
  renderTokens(
    tokens: ParsedToken[],
    context: Context,
    partials: Paritals,
    originalTemplate: string,
    config: WriterConfig,
  ): string {
    let buffer = "";
    for (let i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      let value: string | number | undefined = undefined;
      const token = tokens[i];

      switch (token[0]) {
        case TagType.Section:
          value = this.renderSection(
            token,
            context,
            partials,
            originalTemplate,
            config,
          );
          break;
        case TagType.InvertedSection:
          value = this.renderInverted(
            token,
            context,
            partials,
            originalTemplate,
            config,
          );
          break;
        case TagType.Partial:
          value = this.renderPartial(token, context, partials, config);
          break;
        case TagType.UnEscaped:
          value = this.unescapedValue(token, context);
          break;
        case "name":
          value = this.escapedValue(token, context, config);
          break;
        case "text":
          value = this.rawValue(token);
          break;
      }

      if (value !== undefined) buffer += value;
    }

    return buffer;
  }

  renderSection(
    token: NestedToken,
    context: Context,
    partials: Paritals,
    originalTemplate: string,
    config: WriterConfig,
  ) {
    let buffer = "";
    let value = context.lookup(token[1]);

    // This function is used to render an arbitrary template
    // in the current context by higher-order sections.
    function subRender(template: string) {
      return this.render(template, context, partials, config);
    }

    if (!value) return;

    if (isArray(value)) {
      for (let j = 0, valueLength = value.length; j < valueLength; ++j) {
        buffer += this.renderTokens(
          token[4],
          context.push(value[j]),
          partials,
          originalTemplate,
          config,
        );
      }
    } else if (
      typeof value === "object" ||
      typeof value === "string" ||
      typeof value === "number"
    ) {
      buffer += this.renderTokens(
        token[4],
        context.push(value),
        partials,
        originalTemplate,
        config,
      );
    } else if (isFunction(value)) {
      if (typeof originalTemplate !== "string")
        throw new Error(
          "Cannot use higher-order sections without the original template",
        );

      // Extract the portion of the original template that the section contains.
      value = (value as ViewFunction).call(
        context.view,
        originalTemplate.slice(token[3], token[5]),
        subRender.bind(this),
      );

      if (value != null) buffer += value;
    } else {
      buffer += this.renderTokens(
        token[4],
        context,
        partials,
        originalTemplate,
        config,
      );
    }
    return buffer;
  }

  renderInverted(
    token: NestedToken,
    context: Context,
    partials: Paritals,
    originalTemplate: string,
    config: WriterConfig,
  ) {
    const value = context.lookup(token[1]);

    // Use JavaScript's definition of falsy. Include empty arrays.
    // See https://github.com/janl/mustache.js/issues/186
    if (!value || (isArray(value) && value.length === 0))
      return this.renderTokens(
        token[4],
        context,
        partials,
        originalTemplate,
        config,
      );
  }

  indentPartial(
    partial: string,
    indentation: string,
    lineHasNonSpace: boolean,
  ) {
    const filteredIndentation = indentation.replace(/[^ \t]/g, "");
    const partialByNl = partial.split("\n");
    for (let i = 0; i < partialByNl.length; i++) {
      if (partialByNl[i].length && (i > 0 || !lineHasNonSpace)) {
        partialByNl[i] = filteredIndentation + partialByNl[i];
      }
    }
    return partialByNl.join("\n");
  }

  renderPartial(
    token: PartialToken,
    context: Context,
    partials: Paritals,
    config: WriterConfig,
  ) {
    if (!partials) return;
    const tags = this.getConfigTags(config);

    const value = isFunction(partials)
      ? (partials as PartialFunction)(token[1])
      : (partials as PartialObject)[token[1]];
    if (value != null) {
      const lineHasNonSpace = token[6];
      const tagIndex = token[5];
      const indentation = token[4];
      let indentedValue = value;
      if (tagIndex == 0 && indentation) {
        indentedValue = this.indentPartial(value, indentation, lineHasNonSpace);
      }
      const tokens = this.parse(indentedValue, tags);
      return this.renderTokens(
        tokens,
        context,
        partials,
        indentedValue,
        config,
      );
    }
  }

  unescapedValue(token: Token, context: Context): string {
    const value = context.lookup(token[1]);
    if (value === undefined || value === null) {
      return "";
    }
    if (typeof value !== "string") {
      return value.toString();
    }
    return value;
  }

  escapedValue(token: Token, context: Context, config: WriterConfig): string {
    const escape = this.getConfigEscape(config) || this.escapeHtml;
    const value = context.lookup(token[1]);
    if (value === undefined || value === null) {
      return "";
    }
    return typeof value === "number" && escape === this.escapeHtml
      ? String(value)
      : escape(value as string);
  }

  rawValue(token: Token): string {
    return token[1];
  }

  getConfigTags(config?: WriterConfig) {
    if (isArray(config)) {
      return config;
    } else if (config && typeof config === "object") {
      return config.tags;
    } else {
      return undefined;
    }
  }

  getConfigEscape(config?: WriterConfig): EscapeFunction | undefined {
    if (config && typeof config === "object" && !isArray(config)) {
      return config.escape;
    } else {
      return undefined;
    }
  }

  /**
   * Breaks up the given `template` string into a tree of tokens. If the `tags`
   * argument is given here it must be an array with two string values: the
   * opening and closing tags used in the template (e.g. [ "<%", "%>" ]). Of
   * course, the default is to use mustaches (i.e. mustache.tags).
   *
   * A token is an array with at least 4 elements. The first element is the
   * mustache symbol that was used inside the tag, e.g. "#" or "&". If the tag
   * did not contain a symbol (i.e. {{myValue}}) this element is "name". For
   * all text that appears outside a symbol this element is "text".
   *
   * The second element of a token is its "value". For mustache tags this is
   * whatever else was inside the tag besides the opening symbol. For text tokens
   * this is the text itself.
   *
   * The third and fourth elements of the token are the start and end indices,
   * respectively, of the token in the original template.
   *
   * Tokens that are the root node of a subtree contain two more elements: 1) an
   * array of tokens in the subtree and 2) the index in the original template at
   * which the closing tag for that section begins.
   *
   * Tokens for partials also contain two more elements: 1) a string value of
   * indendation prior to that tag and 2) the index of that tag on that line -
   * eg a value of 2 indicates the partial is the third tag on this line.
   */
  parseTemplate(template: string, tags?: Tags): ParsedToken[] {
    if (!template) return [];
    let lineHasNonSpace = false;
    const sections = []; // Stack to hold section tokens
    const tokens: Token[] = []; // Buffer to hold the tokens
    let spaces: number[] = []; // Indices of whitespace tokens on the current line
    let hasTag = false; // Is there a {{tag}} on the current line?
    let nonSpace = false; // Is there a non-space char on the current line?
    let indentation = ""; // Tracks indentation for tags that use it
    let tagIndex = 0; // Stores a count of number of tags encountered on a line

    // Strips all whitespace tokens array for the current line
    // if there was a {{#tag}} on it and otherwise only space.
    function stripSpace() {
      if (hasTag && !nonSpace) {
        while (spaces.length) delete tokens[spaces.pop() as number];
      } else {
        spaces = [];
      }

      hasTag = false;
      nonSpace = false;
    }

    let { openingTagRe, closingTagRe, closingCurlyRe } = this.compileTags(
      tags || this.defaultTags,
    );

    const scanner = new Scanner(template);

    let start: number,
      value: string,
      chr: string,
      token: Token,
      openSection: Token | undefined;
    while (!scanner.eos()) {
      start = scanner.pos;

      // Match any text between tags.
      value = scanner.scanUntil(openingTagRe);

      if (value) {
        for (let i = 0, valueLength = value.length; i < valueLength; ++i) {
          chr = value.charAt(i);

          if (isWhitespace(chr)) {
            spaces.push(tokens.length);
            indentation += chr;
          } else {
            nonSpace = true;
            lineHasNonSpace = true;
            indentation += " ";
          }

          tokens.push(["text", chr, start, start + 1]);
          start += 1;

          // Check for whitespace on the current line.
          if (chr === "\n") {
            stripSpace();
            indentation = "";
            tagIndex = 0;
            lineHasNonSpace = false;
          }
        }
      }

      // Match the opening tag.
      if (!scanner.scan(openingTagRe)) break;

      hasTag = true;

      // Get the tag type.
      let type = (scanner.scan(tagRe) || "name") as TagType | "name";
      scanner.scan(whiteRe);

      // Get the tag value.
      if (type === TagType.ChangeTag) {
        value = scanner.scanUntil(equalsRe);
        scanner.scan(equalsRe);
        scanner.scanUntil(closingTagRe);
      } else if (type === TagType.UnEscapedAlias) {
        value = scanner.scanUntil(closingCurlyRe);
        scanner.scan(curlyRe);
        scanner.scanUntil(closingTagRe);
        type = TagType.UnEscaped;
      } else {
        value = scanner.scanUntil(closingTagRe);
      }

      // Match the closing tag.
      if (!scanner.scan(closingTagRe))
        throw new Error("Unclosed tag at " + scanner.pos);

      if (type == TagType.Partial) {
        token = [
          type,
          value,
          start,
          scanner.pos,
          indentation,
          tagIndex,
          lineHasNonSpace,
        ];
      } else {
        token = [type, value, start, scanner.pos] as Token;
      }
      tagIndex++;
      tokens.push(token);

      if (type === TagType.Section || type === TagType.InvertedSection) {
        sections.push(token);
      } else if (type === TagType.CloseSection) {
        // Check section nesting.
        openSection = sections.pop();

        if (!openSection)
          throw new Error('Unopened section "' + value + '" at ' + start);

        if (openSection[1] !== value)
          throw new Error(
            'Unclosed section "' + openSection[1] + '" at ' + start,
          );
      } else if (type === "name" || type === TagType.UnEscaped) {
        nonSpace = true;
      } else if (type === TagType.ChangeTag) {
        // Set the tags for the next time around.
        const t = this.compileTags(value);
        openingTagRe = t.openingTagRe;
        closingTagRe = t.closingTagRe;
        closingCurlyRe = t.closingCurlyRe;
      }
    }

    stripSpace();

    // Make sure there are no open sections when we're done.
    openSection = sections.pop();

    if (openSection)
      throw new Error(
        'Unclosed section "' + openSection[1] + '" at ' + scanner.pos,
      );

    return this.nestTokens(this.squashTokens(tokens));
  }

  /**
   * Combines the values of consecutive text tokens in the given `tokens` array
   * to a single token.
   */
  squashTokens(tokens: Token[]) {
    const squashedTokens = [];

    let token, lastToken;
    for (let i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      token = tokens[i];

      if (token) {
        if (token[0] === "text" && lastToken && lastToken[0] === "text") {
          lastToken[1] += token[1];
          lastToken[3] = token[3];
        } else {
          squashedTokens.push(token);
          lastToken = token;
        }
      }
    }

    return squashedTokens;
  }

  /**
   * Forms the given array of `tokens` into a nested tree structure where
   * tokens that represent a section have two additional items: 1) an array of
   * all tokens that appear in that section and 2) the index in the original
   * template that represents the end of that section.
   */
  nestTokens(tokens: Token[]): ParsedToken[] {
    const nestedTokens: NestedToken[] = [];
    let collector: ParsedToken[] = nestedTokens;
    const sections: NestedToken[] = [];

    for (let i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      const token = tokens[i];

      switch (token[0]) {
        case TagType.Section:
        case TagType.InvertedSection:
          const nestedToken = token as NestedToken;
          collector.push(nestedToken);
          sections.push(nestedToken);
          collector = nestedToken[4] = [];
          break;
        case TagType.CloseSection:
          const section = sections.pop();
          if (section === undefined) {
            throw new Error(`Unopened section "${token[1]}" at ${token[2]}`);
          }
          section[5] = token[2];
          collector =
            sections.length > 0
              ? sections[sections.length - 1][4]
              : nestedTokens;
          break;
        default:
          collector.push(token);
      }
    }

    return nestedTokens;
  }

  compileTags(tagsToCompile: string | Tags): {
    openingTagRe: RegExp;
    closingTagRe: RegExp;
    closingCurlyRe: RegExp;
  } {
    if (typeof tagsToCompile === "string")
      tagsToCompile = tagsToCompile.split(spaceRe, 2) as Tags;

    if (!isArray(tagsToCompile) || tagsToCompile.length !== 2)
      throw new Error("Invalid tags: " + tagsToCompile);

    const openingTagRe = new RegExp(escapeRegExp(tagsToCompile[0]) + "\\s*");
    const closingTagRe = new RegExp("\\s*" + escapeRegExp(tagsToCompile[1]));
    const closingCurlyRe = new RegExp(
      "\\s*" + escapeRegExp("}" + tagsToCompile[1]),
    );
    return { openingTagRe, closingTagRe, closingCurlyRe };
  }

  escapeHtml(str: string): string {
    return String(str).replace(/[&<>"'`=\/]/g, function fromEntityMap(s) {
      return entityMap[s as keyof typeof entityMap];
    });
  }
}
