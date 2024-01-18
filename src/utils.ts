import { nonSpaceRe } from "./writer/regex";

export function isFunction(object: unknown) {
  return typeof object === "function";
}

/**
 * More correct typeof string handling array
 * which normally returns typeof 'object'
 */
export function typeStr(obj: unknown) {
  return isArray(obj) ? "array" : typeof obj;
}

export const isArray =
  Array.isArray ||
  function isArrayPolyfill(object) {
    return objectToString.call(object) === "[object Array]";
  };

export const objectToString = Object.prototype.toString;

/**
 * Null safe way of checking whether or not an object,
 * including its prototype, has a given property
 */
export function hasProperty(obj: unknown, propName: string) {
  return obj != null && typeof obj === "object" && propName in obj;
}

/**
 * Safe way of detecting whether or not the given thing is a primitive and
 * whether it has the given property
 */
export function primitiveHasOwnProperty(primitive: unknown, propName: string) {
  return (
    primitive != null &&
    typeof primitive !== "object" &&
    primitive.hasOwnProperty &&
    primitive.hasOwnProperty(propName)
  );
}

// Workaround for https://issues.apache.org/jira/browse/COUCHDB-577
// See https://github.com/janl/mustache.js/issues/189
export const regExpTest = RegExp.prototype.test;

export function escapeRegExp(str: string) {
  return str.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
}

export function isWhitespace(str: string) {
  return !testRegExp(nonSpaceRe, str);
}

export function testRegExp(re: RegExp, str: string) {
  return regExpTest.call(re, str);
}
