module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: ["plugin:vue/essential", "eslint:recommended"],
  rules: {
    // 自定义规则
  },
  parserOptions: {
    parser: "babel-eslint",
  },
  globals: {
    axios: "writable",
  },
};
