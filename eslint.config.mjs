import { defineConfig, globalIgnores } from "eslint/config";
import json from "@eslint/json";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
    files: ["package.json", "package-lock.json"],
    plugins: { json },
    language: "json/json",
    rules: { "json/no-duplicate-keys": "error" },
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
