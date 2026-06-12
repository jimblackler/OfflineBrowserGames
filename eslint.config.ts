import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import {defineConfig} from 'eslint/config';
import importPlugin from 'eslint-plugin-import-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
    {
        ignores: ['src/client/generated/**', 'src/server/generated/**', 'src/common/generated/**']
    },

    eslint.configs.all,
    ...tseslint.configs.all,
    stylistic.configs.recommended,

    {
        plugins: {
            import: importPlugin
        },
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.es2021,
                ...globals.node
            },
            parserOptions: {
                project: ['./tsconfig.json'],
                tsconfigRootDir: import.meta.dirname
            }
        },
        settings: {
            'import/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                    project: './tsconfig.json'
                },
                node: true
            }
        },

        rules: {
            '@stylistic/arrow-parens': 'off',
            '@stylistic/brace-style': ['warn', '1tbs', {allowSingleLine: true}],
            '@stylistic/comma-dangle': 'off',
            '@stylistic/indent': 'off',
            '@stylistic/indent-binary-ops': 'off',
            '@stylistic/member-delimiter-style': ['warn', {
                multiline: {
                    delimiter: 'semi',
                    requireLast: true
                },
                singleline: {
                    delimiter: 'semi',
                    requireLast: false
                },
                multilineDetection: 'brackets'
            }],
            '@stylistic/multiline-ternary': 'off',
            '@stylistic/no-mixed-operators': 'off',
            '@stylistic/no-multi-spaces': 'off',
            '@stylistic/no-multiple-empty-lines': 'warn',
            '@stylistic/no-trailing-spaces': 'warn',
            '@stylistic/object-curly-newline': ['warn', {
                ImportDeclaration: 'never'
            }],
            '@stylistic/object-curly-spacing': 'off',
            '@stylistic/operator-linebreak': 'off',
            '@stylistic/padded-blocks': 'off',
            '@stylistic/quote-props': ['warn', 'as-needed'],
            '@stylistic/quotes': 'warn',
            '@stylistic/semi': 'off',
            '@stylistic/spaced-comment': 'off',
            '@stylistic/type-annotation-spacing': 'warn',
            '@stylistic/yield-star-spacing': 'warn',
            '@typescript-eslint/ban-tslint-comment': 'off',
            '@typescript-eslint/class-methods-use-this': 'warn',
            '@typescript-eslint/consistent-indexed-object-style': ['warn', 'index-signature'],
            '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
            '@typescript-eslint/consistent-type-imports': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-member-accessibility': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/init-declarations': 'off',
            '@typescript-eslint/max-params': 'off',
            '@typescript-eslint/method-signature-style': 'off',
            '@typescript-eslint/naming-convention': [
                'warn',
                {
                    selector: 'variableLike',
                    format: ['camelCase', 'UPPER_CASE'],
                    leadingUnderscore: 'allow'
                },
                {
                    selector: 'typeLike',
                    format: ['PascalCase']
                },
                {
                    selector: 'enumMember',
                    format: ['UPPER_CASE']
                }
            ],
            '@typescript-eslint/no-base-to-string': 'warn',
            '@typescript-eslint/no-confusing-void-expression': 'off',
            '@typescript-eslint/no-dynamic-delete': 'warn',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-floating-promises': 'warn',
            '@typescript-eslint/no-inferrable-types': 'warn',
            '@typescript-eslint/no-invalid-void-type': 'warn',
            '@typescript-eslint/no-loop-func': 'warn',
            '@typescript-eslint/no-magic-numbers': 'off',
            '@typescript-eslint/no-misused-promises': 'warn',
            '@typescript-eslint/no-shadow': 'off',
            '@typescript-eslint/no-unnecessary-condition': 'warn',
            '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
            '@typescript-eslint/no-unnecessary-type-conversion': 'warn',
            '@typescript-eslint/no-unnecessary-type-parameters': 'warn',
            '@typescript-eslint/no-unsafe-call': 'warn',
            '@typescript-eslint/no-unsafe-type-assertion': 'warn',
            '@typescript-eslint/no-unused-expressions': 'warn',
            '@typescript-eslint/no-use-before-define': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_'
                }
            ],
            '@typescript-eslint/only-throw-error': 'warn',
            '@typescript-eslint/prefer-destructuring': 'warn',
            '@typescript-eslint/prefer-nullish-coalescing': 'warn',
            '@typescript-eslint/prefer-optional-chain': 'warn',
            '@typescript-eslint/prefer-promise-reject-errors': 'warn',
            '@typescript-eslint/prefer-readonly-parameter-types': 'off',
            '@typescript-eslint/promise-function-async': 'off',
            '@typescript-eslint/require-array-sort-compare': 'warn',
            '@typescript-eslint/require-await': 'warn',
            '@typescript-eslint/restrict-template-expressions': 'warn',
            '@typescript-eslint/return-await': 'warn',
            '@typescript-eslint/strict-boolean-expressions': 'off',
            '@typescript-eslint/strict-void-return': 'warn',
            '@typescript-eslint/switch-exhaustiveness-check': 'warn',
            '@typescript-eslint/unbound-method': 'warn',
            '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
            'arrow-body-style': 'warn',
            'arrow-parens': ['warn', 'as-needed'],
            camelcase: 'off',
            'capitalized-comments': 'off',
            complexity: 'off',
            curly: 'warn',
            'dot-location': 'off',
            eqeqeq: 'warn',
            'func-names': 'warn',
            'func-style': 'off',
            'id-length': 'off',
            'import/order': [
                'warn',
                {
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        'parent',
                        ['sibling', 'index']
                    ],
                    'newlines-between': 'never',
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true
                    },
                    warnOnUnassignedImports: true
                }
            ],
            'max-classes-per-file': 'off',
            'max-depth': 'off',
            'max-lines': 'off',
            'max-lines-per-function': 'off',
            'max-statements': 'off',
            'new-cap': 'warn',
            'no-alert': 'off',
            'no-await-in-loop': 'warn',
            'no-bitwise': 'off',
            'no-console': 'off',
            'no-constant-condition': 'warn',
            'no-continue': 'off',
            'no-debugger': 'warn',
            'no-duplicate-imports': 'off',
            'no-else-return': 'warn',
            'no-empty': 'warn',
            'no-eq-null': 'warn',
            'no-inline-comments': 'off',
            'no-lone-blocks': 'warn',
            'no-loss-of-precision': 'warn',
            'no-nested-ternary': 'off',
            'no-new': 'warn',
            'no-param-reassign': 'warn',
            'no-plusplus': 'off',
            'no-return-assign': 'off',
            'no-ternary': 'off',
            'no-trailing-spaces': 'warn',
            'no-undefined': 'off',
            'no-underscore-dangle': 'off',
            'no-unreachable-loop': 'warn',
            'no-warning-comments': 'warn',
            'no-whitespace-before-property': 'warn',
            'nonblock-statement-body-position': 'warn',
            'object-shorthand': 'warn',
            'one-var': 'off',
            'operator-linebreak': 'warn',
            'padded-blocks': 'off',
            'prefer-arrow-callback': 'warn',
            'prefer-const': 'warn',
            'prefer-destructuring': ['warn', {
                VariableDeclarator: {
                    array: true,
                    object: true
                },
                AssignmentExpression: {
                    array: false,
                    object: false
                }
            }, {
                enforceForRenamedProperties: true
            }],
            'prefer-rest-params': 'warn',
            'prefer-template': 'warn',
            'quote-props': 'off',
            radix: 'off',
            'require-atomic-updates': 'warn',
            'require-unicode-regexp': 'warn',
            'sort-imports': 'off',
            'sort-keys': 'off',
            'space-infix-ops': 'warn',
            'spaced-comment': 'warn'
        }
    }
]);
