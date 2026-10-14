const { defineConfig } = require("@vue/cli-service");

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    historyApiFallback: {
      index: "/index.html",
      disableDotRule: true,
    },
  },
  pages: {
    index: {
      // entry for the page
      entry: "src/main.js",
      title: "MathExam",
    },
  },
});
