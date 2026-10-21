# mathexam 宏包 vendoring 说明

MathExamHub 在仓库内固定（pin）上游 [vanabel/mathexam](https://github.com/vanabel/mathexam) 的 **mathexam v2.3.3**，作为导入/导出 round-trip 与本地 XeLaTeX 编译的对照源。

## 仓库内路径

| 路径 | 用途 |
|------|------|
| `TeX/mathexam.dtx` | 权威源码（docstrip 入口） |
| `TeX/mathexam.sty` | 由 `mathexam.dtx` 生成的宏包（编译/导出打包用） |
| `TeX/VERSION` | 当前 pin 的版本号（单行，如 `2.3.3`） |
| `docs/vendor/mathexam.sty` | 与 `TeX/mathexam.sty` 同步的副本，便于文档引用 |
| `docs/templates/mathexam-import-sample.tex` | LaTeX 导入页示例试卷源码 |
| `frontend/public/downloads/` | 导入页静态下载（**不纳入 Git**）；`scripts/build-mathexam-downloads.mjs` 在 `frontend` **prebuild** 时生成，并随 `dist/` 一并部署 |

**不要**将 Hub 切换到同仓库中的 `mathquiz.sty`（旧版兄弟包）；导入/导出始终以 **mathexam** 为准。

## 从上游刷新

1. 查看上游发布：<https://github.com/vanabel/mathexam/releases>（或 `master` 上 `mathexam.dtx` 版本行）。
2. 下载发布包 `mathexam-vX.Y.Z.zip`，或克隆仓库后 checkout 对应 tag。
3. 覆盖本仓库文件：
   - `mathexam.dtx` → `TeX/mathexam.dtx`
   - `mathexam.sty` → `TeX/mathexam.sty` 与 `docs/vendor/mathexam.sty`
4. 更新 `TeX/VERSION` 为新版 semver。
5. 运行解析器测试并更新 fixture（若上游示例有变）：

   ```bash
   cd backend && npm test
   ```

### 从 dtx 本地生成 sty（可选）

若发布包未附带 `mathexam.sty`，在已安装 TeX Live 的环境：

```bash
cd TeX
xetex mathexam.dtx
# 生成 mathexam.sty 后复制到 docs/vendor/，并重新应用 docs/upstream/mathexam-dtlwrite-guard.patch（若上游尚未内置）
```

## Hub 本地补丁（相对上游 v2.3.3）

- **`\\DTLwrite` 兼容**：`TeX/mathexam.sty` 在 `\\@ifundefined{DTLwrite}` 时跳过期末 CSV/dbtex 导出并给出警告，避免 Ubuntu/旧 TeX Live 上编译失败。建议上游 [vanabel/mathexam](https://github.com/vanabel/mathexam) 合并同等 guard 后，Hub 刷新 pin 时可还原为纯上游 sty。

## 导出试卷编译提示

Hub 导出的 `.tex` 使用 `mathexam` 宏包。导出 ZIP 内会附带 `mathexam.sty`（与 `TeX/` 中 pin 版本一致）。在 ZIP 目录下使用 **XeLaTeX** 编译即可，例如：

```bash
xelatex -shell-escape your-exam.tex
```

TeX Live 版本与 apt 包列表见 [TEXLIVE.md](./TEXLIVE.md)。

试卷卷默认 **不** 带 `showans`；答案卷使用 `\usepackage[showans,...]{mathexam}` 或单独的 `*-answer.tex` 文件。
