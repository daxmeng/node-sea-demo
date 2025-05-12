#!/bin/bash
set -e

# 设置默认的应用名称
APP_NAME=${1:-"handleLink"}

# 1. 使用 Rollup 打包项目
echo "Step 1/5: 打包项目..."
npx webpack --config webpack.config.js

# 2. 生成 SEA 配置文件
echo "Step 2/5: 生成 SEA blob"
node --experimental-sea-config sea-config.json

# 3. 移除现有签名
echo "Step 3/5: 移除旧签名..."
cp ~/.volta/tools/image/node/22.14.0/bin/node dist/$APP_NAME
codesign --remove-signature dist/$APP_NAME

# 4. 注入 SEA blob 到可执行文件
echo "Step 4/5: 注入 SEA blob..."
npx postject dist/$APP_NAME NODE_SEA_BLOB dist/sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
  --macho-segment-name NODE_SEA

# 5. 重新签名应用
echo "Step 5/5: 重新签名..."
codesign --sign - dist/$APP_NAME

echo "✅ 构建完成！可执行文件：dist/$APP_NAME"
