/**
 * ESLint configuration for the project.
 * 
 * See https://eslint.style and https://typescript-eslint.io for additional linting options.
 */
// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default tseslint.config(
	{
		ignores: [
			'**/.vscode-test',
			'**/out',
		]
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	...tseslint.configs.stylistic,
	prettier, // Disable conflicting ESLint rules
	{
		plugins: {
			prettier: prettierPlugin // Enable Prettier plugin
		},
		rules: {
			'prettier/prettier': 'error', // Treat Prettier issues as ESLint errors
			'curly': 'warn',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/naming-convention': [
				'warn',
				{
					'selector': 'import',
					'format': ['camelCase', 'PascalCase']
				}
			],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					'argsIgnorePattern': '^_', // Allow unused variables with a prefix '_'
					'varsIgnorePattern': '^_'  // Allow unused vars with a prefix '_'
				}
			],
			'@typescript-eslint/no-explicit-any': 'off' // Allow 'any' type
		}
	}
);