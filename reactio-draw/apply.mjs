// 把中文界面补丁应用到 Reactio Draw 上游源码
// 用法: node apply.mjs <上游仓库目录>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = process.argv[2];
if (!dir) { console.error('用法: node apply.mjs <上游仓库目录>'); process.exit(1); }
const here = path.dirname(fileURLToPath(import.meta.url));
const dict = JSON.parse(fs.readFileSync(path.join(here, 'dict-reactio.json'), 'utf8'));
const core = fs.readFileSync(path.join(here, 'zh-core.js'), 'utf8');

const rel = p => path.join(dir, p);
const read = p => fs.readFileSync(rel(p), 'utf8');
const write = (p, s) => fs.writeFileSync(rel(p), s, 'utf8');
let changes = 0;

// ---------- 1) 生成翻译层 windows-app/zh.js ----------
write('windows-app/zh.js', 'window.__ZH_DICT = ' + JSON.stringify(dict) + ';\n' + core);
console.log('[1/4] 已生成 windows-app/zh.js');

// ---------- 2) main.go 内嵌并注入翻译层 ----------
{
  let t = read('windows-app/main.go');
  if (!t.includes('zhPage')) {
    const embedRe = /\/\/go:embed index\.html\r?\nvar pageHTML \[\]byte/;
    if (!embedRe.test(t)) { console.error('!! main.go 中找不到 //go:embed index.html，上游结构可能变了'); process.exit(2); }
    t = t.replace(embedRe, (m) => m + '\n\n// 中文界面层（本补丁）：词典驱动的显示层翻译脚本\n//\n//go:embed zh.js\nvar zhPage []byte');
    const anchor = '\tidx := filepath.Join(appDir, "index.html")';
    if (!t.includes(anchor)) { console.error('!! main.go 中找不到注入锚点，上游结构可能变了'); process.exit(2); }
    const inject = '\t// 中文界面层：把词典翻译脚本追加到页面（只影响显示）\n\tif len(zhPage) > 0 {\n\t\tpageHTML = append(pageHTML, []byte("\\n<script>\\n")...)\n\t\tpageHTML = append(pageHTML, zhPage...)\n\t\tpageHTML = append(pageHTML, []byte("\\n</script>\\n")...)\n\t}\n\tidx := filepath.Join(appDir, "index.html")';
    t = t.replace(anchor, inject);
    write('windows-app/main.go', t);
    changes++;
    console.log('[2/4] main.go 已注入翻译层');
  } else console.log('[2/4] main.go 已处理过');
}

// ---------- 3) 停用自动更新（否则会被官方英文版覆盖）----------
{
  const targets = ['index.html', 'web/index.html'];
  const TARGET = "  const r = await fetch('https://api.github.com/repos/Paivel/reactio-draw/releases/latest', {";
  const REPL = "  throw new Error('这是非官方中文版，不提供自动更新：请到本项目的发布页下载新版。');\n" + TARGET;
  for (const f of targets) {
    if (!fs.existsSync(rel(f))) continue;
    let t = read(f);
    if (t.includes('这是非官方中文版，不提供自动更新')) { console.log(`[3/4] ${f} 已处理过`); continue; }
    if (!t.includes(TARGET)) { console.log(`[3/4] ${f} 未找到更新检查代码，跳过`); continue; }
    write(f, t.replace(TARGET, REPL));
    changes++;
    console.log(`[3/4] ${f} 已停用自动更新`);
  }
}

// ---------- 4) 桌面版页面取根目录 index.html ----------
{
  const src = rel('index.html'), dst = rel('windows-app/index.html');
  fs.copyFileSync(src, dst);
  console.log('[4/4] 已把 index.html 复制进 windows-app/');
}

console.log(`\n完成：共 ${changes} 处改动。接下来在 ${dir}/windows-app 里执行 go build。`);
