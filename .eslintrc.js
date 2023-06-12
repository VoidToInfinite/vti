module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    "airbnb",
    "next/core-web-vitals",
    "eslint:recommended",
    "plugin:eslint-plugin/recommended",
    "plugin:react/recommended",
    "plugin:import/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "plugin:prettier/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:@typescript-eslint/strict",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    project: "./tsconfig.json",
    ecmaVersion: "2021",
    ecmaFeatures: {
      impliedStrict: true,
      jsx: true,
    },
    // tsconfigRootDir: ".",
  },
  plugins: ["@typescript-eslint", "import", "jsx-a11y", "prettier"],
  // 0=off, 1=warn, 2=error. Defaults to 0
  rules: {
    "linebreak-style": 0,
    "semi": [2, "always"],
    "quotes": [0, "single"],
    "react/jsx-filename-extension": [
      1,
      {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    ],
    "react-hooks/rules-of-hooks": 2, // Checks rules of Hooks
    "react-hooks/exhaustive-deps": 1, // Checks effect dependencies
    "react/button-has-type": [
      1,
      {
        button: true,
        submit: true,
        reset: true,
      },
    ],
    "react/jsx-no-bind": [
      1,
      {
        ignoreDOMComponents: true,
        ignoreRefs: true,
        allowArrowFunctions: true,
        allowFunctions: true,
        allowBind: true,
      },
    ],
    "react/jsx-uses-react": 1,
    "react/no-array-index-key": 1,
    "react/react-in-jsx-scope": 1,
    "react/require-default-props": [
      1,
      {
        forbidDefaultForRequired: false,
        classes: "defaultProps",
        functions: "defaultProps",
      },
    ],
    "no-unused-expressions": [
      2,
      { allowShortCircuit: true, allowTernary: true, enforceForJSX: true },
    ],
    "no-duplicate-imports": [2, { includeExports: true }],
    "no-unused-private-class-members": 2,
    "react/function-component-definition": [
      2,
      { namedComponents: "arrow-function" },
    ],
    "react/jsx-max-depth": [2, { max: 10 }],
    "react/jsx-max-props-per-line": [2, { maximum: 1, when: "always" }],
    "react/jsx-props-no-spreading": [
      2,
      {
        exceptions: ["Component"],
      },
    ],
    // suggestions rules
    "arrow-body-style": [
      2,
      "as-needed",
      { requireReturnForObjectLiteral: true },
    ],
    "camelcase": [
      2,
      {
        properties: "always",
        ignoreDestructuring: false,
        ignoreImports: true,
        ignoreGlobals: false,
      },
    ],
    "complexity": [2, 15],
    "class-methods-use-this": [
      2,
      {
        enforceForClassFields: false,
      },
    ],
    "default-case": 2,
    "default-case-last": 2,
    "func-names": [2, "as-needed"],
    "max-classes-per-file": [2, { ignoreExpressions: true, max: 1 }],
    "max-depth": [2, 3],
    "max-len": [
      2,
      {
        code: 120,
        comments: 65,
        ignoreComments: true,
        ignoreTrailingComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
        ignorePattern: "^\\s*var\\s.+=\\s*require\\s*\\(",
      },
    ],
    "max-lines": [2, { max: 500, skipBlankLines: true, skipComments: true }],
    "max-lines-per-function": [
      2,
      { max: 100, skipBlankLines: false, skipComments: true },
    ],
    "max-nested-callbacks": [2, 3],
    "max-params": [2, 5],
    "max-statements": [2, { max: 10 }, { ignoreTopLevelFunctions: true }],
    // import plugin
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        ts: "never",
        tsx: "never",
      },
    ],
    "import/no-unresolved": [2, { caseSensitive: false }],
    "import/no-extraneous-dependencies": [
      0,
      {
        devDependencies: true,
        optionalDependencies: false,
        peerDependencies: false,
      },
    ],
    // @types
    // force type definitions, use interfaces instead
    "@typescript-eslint/consistent-type-definitions": ["error"],
    "@typescript-eslint/dot-notation": "error",
  },
  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"],
    },
    "import/resolver": {
      "typescript": true,
      "node": true,
      "styled-components": true,
    },
  },
};
