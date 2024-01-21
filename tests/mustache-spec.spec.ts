import { clearCache, render } from "../src";
import { statSync, readdirSync, readFileSync } from "fs";
import { join, basename } from "path";

const specsDir = join(__dirname, "spec/specs");

// skip tests that are not supported by mustache.js
const skipTests: Record<string, string[]> = {
  "~dynamic-names": [],
  "~inheritance": [],
  "~lambdas": [
    "Interpolation",
    "Interpolation - Expansion",
    "Interpolation - Alternate Delimiters",
    "Interpolation - Multiple Calls",
    "Escaping",
    "Section - Expansion",
    "Section - Alternate Delimiters",
  ],
  interpolation: ["Dotted Names - Context Precedence"],
};

// Mustache should work on node 0.6 that doesn't have fs.existsSync
function existsDir(path: string) {
  try {
    return statSync(path).isDirectory();
  } catch (x) {
    return false;
  }
}

function getSpecs(specArea: string) {
  return JSON.parse(
    readFileSync(join(specsDir, specArea + "." + "json"), "utf8"),
  );
}

describe("Mustache spec compliance", () => {
  let specFiles: string[] = [];

  if (existsDir(specsDir)) {
    specFiles = readdirSync(specsDir)
      .filter((file) => {
        return /\.json$/.test(file);
      })
      .map((file) => {
        return basename(file).replace(/\.json$/, "");
      })
      .sort();
  } else {
    specFiles = [];
  }

  beforeEach(() => {
    clearCache();
  });

  describe.each(
    specFiles.filter((specArea) => {
      if (skipTests[specArea] === undefined) return true;
      if (skipTests[specArea].length === 0) return false;
    }),
  )("- %s:", (specArea) => {
    const specs = getSpecs(specArea);
    it.each(
      (specs.tests as any[]).filter((test) => {
        const skipTargets = (skipTests as Record<string, any[]>)[specArea];
        if (skipTargets === undefined) return true;
        if (skipTargets.includes(test.name)) return false;
      }),
    )("$name - $desc", (test: any) => {
      if (test.data.lambda && test.data.lambda.__tag__ === "code")
        test.data.lambda = eval(
          "(function() { return " + test.data.lambda.js + "; })",
        );
      const output = render(test.template, test.data, test.partials);
      expect(output).toBe(test.expected);
    });
  });
});
