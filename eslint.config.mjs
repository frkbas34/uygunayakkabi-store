import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const exactJsonParser = {
  meta: { name: "exact-json-parser", version: "1" },
  parseForESLint(text) {
    JSON.parse(text);
    const lines = text.split(/\r?\n/u);
    return {
      ast: {
        type: "Program",
        body: [],
        comments: [],
        tokens: [],
        range: [0, text.length],
        loc: {
          start: { line: 1, column: 0 },
          end: { line: lines.length, column: lines.at(-1)?.length ?? 0 },
        },
        sourceType: "script",
      },
      visitorKeys: { Program: [] },
    };
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "node_modules/**",
    "scripts/**",
    "sessions/**",
    "tmp/**",
    "chatgpt-project-sources/**",
    "project-control/exports/**",
    "next-env.d.ts",
  ]),
  {
    files: ["package.json"],
    languageOptions: { parser: exactJsonParser },
    rules: {},
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "prefer-const": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
