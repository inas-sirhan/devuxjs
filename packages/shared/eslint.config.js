import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import importZod from "eslint-plugin-import-zod";
import unusedImports from "eslint-plugin-unused-imports";
import sonarjs from "eslint-plugin-sonarjs";

export default tseslint.config(
  {
    files: ["**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended], // sonarjs.configs.recommended
    plugins: {
      "import-zod": importZod,
      "unused-imports": unusedImports,
      sonarjs
    },
    languageOptions: {
      globals: globals.node,
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "import-zod/prefer-zod-namespace": "error",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
      "sonarjs/no-ignored-return": "error"
    }
  },
  // Ban z.object(), z.passthrough(), z.strip() outside of shared-core zod utility files
  {
    files: ["**/*.ts"],
    ignores: [
      "**/src/shared-core/zod/**/*.ts"
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          "selector": "CallExpression[callee.object.name='z'][callee.property.name='object']",
          "message": "Direct use of z.object() is not allowed. Use createZodObject() from @packages/shared-core/zod/shared.core.zod.utils instead."
        },
        {
          "selector": "MemberExpression[object.type='CallExpression'][property.name='passthrough']",
          "message": "Use of .passthrough() is not allowed. Schemas should use .strict() via createZodObject() instead."
        },
        {
          "selector": "MemberExpression[object.type='CallExpression'][property.name='strip']",
          "message": "Use of .strip() is not allowed. Schemas should use .strict() via createZodObject() instead."
        },
        {
          "selector": "MemberExpression[object.type='CallExpression'][property.name='pick']",
          "message": "Use of .pick() is not allowed. Use zodStrictPick() from @packages/shared-core/zod/shared.core.zod.utils instead."
        },
        {
          "selector": "MemberExpression[object.type='CallExpression'][property.name='omit']",
          "message": "Use of .omit() is not allowed. Use zodStrictOmit() from @packages/shared-core/zod/shared.core.zod.utils instead."
        }
      ]
    }
  }
);
