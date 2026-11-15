// 中文显示修复第 4 项：IME 合成事件（中文输入法选字时按 Enter/Esc 不应提交）
// 用法: node apply-cjk-ime.mjs <上游仓库目录>
//  旧行为：拼音输入中按 Enter → commit()，把没选完的拼音当成标签提交
//          拼音输入中按 Esc   → commit()，取消候选词同时把标签关掉
//  新行为：合成期（composition）内的 Enter/Esc 交给输入法，不提交
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('用法: node apply-cjk-ime.mjs <上游仓库目录>'); process.exit(1); }
const rel = p => path.join(dir, p);
let n = 0;

// ---------- 1) RichBox：合成事件期间不把 Enter 当换行 ----------
{
  const p = rel('src/RichBox.tsx');
  let t = fs.readFileSync(p, 'utf8');
  if (t.includes('isComposing')) { console.log('[1/2] RichBox.tsx 已打过补丁'); }
  else {
    const old = `      onKeyDown={(e) => {
        // A new line with Return (as ChemDraw's captions, unless its preference asks for Option-Return), and always with
        // Option- or Shift-Return; the browser's own bold, italic and underline are not used (Octet's are).
        if (e.key === "Enter" && (e.shiftKey || e.altKey || p.returnNewLine)) { e.preventDefault(); insert("\\n"); return; }`;
    const neu = `      onKeyDown={(e) => {
        // [cjk-patch] 输入法合成期间（拼音选字）：Enter 用于确认候选词，不应在这里换行或提交
        if (e.nativeEvent.isComposing || (e.nativeEvent as KeyboardEvent).keyCode === 229) return;
        // A new line with Return (as ChemDraw's captions, unless its preference asks for Option-Return), and always with
        // Option- or Shift-Return; the browser's own bold, italic and underline are not used (Octet's are).
        if (e.key === "Enter" && (e.shiftKey || e.altKey || p.returnNewLine)) { e.preventDefault(); insert("\\n"); return; }`;
    if (!t.includes(old)) { console.error('!! RichBox.tsx 结构不符，跳过'); }
    else { fs.writeFileSync(p, t.replace(old, neu), 'utf8'); n++; console.log('[1/2] RichBox.tsx：合成期 Enter 交给输入法'); }
  }
}

// ---------- 2) Editor：标签框的 Enter/Esc 在合成期不提交 ----------
{
  const p = rel('src/Editor.tsx');
  let t = fs.readFileSync(p, 'utf8');
  if (t.includes('合成期间不提交')) { console.log('[2/2] Editor.tsx 已打过补丁'); }
  else {
    const old = `            onKeyDown={(e) => {
              // Return reaches here only when it does not make a new line.
              if (e.key === "Enter" && !e.shiftKey && !e.altKey) { e.preventDefault(); commit(); }
              if (e.key === "Escape") { e.preventDefault(); commit(); }`;
    const neu = `            onKeyDown={(e) => {
              // [cjk-patch] 输入法合成期间不提交：拼音选字时按 Enter 是确认候选词，按 Esc 是取消候选词，
              // 两者都不应把未完成的标签提交或关闭输入框。
              if (e.nativeEvent.isComposing || (e.nativeEvent as KeyboardEvent).keyCode === 229) return;
              // Return reaches here only when it does not make a new line.
              if (e.key === "Enter" && !e.shiftKey && !e.altKey) { e.preventDefault(); commit(); }
              if (e.key === "Escape") { e.preventDefault(); commit(); }`;
    if (!t.includes(old)) { console.error('!! Editor.tsx 标签框结构不符，跳过'); }
    else { fs.writeFileSync(p, t.replace(old, neu), 'utf8'); n++; console.log('[2/2] Editor.tsx：标签框合成期不提交'); }
  }
}

console.log(`\n完成 ${n} 处改动。`);
