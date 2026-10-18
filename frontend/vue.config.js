const { defineConfig } = require("@vue/cli-service");

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    historyApiFallback: {
      index: "/index.html",
      disableDotRule: true,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
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
