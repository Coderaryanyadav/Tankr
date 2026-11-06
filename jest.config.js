module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 15000,
  testMatch: ['**/qa/**/*.test.ts', '**/tests/**/*.test.ts', '**/__tests__/**/*.test.ts'],
  setupFiles: ['<rootDir>/qa/unit-tests/setupEnv.js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native-url-polyfill/auto$': '<rootDir>/qa/unit-tests/__mocks__/emptyMock.js',
    '^react-native$': '<rootDir>/qa/unit-tests/__mocks__/reactNativeMock.js',
    '^expo-secure-store$': '<rootDir>/qa/unit-tests/__mocks__/emptyMock.js',
    '^expo-location$': '<rootDir>/qa/unit-tests/__mocks__/emptyMock.js',
    '^expo-task-manager$': '<rootDir>/qa/unit-tests/__mocks__/emptyMock.js',
  },
};
