import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'plugin:prettier/recommended'),
  {
    ignores: [
      'static/',
      'dist/',
      'build/',
      'out/',
      '.next/',
      'node_modules/',
      '*.tsbuildinfo',
      'dependency-graph.html',
      '.nx/',
    ],
  },
  {
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
];

export default eslintConfig;
