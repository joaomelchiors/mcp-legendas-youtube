// Configuração do Jest para os testes ponta a ponta com rede (npm run e2e).
// Usa a mesma configuração do npm test, mas roda só test/e2e, incluindo os *.rede.test.ts,
// sem cobertura (o servidor roda num processo à parte, que a cobertura não enxerga).

import base from './jest.config.js';

/** @type {import('jest').Config} */
export default {
  ...base,
  roots: ['<rootDir>/test/e2e'],
  testPathIgnorePatterns: ['/node_modules/'],
  collectCoverage: false,
};
