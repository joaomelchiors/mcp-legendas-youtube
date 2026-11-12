// Configuração do Jest.
// O TypeScript dos testes é convertido pelo SWC (@swc/jest), porque o ts-jest não suporta o TypeScript 7.
// O SWC só remove os tipos; a checagem de tipos continua sendo feita pelo `npm run build` (tsc).

/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  // Os testes com rede (*.rede.test.ts) ficam fora do npm test: rodam só com npm run e2e (jest.e2e.config.js).
  testPathIgnorePatterns: ['/node_modules/', '\\.rede\\.test\\.ts$'],
  transform: {
    '^.+\\.ts$': [
      '@swc/jest',
      {
        jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
        module: { type: 'commonjs' },
      },
    ],
  },
  // O código usa imports com extensão .js (exigência do ESM no Node); no teste eles apontam para o .ts.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  // Cobertura: todo o src, menos os três pontos de entrada, que só ligam as peças e não têm lógica própria:
  // index.ts (o servidor, exercitado pelo teste e2e test/e2e/stdio.e2e.test.ts, que roda o dist/ num processo à parte), canary.ts (o canário, exercitado pelo npm run canario)
  // e install.ts (o instalador, exercitado pelo npm run instalar).
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/canary.ts', '!src/install.ts'],
  coverageReporters: ['text', 'lcov'],
  clearMocks: true,
  restoreMocks: true,
  collectCoverage: true,
};
