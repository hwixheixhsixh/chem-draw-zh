// 中文显示修复第 2 项：richtext.ts 的 wrap() 支持 CJK 断行
// 用法: node apply-cjk-wrap.mjs <上游仓库目录>
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('用法: node apply-cjk-wrap.mjs <上游仓库目录>'); process.exit(1); }
const p = path.join(dir, 'src/richtext.ts');
let t = fs.readFileSync(p, 'utf8');
const MARK = '// [cjk-patch]';

if (t.includes('CJK_BREAK')) { console.log('已打过补丁，跳过'); process.exit(0); }

const old = `        if (text[i] !== " ") continue;`;
const neu = `        // [cjk-patch] 中文没有空格：CJK 字符处也是断行点，否则一整段中文永不断行
        if (text[i] !== " " && !CJK_BREAK.test(text[i]) && !CJK_BREAK.test(text[i - 1])) continue;`;

if (!t.includes(old)) { console.error('!! 未找到断行判断行'); process.exit(1); }
t = t.replace(old, neu);

// 常量插在 wrap 定义之前
const anchor = 'export function wrap(';
if (!t.includes(anchor)) { console.error('!! 未找到 wrap 定义'); process.exit(1); }
t = t.replace(anchor, `${MARK} 可断行的中文字符（汉字、假名、全角标点）：中文文本没有空格，须逐字断行。
const CJK_BREAK = /[\\u2E80-\\u9FFF\\uAC00-\\uD7A3\\uF900-\\uFAFF\\uFE30-\\uFE4F\\uFF00-\\uFF60]/;
${anchor}`);

fs.writeFileSync(p, t, 'utf8');
console.log('richtext.ts：wrap() 已支持 CJK 断行');
