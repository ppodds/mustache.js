import { Context, View, ViewObject } from "../src";

describe("A new Mustache.Context", () => {
  let context: Context;
  beforeEach(() => {
    context = new Context({ name: "parent", message: "hi", a: { b: "b" } });
  });

  it("is able to lookup properties of its own view", () => {
    expect(context.lookup("name")).toBe("parent");
  });

  it("is able to lookup nested properties of its own view", () => {
    expect(context.lookup("a.b")).toBe("b");
  });

  describe("when pushed", () => {
    beforeEach(() => {
      context = context.push({ name: "child", c: { d: "d" } });
    });

    it("returns the child context", () => {
      expect((context.view as ViewObject).name).toBe("child");
      expect((context.parent?.view as ViewObject).name).toBe("parent");
    });

    it("is able to lookup properties of its own view", () => {
      expect(context.lookup("name")).toBe("child");
    });

    it("is able to lookup properties of the parent context's view", () => {
      expect(context.lookup("message")).toBe("hi");
    });

    it("is able to lookup nested properties of its own view", () => {
      expect(context.lookup("c.d")).toBe("d");
    });

    it("is able to lookup nested properties of its parent view", () => {
      expect(context.lookup("a.b")).toBe("b");
    });
  });
});
