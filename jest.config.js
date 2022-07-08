/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  bail: 1,
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  roots: [
    '<rootDir>'
  ],
  moduleNameMapper: {
    '@app/(.*)': '<rootDir>/src/$1',
    '@utils/(.*)': ['<rootDir>/src/utils/$1'],
    '@versions/(.*)': ['<rootDir>/src/versions/$1']
  }
}
