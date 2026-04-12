import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/coverage/**",
      "**/dist/**",
      "**/node_modules/**",
      ".repo-cache/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  {
    files: ["**/*.{tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  }
];
