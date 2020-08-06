module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testRegex: "/tests/.*\\.ts$",
  moduleNameMapper: {
    "#/(.*)$": "<rootDir>/src/$1"
  }
};
