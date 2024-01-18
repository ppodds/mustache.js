import {
  View,
  ViewObject,
  clearCache,
  render,
  setTags,
  getTags,
  escape,
  WriterConfig,
  LambdaViewFunction,
} from "../src";
import { getTests } from "./render-helper";

describe("render", () => {
  beforeEach(() => {
    clearCache();
  });

  it("requires template to be a string", () => {
    expect(() =>
      render(
        ["dummy template"] as unknown as string,
        ["foo", "bar"] as unknown as ViewObject,
      ),
    ).toThrow(
      'Invalid template! Template should be a "string" but ' +
        '"array" was given as the first argument ' +
        "for mustache#render(template, view, partials)",
    );
  });

  describe("custom tags", () => {
    it("uses tags argument instead of setTags when given", () => {
      const template = "<<placeholder>>bar{{placeholder}}";

      setTags(["{{", "}}"]);
      expect(render(template, { placeholder: "foo" }, {}, ["<<", ">>"])).toBe(
        "foobar{{placeholder}}",
      );
    });

    it("uses config.tags argument instead of setTags when given", () => {
      const template = "<<placeholder>>bar{{placeholder}}";

      setTags(["{{", "}}"]);
      expect(
        render(template, { placeholder: "foo" }, {}, { tags: ["<<", ">>"] }),
      ).toBe("foobar{{placeholder}}");
    });

    it("uses tags argument instead of setTags when given, even when it previously rendered the template using setTags", () => {
      const template = "((placeholder))bar{{placeholder}}";

      setTags(["{{", "}}"]);
      render(template, { placeholder: "foo" });
      expect(render(template, { placeholder: "foo" }, {}, ["((", "))"])).toBe(
        "foobar{{placeholder}}",
      );
    });

    it("uses config.tags argument instead of setTags when given, even when it previously rendered the template using setTags", () => {
      const template = "((placeholder))bar{{placeholder}}";

      setTags(["{{", "}}"]);
      render(template, { placeholder: "foo" });
      expect(
        render(template, { placeholder: "foo" }, {}, { tags: ["((", "))"] }),
      ).toBe("foobar{{placeholder}}");
    });

    it("uses tags argument instead of setTags when given, even when it previously rendered the template using different tags", () => {
      const template = "[[placeholder]]bar<<placeholder>>";

      render(template, { placeholder: "foo" }, {}, ["<<", ">>"]);
      expect(render(template, { placeholder: "foo" }, {}, ["[[", "]]"])).toBe(
        "foobar<<placeholder>>",
      );
    });

    it("uses config.tags argument instead of setTags when given, even when it previously rendered the template using different tags", () => {
      const template = "[[placeholder]]bar<<placeholder>>";

      render(template, { placeholder: "foo" }, {}, ["<<", ">>"]);
      expect(
        render(template, { placeholder: "foo" }, {}, { tags: ["[[", "]]"] }),
      ).toBe("foobar<<placeholder>>");
    });

    it("does not mutate setTags when given tags argument", () => {
      const correctMustacheTags: [string, string] = ["{{", "}}"];
      setTags(correctMustacheTags);

      render("((placeholder))", { placeholder: "foo" }, {}, ["((", "))"]);

      expect(getTags()).toBe(correctMustacheTags);
      expect(getTags()).toEqual(["{{", "}}"]);
    });

    it("does not mutate setTags when given config.tags argument", () => {
      const correctMustacheTags: [string, string] = ["{{", "}}"];
      setTags(correctMustacheTags);

      render(
        "((placeholder))",
        { placeholder: "foo" },
        {},
        { tags: ["((", "))"] },
      );

      expect(getTags()).toBe(correctMustacheTags);
      expect(getTags()).toEqual(["{{", "}}"]);
    });

    it("uses provided tags when rendering partials", () => {
      const output = render(
        "<%> partial %>",
        { name: "Santa Claus" },
        {
          partial: "<% name %>",
        },
        ["<%", "%>"],
      );

      expect(output).toBe("Santa Claus");
    });

    it("uses provided config.tags when rendering partials", () => {
      const output = render(
        "<%> partial %>",
        { name: "Santa Claus" },
        {
          partial: "<% name %>",
        },
        { tags: ["<%", "%>"] },
      );

      expect(output).toBe("Santa Claus");
    });

    it("uses config.escape argument instead of Mustache.escape when given", () => {
      const template = "Hello, {{placeholder}}";

      function escapeBang(text: string) {
        return text + "!";
      }
      expect(
        render(template, { placeholder: "world" }, {}, { escape: escapeBang }),
      ).toBe("Hello, world!");
    });

    it("uses config.escape argument instead of Mustache.escape when given, even when it previously rendered the template using Mustache.escape", () => {
      const template = "Hello, {{placeholder}}";

      function escapeQuestion(text: string) {
        return text + "?";
      }
      render(template, { placeholder: "world" });
      expect(
        render(
          template,
          { placeholder: "world" },
          {},
          { escape: escapeQuestion },
        ),
      ).toBe("Hello, world?");
    });

    it("uses config.escape argument instead of Mustache.escape when given, even when it previously rendered the template using a different escape function", () => {
      const template = "Hello, {{placeholder}}";

      function escapeQuestion(text: string) {
        return text + "?";
      }
      function escapeBang(text: string) {
        return text + "!";
      }
      render(template, { placeholder: "foo" }, {}, { escape: escapeQuestion });
      expect(
        render(template, { placeholder: "foo" }, {}, { escape: escapeBang }),
      ).toBe("Hello, foo!");
    });

    it("does not mutate Mustache.escape when given config.escape argument", () => {
      const correctMustacheEscape = escape;

      function escapeNone(text: string) {
        return text;
      }

      render(
        "((placeholder))",
        { placeholder: "foo" },
        {},
        { escape: escapeNone },
      );

      expect(escape).toBe(correctMustacheEscape);
      expect(escape(">&")).toBe("&gt;&amp;");
    });

    it("uses provided config.escape when rendering partials", () => {
      function escapeDoubleAmpersand(text: string) {
        return text.replace("&", "&&");
      }

      const output = render(
        "{{> partial }}",
        { name: "Ampersand &" },
        {
          partial: "{{ name }}",
        },
        { escape: escapeDoubleAmpersand },
      );

      expect(output).toBe("Ampersand &&");
    });

    it("uses config.tags and config.escape arguments instead of setTags and Mustache.escape when given", () => {
      const template = "Hello, {{placeholder}} [[placeholder]]";

      function escapeTwoBangs(text: string) {
        return text + "!!";
      }
      const config: WriterConfig = {
        tags: ["[[", "]]"],
        escape: escapeTwoBangs,
      };
      expect(render(template, { placeholder: "world" }, {}, config)).toBe(
        "Hello, {{placeholder}} world!!",
      );
    });

    it("uses provided config.tags and config.escape when rendering partials", () => {
      function escapeDoubleAmpersand(text: string) {
        return text.replace("&", "&&");
      }
      const config: WriterConfig = {
        tags: ["[[", "]]"],
        escape: escapeDoubleAmpersand,
      };
      const output = render(
        "[[> partial ]]",
        { name: "Ampersand &" },
        {
          partial: "[[ name ]]",
        },
        config,
      );

      expect(output).toBe("Ampersand &&");
    });

    it("uses provided config.tags and config.escape when rendering sections", () => {
      const template =
        "<[[&value-raw]]: " +
        "[[#test-1]][[value-1]][[/test-1]]" +
        "[[^test-2]][[value-2]][[/test-2]], " +
        "[[#test-lambda]][[value-lambda]][[/test-lambda]]" +
        ">";

      function escapeQuotes(text: string) {
        return '"' + text + '"';
      }

      const config: WriterConfig = {
        tags: ["[[", "]]"],
        escape: escapeQuotes,
      };

      const viewTestTrue = {
        "value-raw": "foo",
        "test-1": true,
        "value-1": "abc",
        "test-2": true,
        "value-2": "123",
        "test-lambda": () => (text: string, render: (text: string) => string) =>
          "lambda: " + render(text),
        "value-lambda": "bar",
      };
      const viewTestFalse = {
        "value-raw": "foo",
        "test-1": false,
        "value-1": "abc",
        "test-2": false,
        "value-2": "123",
        "test-lambda": () => (text: string, render: (text: string) => string) =>
          "lambda: " + render(text),
        "value-lambda": "bar",
      };
      const outputTrue = render(template, viewTestTrue, {}, config);
      const outputFalse = render(template, viewTestFalse, {}, config);

      expect(outputTrue).toBe('<foo: "abc", lambda: "bar">');
      expect(outputFalse).toBe('<foo: "123", lambda: "bar">');
    });
  });

  const tests = getTests();

  tests.forEach((test) => {
    const view = eval(test.view);

    it("knows how to render " + test.name, () => {
      let output;
      if (test.partial) {
        output = render(test.template, view, {
          partial: test.partial,
        });
      } else {
        output = render(test.template, view);
      }

      expect(output).toBe(test.expect);
    });
  });
});
