// 中文俗名 → 结构：接入 Octet 的名称解析链
// 用法: node apply-cn-names.mjs <上游仓库目录>
// 做法：
//   1) 复制 cn-names.ts（内置中文名表）
//   2) names.ts 的 nameToSmiles() 在 OPSIN 之前查中文表
//   3) 中文名同时进入搜索建议（namesStarting）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = process.argv[2];
const here = path.dirname(fileURLToPath(import.meta.url));
if (!dir) { console.error('用法: node apply-cn-names.mjs <上游仓库目录>'); process.exit(1); }
const rel = p => path.join(dir, p);
const MARK = '// [cn-names-patch]';
let n = 0;

// ---------- 1) 内置中文名表 ----------
{
  const src = fs.readFileSync(path.join(here, 'cn-names.ts'), 'utf8');
  fs.writeFileSync(rel('src/cn-names.ts'), src, 'utf8');
  console.log('[1/3] src/cn-names.ts 已就位');
}

// ---------- 2) nameToSmiles 接入 ----------
{
  const p = rel('src/names.ts');
  let t = fs.readFileSync(p, 'utf8');
  if (t.includes('CN_NAMES')) { console.log('[2/3] names.ts 已接入，跳过'); }
  else {
    // import
    const importAnchor = 'import { COMMON, commonKey } from "./common.ts";';
    if (!t.includes(importAnchor)) { console.error('!! 找不到 import 锚点'); process.exit(1); }
    t = t.replace(importAnchor, importAnchor + '\n' + `${MARK} 中文俗名表（离线）：阿司匹林、布洛芬、咖啡因… 由 Wikidata 生成并校验。\nimport { CN_NAMES } from "./cn-names.ts";`);

    // 在 nameToSmiles 的自有词典之后、OPSIN 之前插入
    const old = `  // "rna: AACGUU" and "dna: ATGC" are built as SMILES, without OPSIN.`;
    const neu = `  ${MARK} 中文俗名先查内置表：中文名 OPSIN 读不了（它只认英文系统名）。
  // 放在核酸/肽链之前：中文名不会与这些前缀冲突，且离线可用、无需联网。
  const cn = cnNameSmiles(s);
  if (cn) return cn;
  // "rna: AACGUU" and "dna: ATGC" are built as SMILES, without OPSIN.`;
    if (!t.includes(old)) { console.error('!! 找不到 nameToSmiles 插入点'); process.exit(1); }
    t = t.replace(old, neu);

    // 追加辅助函数（放在 nameToSmiles 之后）
    const helper = `
${MARK} 中文名查表。键已做全角/异体字归一，见 cnNameKey。
function cnNameSmiles(s: string): string | undefined {
  return CN_NAMES[s] ?? CN_NAMES[cnNameKey(s)] ?? undefined;
}
// 归一化：去空白、全角转半角、去掉「（）」等标点，便于用户随手输入。
export function cnNameKey(s: string): string {
  return s
    .replace(/[\\u3000\\s]+/g, "")
    .replace(/[\\uFF01-\\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[（(]/g, "").replace(/[）)]/g, "")
    .replace(/[，,、]/g, "")
    .trim();
}
// 以中文名开头的建议（给搜索框用）。
export function cnNamesStarting(typed: string, most = 8): string[] {
  const k = cnNameKey(typed);
  if (!k || !/[\\u4e00-\\u9fff]/.test(k)) return [];
  return Object.keys(CN_NAMES).filter((name) => cnNameKey(name).startsWith(k)).sort((a, b) => a.length - b.length).slice(0, most);
}
`;
    t = t.replace('function one(s: string): string | undefined {', helper + '\nfunction one(s: string): string | undefined {');
    fs.writeFileSync(p, t, 'utf8');
    n++;
    console.log('[2/3] names.ts：nameToSmiles 接入中文表');
  }
}

// ---------- 3) 搜索建议接入 ----------
{
  const p = rel('src/names.ts');
  let t = fs.readFileSync(p, 'utf8');
  const old = `export function namesStarting(typed: string, most = 8): string[] {`;
  if (!t.includes(old)) { console.error('!! 找不到 namesStarting'); process.exit(1); }
  if (t.includes('cnNamesStarting(typed')) { console.log('[3/3] 搜索建议已接入，跳过'); }
  else {
    // 在函数体开头把中文建议并进去
    const bodyStart = t.indexOf(old);
    const braceAt = t.indexOf('{', bodyStart);
    const inject = `\n  ${MARK} 中文名建议：输入「阿司」给出「阿司匹林」。\n  const cnHits = cnNamesStarting(typed, most);\n`;
    t = t.slice(0, braceAt + 1) + inject + t.slice(braceAt + 1);
    // 找到 return 语句，合并中文结果
    const retMatch = /(\n\s*return )([^;]+);/.exec(t.slice(braceAt));
    if (retMatch) {
      const at = braceAt + retMatch.index;
      const replaced = `${retMatch[1]}[...new Set([...cnHits, ...${retMatch[2]}])].slice(0, most);`;
      t = t.slice(0, at) + replaced + t.slice(at + retMatch[0].length);
      fs.writeFileSync(p, t, 'utf8');
      n++;
      console.log('[3/3] namesStarting：并入中文建议');
    } else {
      console.error('!! namesStarting 的 return 结构不符，跳过建议接入');
    }
  }
}

console.log(`\n完成 ${n} 处改动。`);
