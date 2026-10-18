// Component tests (npm run test:ui). Domain tests use jest.config.js (npm test).
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.ui.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.ui.setup.js'],
  moduleNameMapper: {
    '^react-native/Libraries/BatchedBridge/NativeModules$': '<rootDir>/test-support/nativeModulesShim.js',
  },
};
