// 中文显示三项修复：打入 Octet Draw 源码（可回退）
// 用法: node apply-cjk.mjs <上游仓库目录>
//  1) arial.ts：CJK 字符按 1em 计宽（原先一律 0.556em，偏窄 44%）
//  2) richtext.ts：wrap() 支持 CJK 逐字断行（原先只认空格，中文永不断行）
//  3) docstyle.ts：fontStack 加中文字体回退链
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('用法: node apply-cjk.mjs <上游仓库目录>'); process.exit(1); }
const rel = p => path.join(dir, p);
const read = p => fs.readFileSync(rel(p), 'utf8');
const write = (p, s) => fs.writeFileSync(rel(p), s, 'utf8');
const MARK = '// [cjk-patch]';
let n = 0;

// ---------- 1) arial.ts：CJK 按 1em ----------
{
  let t = read('src/arial.ts');
  if (t.includes(MARK)) { console.log('[1/3] arial.ts 已打过补丁'); }
  else {
    const old = `export function advance(ch: string, size: number): number {
  const c = ch.charCodeAt(0);
  const w = c >= 65 && c <= 90 ? UPPER[c - 65] : c >= 97 && c <= 122 ? LOWER[c - 97] : OTHER[ch] ?? 556;
  return (w * size) / 1000;
}`;
    const neu = `${MARK} 全角字符（CJK、全角标点）在等宽排版中占 1em；Arial 表里没有它们的宽度。
// 原先一律按 556/1000em 计，中文比实际窄 44%，导致 CDXML 导出的文本宽度与对齐错位。
const FULL_WIDTH = /[\\u1100-\\u115F\\u2E80-\\uA4CF\\uAC00-\\uD7A3\\uF900-\\uFAFF\\uFE30-\\uFE4F\\uFF00-\\uFF60\\uFFE0-\\uFFE6]/;
export function advance(ch: string, size: number): number {
  const c = ch.charCodeAt(0);
  const w = c >= 65 && c <= 90 ? UPPER[c - 65] : c >= 97 && c <= 122 ? LOWER[c - 97] : OTHER[ch] ?? (FULL_WIDTH.test(ch) ? 1000 : 556);
  return (w * size) / 1000;
}`;
    if (!t.includes(old)) { console.error('!! arial.ts 结构与预期不符，跳过'); }
    else { write('src/arial.ts', t.replace(old, neu)); n++; console.log('[1/3] arial.ts：CJK 宽度 → 1em'); }
  }
}

// ---------- 2) richtext.ts：wrap() 支持 CJK 断行 ----------
{
  let t = read('src/richtext.ts');
  if (t.includes(MARK)) { console.log('[2/3] richtext.ts 已打过补丁'); }
  else {
    const old = `        let brk = -1;
        for (let i = from + 1; i < end; i++) {
          if (text[i] !== " ") continue;
          if (measure(from, i) <= max || brk < 0) brk = i;
          if (measure(from, i) > max) break;
        }`;
    const neu = `${MARK} 中文没有空格：CJK 字符之间也是断行点（避头尾：标点不放在行首）。
        let brk = -1;
        for (let i = from + 1; i < end; i++) {
          const cjk = CJK_BREAK.test(text[i - 1]) || CJK_BREAK.test(text[i]);
          if (text[i] !== " " && !cjk) continue;
          if (measure(from, i) <= max || brk < 0) brk = i;
          if (measure(from, i) > max) break;
        }`;
    if (!t.includes(old)) { console.error('!! richtext.ts 结构与预期不符，跳过'); }
    else {
      t = t.replace(old, neu);
      // 在 wrap 前插入常量
      t = t.replace('export function wrap(', `${MARK} 可断行处的中文字符（汉字、假名、全角标点）。
const CJK_BREAK = /[\\u2E80-\\u9FFF\\uAC00-\\uD7A3\\uF900-\\uFAFF\\uFE30-\\uFE4F\\uFF00-\\uFF60]/;
export function wrap(`);
      write('src/richtext.ts', t); n++;
      console.log('[2/3] richtext.ts：wrap() 支持 CJK 断行');
    }
  }
}

// ---------- 3) docstyle.ts：fontStack 加中文回退 ----------
{
  let t = read('src/docstyle.ts');
  if (t.includes(MARK)) { console.log('[3/3] docstyle.ts 已打过补丁'); }
  else {
    const old = `export const fontStack = (f: string) =>
  f === "Helvetica" ? "Helvetica, Arial, sans-serif" : f === "Arial" ? "Arial, Helvetica, sans-serif" : /Times|Georgia|Cambria/.test(f) ? \`"\${f}", "Times New Roman", serif\` : \`"\${f}", Arial, sans-serif\`;`;
    const neu = `${MARK} 中文字体回退：界面与画布用中文时，西文字体要落到系统里的中文字形，
// 否则每个字由系统随意挑选，中文与拉丁字符字形、字重不一致（导出时更明显）。
const CJK_SANS = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "Source Han Sans SC", "SimHei", "DengXian"';
const CJK_SERIF = '"SimSun", "Songti SC", "Noto Serif CJK SC", "Source Han Serif SC"';
export const fontStack = (f: string) =>
  f === "Helvetica" ? \`Helvetica, Arial, \${CJK_SANS}, sans-serif\`
  : f === "Arial" ? \`Arial, Helvetica, \${CJK_SANS}, sans-serif\`
  : /Times|Georgia|Cambria/.test(f) ? \`"\${f}", "Times New Roman", \${CJK_SERIF}, serif\`
  : \`"\${f}", Arial, \${CJK_SANS}, sans-serif\`;`;
    if (!t.includes(old)) { console.error('!! docstyle.ts fontStack 结构与预期不符，跳过'); }
    else { write('src/docstyle.ts', t.replace(old, neu)); n++; console.log('[3/3] docstyle.ts：fontStack 加中文回退链'); }
  }
}

console.log(`\n完成 ${n} 处改动。下一步：npm run tauri build -- --no-bundle`);
