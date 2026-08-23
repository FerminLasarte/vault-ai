import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist", "src-tauri/target", "src-tauri/gen", "node_modules"],
  },
  js.configs.recommended,
  // Type-aware linting rather than the syntactic-only preset. The rules that
  // matter most here — floating promises, misused promises — cannot be decided
  // without the type checker, and this codebase is full of async mutations.
  //
  // Scoped to TypeScript only: the config files below are plain JS and are not
  // part of any tsconfig, so type-aware rules have nothing to work from there.
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  })),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // A stale dependency array is the classic cause of a screen showing
      // figures that no longer match the database, which for a finance app is
      // the worst possible failure mode. Error, not warning.
      "react-hooks/exhaustive-deps": "error",

      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // react-hook-form keeps its values outside React and pushes updates
      // through a subscription, which is exactly the shape this rule warns
      // about. It is not a mistake here: the library is a deliberate choice and
      // uncontrolled inputs are the reason the forms in this app do not
      // re-render the whole dialog on every keystroke. Nothing actionable is
      // being reported, so the rule is off rather than muted at 30 call sites.
      "react-hooks/incompatible-library": "off",

      // An unawaited mutation reports success before the write has happened.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        // An async function passed to onClick is idiomatic React and safe as
        // long as it handles its own failures; only the *return value* being
        // ignored where a void is expected is worth flagging.
        { checksVoidReturn: { attributes: false } },
      ],

      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // shadcn primitives are generated with their variant definitions exported
  // alongside the component — that is the upstream convention, and rewriting
  // each file to satisfy fast refresh would mean maintaining a fork of code the
  // CLI regenerates.
  {
    files: ["src/components/ui/**"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  // Config files run in Node and sit outside the app's tsconfig.
  {
    files: ["*.config.{js,ts}", "vite.config.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
  // Tests reach for Node built-ins (fs, child_process) and lean on non-null
  // assertions for fixtures, where a wrong assumption fails the test anyway.
  {
    files: ["**/*.test.{ts,tsx}", "src/test/**", "src/db/testing/**"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },
);
