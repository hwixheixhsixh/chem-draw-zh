// 把中文界面补丁应用到 Octet Draw 上游源码
// 用法: node apply.mjs <上游仓库目录>
// 说明: 只改显示文字与注入翻译层，不改化学数据与文件格式逻辑。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = process.argv[2];
if (!dir) { console.error('用法: node apply.mjs <上游仓库目录>'); process.exit(1); }
const here = path.dirname(fileURLToPath(import.meta.url));
const dict = JSON.parse(fs.readFileSync(path.join(here, 'dict-octet.json'), 'utf8'));
const core = fs.readFileSync(path.join(here, 'zh-core.js'), 'utf8');

const rel = p => path.join(dir, p);
const read = p => fs.readFileSync(rel(p), 'utf8');
const write = (p, s) => fs.writeFileSync(rel(p), s, 'utf8');
let changes = 0;

// ---------- 1) 生成翻译层 public/zh.js ----------
const zhJs = 'window.__ZH_DICT = ' + JSON.stringify(dict) + ';\n' + core;
fs.mkdirSync(rel('public'), { recursive: true });
write('public/zh.js', zhJs);
console.log('[1/7] 已生成 public/zh.js');

// ---------- 2) 页面引入翻译层 ----------
{
  let html = read('index.html');
  if (!html.includes('/zh.js')) {
    html = html.replace('</body>', '    <script src="/zh.js" defer></script>\n  </body>');
    write('index.html', html);
    changes++;
    console.log('[2/7] index.html 已引入 /zh.js');
  } else console.log('[2/7] index.html 已有 /zh.js');
}

// ---------- 3) Rust 字符串（菜单、对话框、提示）----------
{
  const escRust = s => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const keys = Object.keys(dict)
    .filter(k => k.length >= 2 && !/^[A-Z][a-z]?$/.test(k))
    .sort((a, b) => b.length - a.length);
  const srcDir = rel('src-tauri/src');
  let n = 0;
  for (const f of fs.readdirSync(srcDir).filter(x => x.endsWith('.rs'))) {
    const p = path.join(srcDir, f);
    let text = fs.readFileSync(p, 'utf8');
    const before = text;
    for (const k of keys) {
      const needle = '"' + escRust(k) + '"';
      if (!text.includes(needle)) continue;
      const parts = text.split(needle);
      n += parts.length - 1;
      text = parts.join('"' + escRust(dict[k]) + '"');
    }
    if (text !== before) fs.writeFileSync(p, text, 'utf8');
  }
  changes += n;
  console.log(`[3/7] Rust 字符串替换 ${n} 处`);
}

// ---------- 4) 预定义系统菜单项（Close/Cut/Copy/Paste/Minimize...）----------
{
  const pairs = [
    ['PredefinedMenuItem::close_window(app, None)', 'PredefinedMenuItem::close_window(app, Some("关闭"))'],
    ['PredefinedMenuItem::cut(app, None)', 'PredefinedMenuItem::cut(app, Some("剪切"))'],
    ['PredefinedMenuItem::copy(app, None)', 'PredefinedMenuItem::copy(app, Some("复制"))'],
    ['PredefinedMenuItem::paste(app, None)', 'PredefinedMenuItem::paste(app, Some("粘贴"))'],
    ['PredefinedMenuItem::minimize(app, None)', 'PredefinedMenuItem::minimize(app, Some("最小化"))'],
    ['PredefinedMenuItem::fullscreen(app, None)', 'PredefinedMenuItem::fullscreen(app, Some("全屏"))'],
    ['PredefinedMenuItem::hide_others(app, None)', 'PredefinedMenuItem::hide_others(app, Some("隐藏其他"))'],
    ['PredefinedMenuItem::hide(app, None)', 'PredefinedMenuItem::hide(app, Some("隐藏 Octet Draw"))'],
    ['PredefinedMenuItem::show_all(app, None)', 'PredefinedMenuItem::show_all(app, Some("全部显示"))'],
  ];
  let t = read('src-tauri/src/main.rs'), n = 0;
  for (const [a, b] of pairs) if (t.includes(a)) { t = t.split(a).join(b); n++; }
  write('src-tauri/src/main.rs', t);
  changes += n;
  console.log(`[4/7] 系统预定义菜单项 ${n} 处`);
}

// ---------- 5) 停用自动更新 ----------
{
  let t = read('src-tauri/src/update.rs');
  const old = `    let updater = app.updater_builder().timeout(Duration::from_secs(30)).build().map_err(|e| e.to_string())?;
    let update = updater.check().await.map_err(|e| e.to_string())?;
    let version = update.as_ref().map(|u| u.version.clone());
    *found.0.lock().unwrap() = update;
    Ok(version)`;
  const neu = `    // 中文版不自动更新：始终报告“已是最新”，请到发布页下载新版
    let _ = (&app, &found);
    Ok(None)`;
  if (t.includes(old)) { write('src-tauri/src/update.rs', t.replace(old, neu)); changes++; console.log('[5/7] 已停用自动更新'); }
  else console.log('[5/7] 自动更新未改动（可能已处理或上游结构变了）');
}

// ---------- 6) 模板集合名 ----------
{
  const map = {
    'Amino acids': '氨基酸', 'Sugars': '糖', 'Hexoses': '己糖', 'Nucleobases': '核碱基',
    'Stereocentres': '立体中心', 'Conformers': '构象异构体', 'Cycloalkanes': '环烷烃',
    'Aromatics': '芳香环', 'Bicyclics': '双环', 'Heterocycles': '杂环',
    'Functional groups': '官能团', 'Ligands': '配体', 'Cp and arene rings': 'Cp 与芳环',
    'Metallocenes': '茂金属', 'Paddlewheels': '桨轮配合物', 'Lab': '实验室'
  };
  let t = read('src/library.json'), n = 0;
  for (const [en, zh] of Object.entries(map)) {
    const re = new RegExp('("name"\\s*:\\s*)"' + en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"(\\s*,\\s*"items")');
    if (re.test(t)) { t = t.replace(re, '$1"' + zh + '"$2'); n++; }
  }
  write('src/library.json', t);
  changes += n;
  console.log(`[6/7] 模板集合名 ${n} 个`);
}

// ---------- 7) 用户模板集合常量 ----------
{
  let t = read('src/templates.ts');
  const old = 'export const MY_SET = "My templates";';
  if (t.includes(old)) { write('src/templates.ts', t.replace(old, 'export const MY_SET = "我的模板";')); changes++; console.log('[7/7] MY_SET → 我的模板'); }
  else console.log('[7/7] MY_SET 未改动');
}

console.log(`\n完成：共 ${changes} 处改动。接下来在 ${dir} 里执行 npm install && npm run tauri build -- --no-bundle`);
