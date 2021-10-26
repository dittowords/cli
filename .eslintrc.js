module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2020: true,
    "jest/globals": true,
  },
  extends: ["airbnb-base"],
  parserOptions: {
    ecmaVersion: 11,
  },
  plugins: ["jest"],
  rules: {
    "no-console": "off",
    "no-underscore-dangle": ["error", { allow: ["_id", "__get__"] }],
  },
};
