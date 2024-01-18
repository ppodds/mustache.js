import { hasProperty, isFunction, primitiveHasOwnProperty } from "../utils";
import {
  LambdaViewFunction,
  View,
  ViewData,
  ViewFunction,
  ViewObject,
} from "./view";

/**
 * Represents a rendering context by wrapping a view object and
 * maintaining a reference to the parent context.
 */
export class Context {
  view: View;
  cache: {
    [key: string]: View | undefined;
  };
  parent?: Context;

  constructor(view: View, parentContext?: Context) {
    this.view = view;
    this.cache = { ".": this.view };
    this.parent = parentContext;
  }

  /**
   * Creates a new context using the given view with this context
   * as the parent.
   */
  push(view: View) {
    return new Context(view, this);
  }

  /**
   * Returns the value of the given name in this context, traversing
   * up the context hierarchy if the value is absent in this context's view.
   */
  lookup(name: string): ViewData | ViewFunction | undefined {
    const cache = this.cache;

    let value: View | undefined = undefined;
    if (cache.hasOwnProperty(name)) {
      value = cache[name];
    } else {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      let context: Context | undefined = this,
        intermediateValue: View | undefined,
        names: string[],
        index: number,
        lookupHit = false;

      while (context) {
        if (name.indexOf(".") > 0) {
          intermediateValue = context.view;
          names = name.split(".");
          index = 0;

          /**
           * Using the dot notion path in `name`, we descend through the
           * nested objects.
           *
           * To be certain that the lookup has been successful, we have to
           * check if the last object in the path actually has the property
           * we are looking for. We store the result in `lookupHit`.
           *
           * This is specially necessary for when the value has been set to
           * `undefined` and we want to avoid looking up parent contexts.
           *
           * In the case where dot notation is used, we consider the lookup
           * to be successful even if the last "object" in the path is
           * not actually an object but a primitive (e.g., a string, or an
           * integer), because it is sometimes useful to access a property
           * of an autoboxed primitive, such as the length of a string.
           **/
          while (intermediateValue != null && index < names.length) {
            if (index === names.length - 1)
              lookupHit =
                hasProperty(intermediateValue, names[index]) ||
                primitiveHasOwnProperty(intermediateValue, names[index]);

            intermediateValue = (intermediateValue as ViewObject)[
              names[index++]
            ];
          }
        } else {
          intermediateValue = (context.view as ViewObject)[name];

          /**
           * Only checking against `hasProperty`, which always returns `false` if
           * `context.view` is not an object. Deliberately omitting the check
           * against `primitiveHasOwnProperty` if dot notation is not used.
           *
           * Consider this example:
           * ```
           * Mustache.render("The length of a football field is {{#length}}{{length}}{{/length}}.", {length: "100 yards"})
           * ```
           *
           * If we were to check also against `primitiveHasOwnProperty`, as we do
           * in the dot notation case, then render call would return:
           *
           * "The length of a football field is 9."
           *
           * rather than the expected:
           *
           * "The length of a football field is 100 yards."
           **/
          lookupHit = hasProperty(context.view, name);
        }

        if (lookupHit) {
          value = intermediateValue;
          break;
        }

        context = context.parent;
      }

      cache[name] = value;
    }

    if (isFunction(value))
      value = (value as LambdaViewFunction).call(this.view);

    return value as ViewData;
  }
}
