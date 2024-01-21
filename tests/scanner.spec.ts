import { Scanner } from "../src";

describe("A new Mustache.Scanner", () => {
  describe("for an empty string", () => {
    it("is at the end", () => {
      const scanner = new Scanner("");
      expect(scanner.eos()).toBeTruthy();
    });
  });

  describe("for a non-empty string", () => {
    let scanner: Scanner;
    beforeEach(() => {
      scanner = new Scanner("a b c");
    });

    describe("scan", () => {
      describe("when the RegExp matches the entire string", () => {
        it("returns the entire string", () => {
          const match = scanner.scan(/a b c/);
          expect(match).toBe(scanner.text);
          expect(scanner.eos).toBeTruthy();
        });
      });

      describe("when the RegExp matches at index 0", () => {
        it("returns the portion of the string that matched", () => {
          const match = scanner.scan(/a/);
          expect(match).toBe("a");
          expect(scanner.pos).toBe(1);
        });
      });

      describe("when the RegExp matches at some index other than 0", () => {
        it("returns the empty string", () => {
          const match = scanner.scan(/b/);
          expect(match).toBe("");
          expect(scanner.pos).toBe(0);
        });
      });

      describe("when the RegExp does not match", () => {
        it("returns the empty string", () => {
          const match = scanner.scan(/z/);
          expect(match).toBe("");
          expect(scanner.pos).toBe(0);
        });
      });
    }); // scan

    describe("scanUntil", () => {
      describe("when the RegExp matches at index 0", () => {
        it("returns the empty string", () => {
          const match = scanner.scanUntil(/a/);
          expect(match).toBe("");
          expect(scanner.pos).toBe(0);
        });
      });

      describe("when the RegExp matches at some index other than 0", () => {
        it("returns the string up to that index", () => {
          const match = scanner.scanUntil(/b/);
          expect(match).toBe("a ");
          expect(scanner.pos).toBe(2);
        });
      });

      describe("when the RegExp does not match", () => {
        it("returns the entire string", () => {
          const match = scanner.scanUntil(/z/);
          expect(match).toBe(scanner.text);
          expect(scanner.eos()).toBeTruthy();
        });
      });
    }); // scanUntil
  }); // for a non-empty string
});
