import * as path from "node:path";
import * as fs from "node:fs";

const _files = path.join(__dirname, "_files");

function getContents(testName: string, ext: string): string {
  return fs.readFileSync(path.join(_files, testName + "." + ext), "utf8");
}

function getView(testName: string): string {
  let view = getContents(testName, "js");
  if (!view) view = getContents(testName, "cjs");
  if (!view) throw new Error('Cannot find view for test "' + testName + '"');
  return view;
}

function getPartial(testName: string): string | null {
  try {
    return getContents(testName, "partial");
  } catch (e) {
    return null;
  }
}

// You can put the name of a specific test to run in the TEST environment
// variable (e.g. TEST=backslashes mocha test/render-test.js)
const testToRun = process.env.TEST;

let testNames: string[];
if (testToRun) {
  testNames = testToRun.split(",");
} else {
  testNames = fs
    .readdirSync(_files)
    .filter(function (file: string) {
      return /\.c?js$/.test(file);
    })
    .map(function (file: string) {
      return path.basename(file).replace(/\.c?js$/, "");
    });
}

function getTest(testName: string) {
  return {
    name: testName,
    view: getView(testName),
    template: getContents(testName, "mustache"),
    partial: getPartial(testName),
    expect: getContents(testName, "txt"),
  };
}

export function getTests() {
  return testNames.map(getTest);
}
