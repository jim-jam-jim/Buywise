import next from 'eslint-config-next/core-web-vitals';
import ts from 'eslint-config-next/typescript';
const config = [
  ...next,
  ...ts,
  {
    ignores: ['.next/**', '.local/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**'],
  },
];

export default config;
