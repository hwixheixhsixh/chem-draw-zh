/* 中文界面翻译层（DOM 级，词典驱动，可回退）
 * 设计要点：
 *  - 只改显示文本与提示属性，绝不影响文件格式、化学数据与逻辑标识符。
 *  - 词条按「归一化后的完整字符串」匹配；未命中则原样保留（安全回退）。
 *  - 长句（被标签切断的说明文字）用整段替换表，匹配元素 textContent。
 *  - 任何不在词表里的可见英文串会被收集，方便后续补译。
 */
(function () {
  'use strict';
  if (window.__zhInstalled) return;
  // 命令行模式（reactio ... 无窗口渲染/转换）里不要介入，否则会打断 CLI 的脚本流程
  if (/(?:\?|&)cli\b/.test(location.search)) return;
  window.__zhInstalled = true;

  var DICT = window.__ZH_DICT || {};
  var SENT = window.__ZH_SENT || [];
  var PATTERN = window.__ZH_PATTERN || [];

  // ---- 归一化：全角/弯引号/破折号/空白 ----
  function norm(s) {
    if (!s) return '';
    return s
      .replace(/[\u00a0\u2000-\u200b\u3000]/g, ' ')
      .replace(/[\u2018\u2019\u201b]/g, "'")
      .replace(/[\u201c\u201d\u201f]/g, '"')
      .replace(/[\u2013\u2014\u2212]/g, '-')
      .replace(/\u2026/g, '...')
      .replace(/\s+/g, ' ')
      .trim();
  }

  var table = new Map();
  for (var k in DICT) if (Object.prototype.hasOwnProperty.call(DICT, k)) table.set(norm(k), DICT[k]);
  var lower = new Map();
  table.forEach(function (v, k) { var l = k.toLowerCase(); if (!lower.has(l)) lower.set(l, v); });

  var sentTable = new Map();
  SENT.forEach(function (p) { if (p && p[0]) sentTable.set(norm(p[0]), p[1]); });
  // 没有单独的整段表时，把词典里较长的句子也当整段替换用（解决被标签切断的长句）
  if (!SENT.length) {
    table.forEach(function (v, k) { if (k.length >= 35) sentTable.set(k, v); });
  }

  var CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
  var hasLetter = /[A-Za-z]{1,}/;


  var NUMW = { one: '一', two: '二', three: '三', four: '四', five: '五', six: '六', seven: '七', eight: '八', nine: '九', ten: '十', eleven: '十一', twelve: '十二', thirteen: '十三', fourteen: '十四', fifteen: '十五', sixteen: '十六', seventeen: '十七', eighteen: '十八', nineteen: '十九', twenty: '二十' };
  function zhPhrase(s) {
    var t = s;
    t = t.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/gi,
      function (m) { return NUMW[m.toLowerCase()] || m; });
    t = t.replace(/\batoms?\b/gi, '原子').replace(/\bbonds?\b/gi, '键').replace(/\brings?\b/gi, '环')
         .replace(/\btexts?\b/gi, '文本').replace(/\barrows?\b/gi, '箭头').replace(/\bstructures?\b/gi, '结构')
         .replace(/\bobjects?\b/gi, '对象').replace(/\band\b/gi, '和').replace(/\bthe\b/gi, '')
         .replace(/\ba\b/gi, '').replace(/\s+/g, ' ').trim();
    return t;
  }
  function lookup(key) {
    if (!key) return null;
    if (table.has(key)) return table.get(key);
    // 1) 结尾括号里是快捷键：前半句翻译，快捷键原样保留
    var mSC = /^(.*?)\s*\(([^()]*(?:Ctrl|Cmd|Shift|Alt|⇧|⌘|Esc|Enter|Del|Space|F\d|\+)[^()]*)\)$/.exec(key);
    if (mSC) {
      var baseSC = lookup(mSC[1]);
      if (baseSC) return baseSC + ' (' + mSC[2] + ')';
    }
    // 2) "A: B" 冒号分句：两段都认识就拼成中文
    var mCol = /^(.{2,90}?):\s(.+)$/.exec(key);
    if (mCol) {
      var pa = lookup(mCol[1]), pb = lookup(mCol[2]);
      if (pa && pb) return pa + '：' + pb;
    }
    // 3) 数量短语（3 members / 12 atoms ...）
    var mNum = /^(\d+)\s+(members|atoms|bonds|rings|items|rows|lines|characters|groups|steps|rows?)$/.exec(key);
    if (mNum) {
      var units = { members: '元', atoms: '个原子', bonds: '个键', rings: '个环', items: '项', rows: '行', lines: '行', characters: '个字符', groups: '个组', steps: '步' };
      return mNum[1] + ' ' + (units[mNum[2]] || '');
    }
    // 4) 常见动态短语：改原子、丢弃文档、今天/昨天时间、问候语
    var mCh = /^Change ([A-Z][a-z]?[A-Z]?[a-z]?)$/.exec(key);
    if (mCh) return '改为 ' + mCh[1];
    var mDis = /^Discard (.+)$/.exec(key);
    if (mDis) { var dDis = lookup(mDis[1]); return '丢弃 ' + (dDis || mDis[1]); }
    var mDay = /^(Today|Yesterday),\s(.+)$/.exec(key);
    if (mDay) return (mDay[1] === 'Today' ? '今天' : '昨天') + '，' + mDay[2];
    var mGreet = /^Good (morning|afternoon|evening),\s(.+)\.$/.exec(key);
    if (mGreet) return ({ morning: '早上好', afternoon: '下午好', evening: '晚上好' })[mGreet[1]] + '，' + mGreet[2] + '。';
    // 6) 文档标签 / 关闭项（名称部分保持不变）
    var mDoc = /^Document (\d+)$/.exec(key);
    if (mDoc) return '文档 ' + mDoc[1];
    var mDocU = /^(.+?) \((not saved|saved)\): click to open, double-click to rename$/.exec(key);
    if (mDocU) return mDocU[1] + '（' + (mDocU[2] === 'not saved' ? '未保存' : '已保存') + '）：单击打开，双击重命名';
    var mClose = /^Close (.+)$/.exec(key);
    if (mClose) { var bClose = lookup(mClose[1]); return '关闭 ' + (bClose || mClose[1]); }
    // 7) 撤销/重做描述（英文数词 + 名词）
    var mUR = /^(Undo|Redo)\.\s(.+)$/.exec(key);
    if (mUR) return (mUR[1] === 'Undo' ? '撤销。' : '重做。') + zhPhrase(mUR[2]);
    var mAct = /^(Added|Deleted|Moved|Resized|Changed|Fixed|Cleaned)\s(.+)\.$/.exec(key);
    if (mAct) {
      var vmap = { Added: '已添加 ', Deleted: '已删除 ', Moved: '已移动 ', Resized: '已调整大小 ', Changed: '已修改 ', Fixed: '已修正 ', Cleaned: '已整理 ' };
      return vmap[mAct[1]] + zhPhrase(mAct[2]) + '。';
    }    // 8) 快捷键表格行：Change X / Remove X
    var mChg = /^Change (.+)$/.exec(key);
    if (mChg) return '更改 ' + mChg[1];
    var mRem = /^Remove (.+)$/.exec(key);
    if (mRem) return '移除 ' + mRem[1];    // 去掉结尾标点再试
    var stripped = key.replace(/[\s:.!?…]+$/, '');
    if (stripped !== key) {
      if (table.has(stripped)) return table.get(stripped) + pickTail(key);
      if (lower.has(stripped.toLowerCase())) return lower.get(stripped.toLowerCase()) + pickTail(key);
    }
    // 前导符号（+ 等）保留
    var mPre = /^([+\-•·*]\s*)(.+)$/.exec(key);
    if (mPre) {
      var inner = lookup(mPre[2]);
      if (inner) return mPre[1] + inner;
    }
    if (lower.has(key.toLowerCase())) return lower.get(key.toLowerCase());
    for (var i = 0; i < PATTERN.length; i++) {
      var p = PATTERN[i];
      var re = new RegExp(p.re);
      var mm = re.exec(key);
      if (mm) return p.zh.replace(/\$(\d)/g, function (_, n) { return mm[+n] == null ? '' : mm[+n]; });
    }
    return null;
  }

  function pickTail(key) {
    var m = /([\s:.!?…]+)$/.exec(key);
    return m ? m[1] : '';
  }

  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, TEXTAREA: 1, SVG: 1, CANVAS: 1, NOSCRIPT: 1, KBD: 1, SAMP: 1 };
  var ATTRS = ['title', 'placeholder', 'aria-label', 'aria-description', 'alt', 'data-tooltip', 'data-title'];

  function translatableText(text) {
    if (!text) return null;
    if (!hasLetter.test(text)) return null;
    if (CJK.test(text)) return null;              // 已是中文
    var key = norm(text);
    if (!key || key.length > 3000) return null;
    var zh = lookup(key);
    if (!zh) { harvest(key); return null; }
    // 保留原始前后空白
    var lead = /^\s*/.exec(text)[0], trail = /\s*$/.exec(text)[0];
    return lead + zh + trail;
  }

  var seenNode = new WeakSet ? new WeakSet() : null;

  function processTextNode(node) {
    var d = node.parentElement;
    if (!d) return;
    if (node.nodeValue && node.nodeValue.length < 2) { }
    var p = d;
    var steps = 0;
    while (p && steps++ < 6) {
      if (SKIP_TAGS[p.tagName]) return;
      if (p.isContentEditable) return;
      if (p.hasAttribute && p.hasAttribute('data-zh-skip')) return;
      p = p.parentElement;
    }
    // SVG 文本（画布上的文字）：只翻译纸张尺寸这类白名单，化学标签一律不动
    var inSvg = false, q = d;
    for (var s = 0; q && s < 8; s++) { if (q.tagName && q.tagName.toLowerCase() === 'svg') { inSvg = true; break; } q = q.parentElement; }
    if (inSvg) {
      var ksvg = norm(node.nodeValue);
      if (!/^(Letter|Legal|Tabloid|A4|A3|A5|B4|B5|Slide 4:3|Slide 16:9)$/.test(ksvg)) return;
    }
    var out = translatableText(node.nodeValue);
    if (out != null && out !== node.nodeValue) node.nodeValue = out;
  }

  function processAttrs(el) {
    if (!el || !el.getAttribute) return;
    if (el.tagName && SKIP_TAGS[el.tagName]) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      var v = el.getAttribute(a);
      if (!v) continue;
      var zh = lookup(norm(v));
      if (zh && zh !== v) el.setAttribute(a, zh);
      else if (!zh) harvest(v);
    }
  }

  var BLOCK = { DIV: 1, P: 1, LI: 1, TD: 1, TH: 1, DD: 1, DT: 1, SECTION: 1, ARTICLE: 1, ASIDE: 1, HEADER: 1, FOOTER: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, LABEL: 1, BUTTON: 1, A: 1, SPAN: 1, B: 1, I: 1, EM: 1, STRONG: 1 };

  function processSentence(el) {
    if (!el || !BLOCK[el.tagName]) return;
    var txt = el.textContent;
    if (!txt) return;
    var key = norm(txt);
    if (key.length < 25 || key.length > 3000) return;
    if (CJK.test(key)) return;
    var zh = sentTable.get(key);
    if (zh != null) {
      // 整段替换：丢掉内部标签，保留纯文本（仅用于说明性长句）
      el.textContent = zh;
      return;
    }
    // 只有叶子块元素才收集，避免重复
    if (el.children.length === 0 && hasLetter.test(key) && key.length > 20) harvest(key);
  }

  var harvestSet = new Map();
  var harvestTimer = null;
  // 未命中词条的上报通道：桌面版把未知串写进应用日志，方便补译
  var __seen = {}, __n = 0;
  if (!window.__zhLog && window.__zhReport && typeof window.__rdPost === 'function') {
    window.__zhLog = function (list) {
      try {
        var fresh = [];
        for (var i = 0; i < list.length; i++) {
          var k = list[i];
          if (!__seen[k] && __n < 600) { __seen[k] = 1; __n++; fresh.push(k); }
        }
        if (fresh.length) window.__rdPost(JSON.stringify({ id: 'x', cmd: 'log', msg: 'ZH-MISSING ' + fresh.join(' || ') }));
      } catch (e) { }
    };
  }
  function harvest(s) {
    if (!s) return;
    var k = norm(s);
    if (!k || k.length < 2 || k.length > 500) return;
    if (!hasLetter.test(k) || CJK.test(k)) return;
    if (!/[A-Za-z]{2,}/.test(k)) return;
    if (!harvestSet.has(k)) harvestSet.set(k, 1);
  }
  function flushHarvest() {
    if (!harvestSet.size) return;
    var list = [];
    harvestSet.forEach(function (_, k) { list.push(k); });
    harvestSet.clear();
    if (window.__zhLog) { try { window.__zhLog(list); } catch (e) { } }
    httpReport(list);
    if (window.__zhShowMissing) { try { console.log('[zh missing]', list.join(' || ')); } catch (e) { } }
  }
  // 本机回传（仅用于汉化期间的漏译收集；正式版可整体关闭）
  var __httpSent = {};
  function httpReport(list) {
    try {
      if (!window.__zhReport) return;
      if (!/^https?:/.test(location.protocol)) return;
      var fresh = [];
      for (var i = 0; i < list.length; i++) {
        var k = list[i];
        if (__httpSent[k]) continue;
        if (!/[A-Za-z]{2,}/.test(k)) continue;
        __httpSent[k] = 1; fresh.push(k);
        if (fresh.length >= 200) break;
      }
      if (!fresh.length) return;
      fetch('http://127.0.0.1:8777/zh', { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: fresh.join('\n') }).catch(function () { });
    } catch (e) { }
  }
  function scheduleFlush() {
    if (harvestTimer) return;
    harvestTimer = setTimeout(function () { harvestTimer = null; flushHarvest(); }, 1500);
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { processTextNode(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) {
      if (SKIP_TAGS[root.tagName]) return;
      processAttrs(root);
      processSentence(root);
    }
    var tw = document.createTreeWalker(root, 4 | 1 | 128, null); // TEXT|ELEMENT|COMMENT? no
    var n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) processTextNode(n);
      else if (n.nodeType === 1) {
        if (SKIP_TAGS[n.tagName]) { tw.nextSibling && 0; continue; }
        processAttrs(n);
        processSentence(n);
      }
    }
    scheduleFlush();
  }

  function run() {
    walk(document.body || document.documentElement);
    if (document.title) {
      var t = lookup(norm(document.title));
      if (t) document.title = t;
    }
    try {
      var mo = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type === 'characterData') processTextNode(m.target);
          else if (m.type === 'attributes') processAttrs(m.target);
          else {
            for (var j = 0; j < m.addedNodes.length; j++) {
              var an = m.addedNodes[j];
              if (an.nodeType === 3) processTextNode(an);
              else if (an.nodeType === 1) walk(an);
            }
          }
        }
        scheduleFlush();
      });
      mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    } catch (e) { }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  window.__zhTranslateNow = run;
  window.__zhLookup = function (s) { return lookup(norm(s)); };
})();
