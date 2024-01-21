import { clearCache, render } from "../src";

describe("Partials spec", () => {
  beforeEach(() => {
    clearCache();
  });

  it("The greater-than operator should expand to the named partial.", () => {
    const template = '"{{>text}}"';
    const data = {};
    const partials = { text: "from partial" };
    const expected = '"from partial"';
    const renderResult = render(template, data, partials);
    expect(renderResult).toBe(expected);
  });

  it("The empty string should be used when the named partial is not found.", () => {
    const template = '"{{>text}}"';
    const data = {};
    const partials = {};
    const expected = '""';
    const renderResult = render(template, data, partials);
    expect(renderResult).toBe(expected);
  });

  it("The greater-than operator should operate within the current context.", () => {
    const template = '"{{>partial}}"';
    const data = { text: "content" };
    const partials = { partial: "*{{text}}*" };
    const expected = '"*content*"';
    const renderResult = render(template, data, partials);
    expect(renderResult).toBe(expected);
  });

  it("Inline partials should not be indented", () => {
    const template = "    <div>{{> partial}}</div>";
    const data = {};
    const partials = { partial: "This is a partial." };
    const expected = "    <div>This is a partial.</div>";
    const renderResult = render(template, data, partials);
    expect(renderResult).toBe(expected);
  });

  it("Inline partials should not be indented (multiline)", () => {
    const template = "    <div>{{> partial}}</div>";
    const data = {};
    const partials = { partial: "This is a\npartial." };
    const expected = "    <div>This is a\n         partial.</div>";
    const renderResult = render(template, data, partials);
    expect(renderResult).toBe(expected);
  });

  it("The greater-than operator should properly recurse.", () => {
    const template = "{{>node}}";
    const data = { content: "X", nodes: [{ content: "Y", nodes: [] }] };
    const partials = { node: "{{content}}<{{#nodes}}{{>node}}{{/nodes}}>" };
    const expected = "X<Y<>>";
    const renderResult = render(template, data, partials);
    expect(renderResult).toBe(expected);
  });

  it("The greater-than operator should not alter surrounding whitespace.", () => {
    const template = "| {{>partial}} |";
    const data = {};
    const partials = { partial: "\t|\t" };
    const expected = "| \t|\t |";
    const renderResult = render(template, data, partials);
    expect(renderResult).toBe(expected);
  });

  it('"\r\n" should be considered a newline for standalone tags.', () => {
    const template = "|\r\n{{>partial}}\r\n|";
    const data = {};
    const partials = { partial: ">" };
    const expected = "|\r\n>|";
    const renderResult = render(template, data, partials);
    expect(renderResult).toBe(expected);
  });

  it("Standalone tags should not require a newline to precede them.", () => {
    const template = "  {{>partial}}\n>";
    const data = {};
    const partials = { partial: ">\n>" };
    const expected = "  >\n  >>";
    const renderResult = render(template, data, partials);
    expect(renderResult).toBe(expected);
  });

  it("Superfluous in-tag whitespace should be ignored.", () => {
    const template = "|{{> partial }}|";
    const data = { boolean: true };
    const partials = { partial: "[]" };
    const expected = "|[]|";
    const renderResult = render(template, data, partials);
    expect(renderResult).toBe(expected);
  });

  it("Each line of the partial should be indented before rendering.", () => {
    const template = "\\\n {{>partial}}\n/\n";
    const data = {
      content: "<\n->",
    };
    const partials = {
      partial: "|\n{{{content}}}\n|\n",
    };
    const expected = "\\\n |\n <\n->\n |\n/\n";
    const renderResult = render(template, data, partials);
    expect(renderResult).toBe(expected);
  });

  it("Standalone tags should not require a newline to follow them.", () => {
    const template = ">\n  {{>partial}}";
    const data = {};
    const partials = {
      partial: ">\n>",
    };
    const expected = ">\n  >\n  >";
    const renderResult = render(template, data, partials);
    expect(renderResult).toBe(expected);
  });

  it("Whitespace should be left untouched.", () => {
    const template = "  {{data}}  {{> partial}}\n";
    const data = {
      data: "|",
    };
    const partials = {
      partial: ">\n>",
    };
    const expected = "  |  >\n>\n";
    const renderResult = render(template, data, partials);
    expect(renderResult).toBe(expected);
  });

  it("Partial without indentation should inherit functions.", () => {
    const template = "{{> partial }}";
    const data = {
      toUpperCase: () => (label: string) => label.toUpperCase(),
    };
    const partials = {
      partial: "aA-{{ #toUpperCase }}Input{{ /toUpperCase }}-Aa",
    };
    const expected = "aA-INPUT-Aa";
    const renderResult = render(template, data, partials);
    expect(renderResult).toBe(expected);
  });

  it("Partial with indentation should inherit functions.", () => {
    const template = "  {{> partial }}";
    const data = {
      toUpperCase: () => (label: string) => label.toUpperCase(),
    };
    const partials = {
      partial: "aA-{{ #toUpperCase }}Input{{ /toUpperCase }}-Aa",
    };
    const expected = "  aA-INPUT-Aa";
    const renderResult = render(template, data, partials);
    expect(renderResult).toBe(expected);
  });

  it("Nested partials should support custom delimiters.", () => {
    const tags: [string, string] = ["[[", "]]"];
    const template = "[[> level1 ]]";
    const partials = {
      level1: "partial 1\n[[> level2]]",
      level2: "partial 2\n[[> level3]]",
      level3: "partial 3\n[[> level4]]",
      level4: "partial 4\n[[> level5]]",
      level5: "partial 5",
    };
    const expected = "partial 1\npartial 2\npartial 3\npartial 4\npartial 5";
    const renderResult = render(template, {}, partials, tags);
    expect(renderResult).toBe(expected);
  });
});
