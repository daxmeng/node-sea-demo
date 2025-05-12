const path = require("path");
module.exports = {
  entry: "./src/link.js", // 入口文件
  output: {
    filename: "bundle.js", // 输出文件名
    path: path.resolve(__dirname, "dist"), // 输出目录
  },
  target: "node", // 指定打包目标为 Node.js
  externals: [], // 排除外部依赖（见下文）
  node: {
    __dirname: false, // 保留原始 __dirname 行为
    __filename: false, // 保留原始 __filename 行为
  },
};
