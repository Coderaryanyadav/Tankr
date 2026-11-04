module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts', '**/__tests__/**/*.test.ts', '**/qa/**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native-url-polyfill/auto$': '<rootDir>/tests/__mocks__/emptyMock.js',
    '^react-native$': '<rootDir>/tests/__mocks__/reactNativeMock.js',
    '^expo-secure-store$': '<rootDir>/tests/__mocks__/emptyMock.js',
    '^expo-location$': '<rootDir>/tests/__mocks__/emptyMock.js',
    '^expo-task-manager$': '<rootDir>/tests/__mocks__/emptyMock.js',
  },
};
