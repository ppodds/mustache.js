import { typeStr } from "./utils";
import {
  Writer,
  TemplateCache,
  WriterConfig,
  Paritals as Partials,
  Tags,
  View,
} from "./writer";

const defaultWriter = new Writer();

/**
 * Allows a user to override the default caching strategy, by providing an
 * object with set, get and clear methods. This can also be used to disable
 * the cache by setting it to the literal `undefined`.
 */
export function setTemplateCache(cache: TemplateCache | undefined) {
  defaultWriter.templateCache = cache;
}

/**
 * Gets the default or overridden caching object from the default writer.
 */
export function getTemplateCache() {
  return defaultWriter.templateCache;
}

export function getTags() {
  return defaultWriter.defaultTags;
}

export function setTags(tags: Tags) {
  defaultWriter.defaultTags = tags;
}

/**
 * Renders the `template` with the given `view`, `partials`, and `config`
 * using the default writer.
 */
export function render(
  template: string,
  view: View,
  partials?: Partials,
  config?: WriterConfig,
) {
  if (typeof template !== "string") {
    throw new TypeError(
      'Invalid template! Template should be a "string" ' +
        'but "' +
        typeStr(template) +
        '" was given as the first ' +
        "argument for mustache#render(template, view, partials)",
    );
  }

  return defaultWriter.render(template, view, partials, config);
}

/**
 * Parses and caches the given template in the default writer and returns the
 * array of tokens it contains. Doing this ahead of time avoids the need to
 * parse templates on the fly as they are rendered.
 */
export function parse(template: string, tags?: Tags) {
  return defaultWriter.parse(template, tags);
}

/**
 * Clears all cached templates in the default writer.
 */
export function clearCache() {
  return defaultWriter.clearCache();
}

export const escape = defaultWriter.escapeHtml;
