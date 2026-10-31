module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/qa/**/*.test.ts'],
  setupFiles: ['<rootDir>/__tests__/setupEnv.js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native-url-polyfill/auto$': '<rootDir>/__tests__/__mocks__/emptyMock.js',
    '^react-native$': '<rootDir>/__tests__/__mocks__/reactNativeMock.js',
    '^expo-secure-store$': '<rootDir>/__tests__/__mocks__/emptyMock.js',
    '^expo-location$': '<rootDir>/__tests__/__mocks__/emptyMock.js',
    '^expo-task-manager$': '<rootDir>/__tests__/__mocks__/emptyMock.js',
  },
};
