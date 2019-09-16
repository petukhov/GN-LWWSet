module.exports = {
  "roots": [
    "<rootDir>/src/tests"
  ],
  "transform": {
    "^.+\\.tsx?$": "ts-jest"
  },
  preset: 'ts-jest',
  testEnvironment: 'node',
}