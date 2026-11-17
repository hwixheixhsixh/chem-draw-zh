# 中文显示与输入补丁（Octet Draw）

针对国际开源化学绘图软件 [Octet Draw](https://github.com/SamChemMan/Octet-Draw) 的**中文场景缺陷**修复。
不是界面翻译（那在 [chem-draw-zh](https://github.com/hwixheixhsixh/chem-draw-zh)），而是**让中文真的能用**。

## 四类问题与修复

| # | 问题 | 位置 | 现象 |
| --- | --- | --- | --- |
| 1 | 中文宽度按 0.556 em 计（应 1 em） | `src/arial.ts` | CDXML 导出文本框偏窄 44%，居中和右对齐错位 |
| 2 | 换行只认空格 | `src/richtext.ts` `wrap()` | 中文长句**永不换行**，图注溢出 |
| 3 | 字体回退链全是西文 | `src/docstyle.ts` `fontStack()` | 汉字由系统随意挑字体，中英字形/字重不一致 |
| 4 | 输入法合成期未拦截 | `src/RichBox.tsx`、`src/Editor.tsx` | 拼音选字时按 Enter/Esc 会提交未完成的标签 |

## 第五项：中文俗名 → 结构（功能补齐）

上游的名称解析只走 OPSIN，**只认英文系统名**。中文俗名（阿司匹林、布洛芬、冰片、樟脑、咖啡因）一个都读不出来，
而学生实验报告里写的正是中文名。

本补丁新增 `src/cn-names.ts`（内置离线表，**265 条**），并接入两条路径：

- `names.ts` 的 `nameToSmiles()`：在 OPSIN 之前查中文表 → 命中即返回 SMILES，**离线可用、零延迟**；
- `namesStarting()`：输入「阿司」给出「阿司匹林」，输入「苯」给出「苯酚、苯甲酸」。

**实测**（直接跑源码 `nameToSmiles`，未加载 OPSIN）：265/265 全量解析通过。

```
✓ 阿司匹林  CC(=O)OC1=CC=CC=C1C(=O)O
✓ 布洛芬   CC(C)CC1=CC=C(C=C1)C(C)C(=O)O
✓ 紫杉醇   CC1=C2C(C(=O)C3(...)C)OC(=O)C
命中 12/12
建议「阿司」→ ["阿司匹林"]    建议「苯」→ ["苯酚","苯甲酸"]
```

**数据可靠性**：41 条 SMILES 全部来自 Wikidata 化合物条目（P233），并逐条经 Indigo 解析、
核对分子式（`src/cn-names.check.ts`）。首版手写时有 6 条错误（吗啡、紫杉醇、阿莫西林、阿托伐他汀、
士的宁、安乃近），已全部改用 Wikidata 数据修正——**这类表必须校验，错一条就是画错分子**。

扩充方式：往 `cn-names.ts` 加条目，再跑 `cn-names.check.ts` 校验。

## 实测数据

**修复 1（宽度）**：`size = 10pt`

| 文本 | 修复前 | 修复后 | 变化 |
| --- | --- | --- | --- |
| 催化循环 | 22.24 pt | 40.00 pt | **+79.9%** |
| 过渡态能垒 | 27.80 pt | 50.00 pt | **+79.9%** |
| Catalytic cycle | 63.90 pt | 63.90 pt | 0%（拉丁文本不受影响）|

**修复 2（换行）**：`wrap()` 的断行判断由 `if (text[i] !== " ") continue;` 改为同时接受 CJK 字符。

**修复 3（字体）**：`fontStack()` 在每条回退链末尾加入
`Microsoft YaHei, PingFang SC, Noto Sans CJK SC, Source Han Sans SC, SimHei, DengXian`（衬线族用宋体系）。

**修复 4（IME）**：在 `onKeyDown` 最前加入

```ts
if (e.nativeEvent.isComposing || (e.nativeEvent as KeyboardEvent).keyCode === 229) return;
```

（`keyCode === 229` 兼容旧版 WebView2 在合成期只报 229 的行为。）

## 已验证

- `tsc --noEmit` 通过；
- 用项目自身的 `usvg + resvg` 依赖跑通诊断程序（`examples/cjk_probe.rs`），确认中文在导出链路里**能正常渲染**（并非丢字）；
- 修复后在画布上输入「催化循环与过渡态 85 °C」显示正常，字形统一；
- PNG/PDF 导出链路在中文场景下无缺字。

## 用法

```powershell
# 在已取到的上游源码目录上打补丁（可重复执行，幂等）
node apply-cjk.mjs      D:\path\to\Octet-Draw   # 宽度 + 字体
node apply-cjk-wrap.mjs D:\path\to\Octet-Draw   # 换行
node apply-cjk-ime.mjs  D:\path\to\Octet-Draw   # 输入法
node apply-cn-names.mjs D:\path\to\Octet-Draw   # 中文俗名 → 结构
```

然后照常 `npm install && npm run tauri build -- --no-bundle`。

## 已知局限

- 字体回退用的是**系统字体名**，不打包字体文件（思源黑体全量 10 MB+）。macOS 上会把 `Microsoft YaHei`
  落到 `PingFang SC`，Linux 落到 `Noto Sans CJK SC`，都已在回退链里。
- 避头尾（标点不出现在行首）只做了最小处理：CJK 断点包含全角标点，未做完整的禁则排版。
- IME 修复只覆盖标签框与图注框；表格单元格等其他输入点若发现同类问题，按同样方式补 `isComposing` 守卫。

## 许可

针对上游 Apache-2.0 项目的修改，遵循 Apache-2.0（见 `LICENSES/`）。
上游版权归 Sam Ellis 及贡献者所有。
