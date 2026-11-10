# 化学绘图软件中文界面补丁（非官方）

给两个免费开源的化学绘图软件加中文界面：

| 软件 | 上游项目 | 许可证 | 补丁内容 |
| --- | --- | --- | --- |
| [Octet Draw](https://github.com/SamChemMan/Octet-Draw) | v1.1.1 | Apache-2.0 | 1400+ 条词条；原生菜单、工具栏、右键菜单、设置、导出对话框 |
| [Reactio Draw](https://github.com/Paivel/reactio-draw) | v1.13 | AGPL-3.0 | 1400+ 条词条；工具栏、菜单、设置面板、分析面板 |

> **这不是上游项目，也没有得到原作者授权或背书。** 本仓库**不包含任何编译产物**，
> 只包含界面翻译词库和把它们应用到上游源码的脚本。原版请到上面的上游仓库下载。

## 为什么是"补丁"而不是"中文版下载"

- 尊重上游：只做界面翻译这一件事，其余代码原样保留，改动范围一目了然；
- 便于跟进上游更新：上游发新版时改一下 `-Tag` 参数重新跑一遍即可；
- 许可上最省事：不重分发二进制，只需随附许可证文本（见 `LICENSES/`）。

## 怎么用

需要：Git、Node.js（两个都要）、Rust + VS 2022 生成工具（Octet 需要）、Go 1.24+（Reactio 需要）。

### Octet Draw

```powershell
cd octet-draw
powershell -ExecutionPolicy Bypass -File build.ps1 -Tag v1.1.1
# 产物: ..\build\Octet-Draw\src-tauri\target\release\octet.exe
```

### Reactio Draw

```powershell
cd reactio-draw
powershell -ExecutionPolicy Bypass -File build.ps1 -Tag v1.13
# 产物: ..\build\ReactioDraw.exe 与 ..\build\reactio.exe
```

也可以只打补丁不编译（已有上游源码目录时）：

```powershell
node octet-draw\apply.mjs   D:\path\to\Octet-Draw
node reactio-draw\apply.mjs D:\path\to\reactio-draw
```

## 补丁做了什么

**Octet Draw**（`octet-draw/apply.mjs`）

1. 生成 `public/zh.js`（词库 + 翻译引擎），并在 `index.html` 里引入；
2. 替换 `src-tauri/src/*.rs` 里菜单、对话框、提示的字符串字面量；
3. 把 Tauri 预定义系统菜单项（关闭/剪切/复制/粘贴/最小化…）换成中文；
4. 把 `src/library.json` 的模板集合名、`src/templates.ts` 的「我的模板」换成中文；
5. 停用自动更新（`update.rs`），避免中文版被官方英文版覆盖。

**Reactio Draw**（`reactio-draw/apply.mjs`）

1. 生成 `windows-app/zh.js`，并在 `main.go` 里内嵌、追加到页面；
2. 停用两个页面里的「检查更新」；
3. 把根目录 `index.html` 复制进 `windows-app/`（桌面版用它内嵌）。

翻译层只在**运行时替换显示文字**，不触碰化学数据、文件格式与程序逻辑；
元素符号、基团缩写、SMILES/InChI、格式名、字体名、快捷键、单位一律保持英文。

## 目录

```
octet-draw/     apply.mjs  build.ps1  dict-octet.json  zh-core.js
reactio-draw/   apply.mjs  build.ps1  dict-reactio.json  zh-core.js
LICENSES/       两个上游项目的许可证与第三方声明
```

## 想改译法 / 补漏译

改 `dict-*.json` 后重新跑 `apply.mjs` 即可，无需改代码。词库格式是 `"英文原文": "中文译文"`，
键必须与界面里实际显示的英文完全一致。

## 许可

- 本补丁对 Octet Draw 的修改：遵循上游 **Apache-2.0**（见 `LICENSES/Octet-Draw-Apache-2.0.txt`）；
- 本补丁对 Reactio Draw 的修改：遵循上游 **AGPL-3.0**（见 `LICENSES/reactio-draw-AGPL-3.0.txt`）；
- 上游代码与资源的版权归各自作者所有（Sam Ellis；Pavel Sakharov 及贡献者）；
- 若你将打过补丁的程序再分发，请遵守对应上游许可证（尤其 AGPL：需同时提供完整源码）。
