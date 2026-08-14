/* eslint-disable */
export default {
  displayName: 'shared-utils',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../coverage/libs/shared/utils',
  testMatch: ['<rootDir>/src/**/*.(test|spec).{js,ts}'],
};
