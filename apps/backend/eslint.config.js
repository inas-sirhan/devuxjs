import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import sonarjs from "eslint-plugin-sonarjs";
import importZod from "eslint-plugin-import-zod";
import unusedImports from "eslint-plugin-unused-imports";
import promise from "eslint-plugin-promise";


export default defineConfig([
    { ignores: ["dist"] },
    {
        files: ["**/*.ts"],
                languageOptions: { globals: globals.browser },
    },
    {
        files: ["**/*.ts"],
        extends: [js.configs.recommended, ...tseslint.configs.recommended], // sonarjs.configs.recommended
        plugins: {
            "@typescript-eslint": tseslint.plugin,
            "import-zod": importZod,
            "unused-imports": unusedImports,
            "promise": promise,
            sonarjs,
        },
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: "./tsconfig.json",
                tsconfigRootDir: import.meta.dirname
            }
        },
        rules: {
            "unused-imports/no-unused-imports": "warn",
            "import-zod/prefer-zod-namespace": "error",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/ban-types": "off",
            "@typescript-eslint/no-empty-object-type": "off",
            "no-restricted-syntax": [
                "error",
                {
                    "selector": "MemberExpression[object.name='req'][property.name='query']",
                    "message": "Use req.parsedQuery instead of req.query"
                }
            ],
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/no-floating-promises": "error",
            "promise/prefer-await-to-then": "error",
            "eqeqeq": ["error", "always"], 
            "no-implicit-coercion": ["error", {
                    "boolean": true, 
                    "number": true, 
                    "string": true, 
                    "disallowTemplateShorthand": true, 
                    "allow": [] 
                }],
            "@typescript-eslint/strict-boolean-expressions": ["error", {
                    "allowString": false, 
                    "allowNumber": false,   
                    "allowNullableObject": false, 
                    "allowNullableBoolean": false, 
                    "allowNullableString": false, 
                    "allowNullableNumber": false, 
                    "allowAny": false, 
                }],
            // "no-negated-condition": "error",
            "no-var": "error",
            "prefer-const": "warn",
            "@typescript-eslint/explicit-member-accessibility": [
                "error",
                {
                    "accessibility": "explicit",
                    "overrides": {
                        // "constructors": "no-public"
                    }
                }
            ],
            "no-unused-expressions": "error",
            "sonarjs/no-ignored-return": "error",
            // "require-await": "warn", //"error"
        }
    },
    {
        files: ["**/*.ts"],
        ignores: ["**/*.test.ts", "**/tests/**"],
        rules: {
            "no-restricted-syntax": [
                "error",
                {
                    "selector": "CallExpression[callee.name=/^(describe|it|test|expect)$/]",
                    "message": "Test functions are only allowed in *.test.ts files or tests/ folders"
                }
            ]
        }
    },
    {
        files: ["**/*.ts"],
        ignores: ["**/*.test.ts", "**/tests/**"],
        rules: {
            "no-restricted-imports": ["error", {
                "patterns": [
                    {
                        "regex": ".*/tests/.*",
                        "message": "Importing from tests folders is not allowed in production code"
                    },
                    {
                        "regex": ".*\\.test$",
                        "message": "Importing from .test files is not allowed in production code"
                    }
                ]
            }]
        }
    },
    {
        files: ["**/*.ts"],
        ignores: [
            "**/packages/shared/src/shared-core/zod/**/*.ts"
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
]);
