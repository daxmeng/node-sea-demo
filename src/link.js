const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

// 获取当前执行文件的绝对路径（Sea 字节码场景下可能需要调整）
// const execPath = process.argv[0]; // 或 __dirname（需根据打包方式调整）
// const execDir = path.dirname(execPath);
// // 切换工作目录
// process.chdir(execDir);

/**
 * 处理视频 URL，解析为四个部分
 * @param {string} handleUrl 原始 URL
 * @returns {Array} [posterUrl, hls, mp4, iframeUrl]
 */
function parseVideoUrl(handleUrl) {
  const { origin, pathname, searchParams } = new URL(handleUrl);
  const posterUrl = origin + pathname;
  const iframeUrl = `https://iframe.videodelivery.net/${searchParams.get(
    "vID"
  )}`;
  const hls = searchParams.get("hls");
  const mp4 = searchParams.get("mp4");
  return [posterUrl, hls, mp4, iframeUrl];
}

/**
 * 查找目录下以特定前缀开头的 Excel 文件
 * @param {string} directory 目录路径
 * @param {string} prefix 文件名前缀
 * @returns {string} 找到的文件路径，如果没找到则返回 null
 */
function findExcelFileWithPrefix(directory, prefix) {
  try {
    const files = fs.readdirSync(directory);
    // 筛选出以指定前缀开头的 Excel 文件
    const excelFiles = files.filter(
      (file) =>
        file.startsWith(prefix) &&
        (file.endsWith(".xlsx") || file.endsWith(".xls"))
    );

    if (excelFiles.length === 0) {
      return null;
    }

    // 如果有多个匹配的文件，返回最新的一个
    if (excelFiles.length > 1) {
      console.log(`找到多个匹配的文件: ${excelFiles.join(", ")}`);
      console.log("将使用第一个文件进行处理");
    }

    return path.join(directory, excelFiles[0]);
  } catch (error) {
    console.error(`查找文件时出错: ${error.message}`);
    return null;
  }
}

/**
 * 从 Excel 文件读取数据
 * @param {string} filePath Excel 文件路径
 * @returns {Array} 数据数组
 */
function readExcelFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    // 读取 Excel 文件
    const workbook = XLSX.read(fs.readFileSync(filePath), { type: "buffer" });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 将工作表转换为 JSON 数据
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      throw new Error("Excel 文件中没有数据");
    }

    console.log(`成功读取 ${data.length} 条记录`);
    return data;
  } catch (error) {
    console.error("读取 Excel 文件时出错:", error);
    throw error;
  }
}

/**
 * 按 filename 的前两个字节字母序排序
 * @param {Array} data 数据数组
 * @returns {Array} 排序后的数据数组
 */
function sortByFilenamePrefix(data) {
  return data.sort((a, b) => {
    const prefixA =
      a.filename && a.filename.length >= 2
        ? a.filename.substring(0, 2).toLowerCase()
        : "";
    const prefixB =
      b.filename && b.filename.length >= 2
        ? b.filename.substring(0, 2).toLowerCase()
        : "";
    return prefixA.localeCompare(prefixB);
  });
}

/**
 * 处理数据并保存到新的 Excel 文件
 * @param {Array} data 原始数据
 * @param {string} outputPath 输出文件路径
 */
function processAndSaveData(data, outputPath) {
  try {
    // 创建输出数据结构
    const processedData = data.map((row) => {
      // 检查 url 字段是否存在
      if (!row.url) {
        return {
          filename: row.filename || "unknown",
          posterUrl: "",
          hlsUrl: "",
          mp4Url: "",
          iframeUrl: "",
          originalUrl: "",
        };
      }

      try {
        // 使用 parseVideoUrl 函数解析 URL
        const [posterUrl, hls, mp4, iframeUrl] = parseVideoUrl(row.url);

        return {
          filename: row.filename || "unknown",
          posterUrl: posterUrl || "",
          hlsUrl: hls || "",
          mp4Url: mp4 || "",
          iframeUrl: iframeUrl || "",
          originalUrl: row.url,
        };
      } catch (error) {
        console.warn(`无法解析 URL: ${row.url}, 错误: ${error.message}`);
        return {
          filename: row.filename || "unknown",
          posterUrl: "",
          hlsUrl: "",
          mp4Url: "",
          iframeUrl: "",
          originalUrl: row.url || "",
        };
      }
    });

    // 创建工作簿和工作表
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(processedData);

    // 设置列宽
    const columnWidths = [
      { wch: 40 }, // filename
      { wch: 60 }, // posterUrl
      { wch: 60 }, // hlsUrl
      { wch: 60 }, // mp4Url
      { wch: 60 }, // iframeUrl
      { wch: 60 }, // originalUrl
    ];

    worksheet["!cols"] = columnWidths;

    // 将工作表添加到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, "ProcessedVideos");

    // 生成 Buffer 并写入文件
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });
    fs.writeFileSync(outputPath, excelBuffer);
    console.log(`数据已处理完成并保存到: ${outputPath}`);

    return processedData;
  } catch (error) {
    console.error("处理数据时出错:", error);
    throw error;
  }
}

/**
 * 主函数
 */
function processLinks() {
  try {
    // 定义文件路径
    const currentDir = __dirname; //execDir;

    // 查找以 files_ 开头的 Excel 文件
    const inputFilePath = findExcelFileWithPrefix(currentDir, "files_");

    if (!inputFilePath) {
      throw new Error("未找到以 files_ 开头的 Excel 文件");
    }

    // 生成输出文件路径，在原文件名前面加上 "res" 前缀
    const inputFileName = path.basename(inputFilePath);
    const outputFileName = `res_${inputFileName}`;
    const outputFilePath = path.join(currentDir, outputFileName);

    console.log(`找到输入文件: ${inputFilePath}`);
    console.log(`输出文件将保存为: ${outputFilePath}`);

    // 读取 Excel 文件
    const data = readExcelFile(inputFilePath);

    // 按 filename 前两个字节排序
    console.log("按文件名前缀排序...");
    const sortedData = sortByFilenamePrefix(data);

    // 处理并保存数据
    console.log("处理 URL 并保存到新文件...");
    processAndSaveData(sortedData, outputFilePath);

    console.log("处理完成!");
  } catch (error) {
    console.error("执行过程中出错:", error);
  }
}

// 导出函数，允许作为模块使用
module.exports = processLinks;

// 如果直接运行此文件，则执行 processLinks 函数
if (require.main === module) {
  processLinks();
}
