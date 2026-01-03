# LaTeX 导入/导出功能说明

## 功能概述

本功能允许您将 LaTeX 格式的试卷文件导入到题库中，也可以将题库中的题目导出为 LaTeX 格式的试卷文件。

## 使用方法

### 导入 LaTeX 文件

1. 在导航栏中点击 **LaTeX 导入/导出** → **导入 LaTeX**
2. 点击上传区域或拖拽 `.tex` 文件到上传区域
3. 可选：填写创建者信息
4. 点击 **开始导入** 按钮
5. 系统会自动解析文件中的题目并导入到数据库

#### 支持的 LaTeX 格式

- 必须使用 `mathexam` 宏包
- 题目必须包含在 `\begin{makepart}{题型}...\end{makepart}` 环境中
- 每个题目必须包含在 `\begin{problem}...\end{problem}` 环境中
- 支持的题型：
  - 填空题：使用 `\fillin{答案}` 或 `\fillout{答案}` 标记答案
  - 选择题：使用 `\begin{abcd}...\end{abcd}` 环境包含选项，使用 `\pickout{答案}` 标记答案
  - 计算题、解答题、证明题：使用 `\begin{solution}...\end{solution}` 环境包含解答

#### 示例文件格式

```latex
\documentclass[]{article}
\usepackage[nospace]{mathexam}
\course{高等代数}
% ... 其他设置 ...

\begin{document}
\makehead
\begin{makepart}{填空题}[3]
  \begin{problem}
    题目内容 \fillin{答案}.
  \end{problem}
\end{makepart}
\end{document}
```

#### 在 LaTeX 中添加图片

1. **在 LaTeX 文件中引用图片**：
   - 使用 `\includegraphics{图片名}` 命令
   - 图片名可以带扩展名（如 `fig1.pdf`）或不带扩展名（如 `fig1`）
   - 推荐使用 `fig1`, `fig2`, `fig3` 等命名方式

2. **上传图片文件**：
   - 在上传 `.tex` 文件时，同时上传对应的图片文件
   - 图片文件名必须与 LaTeX 中引用的名称匹配
   - 支持的图片格式：`.png`, `.jpg`, `.jpeg`, `.gif`, `.pdf`

3. **图片命名规则**：
   - **方式一（推荐）**：使用 `fig1`, `fig2`, `fig3` 等命名
     - LaTeX 中：`\includegraphics{fig1}`
     - 上传文件：`fig1.pdf` 或 `fig1.png`
   - **方式二**：使用自定义名称
     - LaTeX 中：`\includegraphics{myimage}`
     - 上传文件：`myimage.png` 或 `myimage.pdf`

4. **图片引用示例**：

```latex
\begin{problem}
  计算下列函数的导数：
  \begin{center}
    \includegraphics{fig1}
  \end{center}
  答案：\fillin{x^2}.
\end{problem}
```

或者使用 `figure` 环境（支持 `\label` 和 `\ref`）：

```latex
\begin{problem}
  如图 \ref{fig:1} 所示，计算...
  \begin{figure}[htpb]
    \centering
    \includegraphics{fig1}
    \caption{函数图像}
    \label{fig:1}
  \end{figure}
  答案：\fillin{42}.
\end{problem}
```

5. **注意事项**：
   - 图片文件名（不含扩展名）必须与 LaTeX 中 `\includegraphics{}` 中的名称完全匹配
   - 系统会自动为图片添加前缀（基于 `.tex` 文件名），但你在 LaTeX 中仍使用原始名称
   - 如果上传了图片但 LaTeX 中没有引用，图片会被忽略
   - 如果 LaTeX 中引用了图片但未上传对应文件，系统会尝试使用默认扩展名（`.pdf`）查找

### 导出 LaTeX 文件

1. 在导航栏中点击 **LaTeX 导入/导出** → **导出 LaTeX**
2. 使用筛选条件查找要导出的题目
3. 勾选要导出的题目（可全选/取消全选）
4. 填写导出配置信息（学校、课程、试卷类型等）
5. 点击 **导出 LaTeX 文件** 按钮
6. 系统会生成 `.tex` 文件并自动下载

#### 导出配置说明

- **文件名**：导出的 LaTeX 文件名
- **学校**：试卷头部显示的学校名称
- **学院**：试卷头部显示的学院名称
- **课程**：试卷课程名称
- **试卷类型**：A 卷或 B 卷
- **考试时间**：考试时长（分钟）
- **开闭卷**：开卷或闭卷

## 技术实现

### 后端 API

- `POST /questions/import/latex` - 导入 LaTeX 文件
- `POST /questions/export/latex` - 导出 LaTeX 文件

### 文件结构

- `backend/utils/latexParser.js` - LaTeX 解析器和生成器
- `backend/routes/questions.js` - 导入/导出路由
- `frontend/src/components/LatexImport.vue` - 导入组件
- `frontend/src/components/LatexExport.vue` - 导出组件

## 注意事项

1. 导入时，系统会自动从 `\course{}` 命令中提取科目信息
2. 如果题目中没有指定分值，默认值为 0
3. 导出的文件可以直接使用 XeLaTeX 编译
4. 上传的文件大小限制为 10MB
5. 临时上传文件会自动清理

## 故障排除

### 导入失败

- 检查文件格式是否正确
- 确保使用了 `mathexam` 宏包
- 检查题目是否包含在正确的环境中

### 导出失败

- 确保至少选择了一道题目
- 检查题目数据是否完整

## 更新日志

- v1.0.0 (2024) - 初始版本，支持基本的导入/导出功能

