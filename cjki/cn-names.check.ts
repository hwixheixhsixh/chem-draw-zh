// 校验中文名表：每条 SMILES 必须能被 Indigo 解析，且分子式与期望一致
// 运行: node src/cn-names.check.ts（需要 indigo-ketcher 的 node 构建）
// 期望值来源：PubChem / 教材分子式；未列出的条目只校验"能解析"。

import Indigo from "indigo-ketcher/binaryWasmNoRender";
import { CN_NAMES } from "./cn-names.ts";

const EXPECT: Record<string, string> = {
  阿司匹林: "C9H8O4", 乙酰水杨酸: "C9H8O4", 布洛芬: "C13H18O2", 对乙酰氨基酚: "C8H9NO2", 扑热息痛: "C8H9NO2",
  咖啡因: "C8H10N4O2", 吗啡: "C17H19NO3", 奎宁: "C20H24N2O2", 尼古丁: "C10H14N2",
  士的宁: "C21H22N2O2", 番木鳖碱: "C21H22N2O2", 紫杉醇: "C47H51NO14",
  樟脑: "C10H16O", 薄荷醇: "C10H20O", 柠檬烯: "C10H16",
  苯酚: "C6H6O", 苯甲酸: "C7H6O2", 水杨酸: "C7H6O3", 香草醛: "C8H8O3", 蒽: "C14H10", 萘: "C10H8",
  阿莫西林: "C16H19N3O5S", 奥司他韦: "C16H28N2O4", 二甲双胍: "C4H11N5",
  阿托伐他汀: "C33H35FN2O5", 氯霉素: "C11H12Cl2N2O5", 糖精: "C7H5NO3S",
  尿素: "CH4N2O", 甘油: "C3H8O3", 丙酮: "C3H6O", 乙醇: "C2H6O", 乙酸乙酯: "C4H8O2",
  乙腈: "C2H3N", 二甲基亚砜: "C2H6OS", 四氢呋喃: "C4H8O", 二氯甲烷: "CH2Cl2",
  三氯甲烷: "CHCl3", 甲苯: "C7H8", 吡啶: "C5H5N", 乙醚: "C4H10O",
};

const ind = await Indigo();
const opts = new (ind as any).MapStringString(), sel = new (ind as any).VectorInt();
let ok = 0;
const bad: string[] = [];
try {
  for (const [name, smiles] of Object.entries(CN_NAMES)) {
    try {
      const calc = JSON.parse((ind as any).calculate(smiles, opts, sel));
      const formula = String(calc["gross-formula"] ?? "").replace(/\s+/g, "");
      const want = EXPECT[name];
      // 钠盐等 Indigo 会分段（"C13H16N3O4S;Na"）：分段时只比较第一段 + 校验含 Na
      const plain = formula.split(";")[0];
      const good = !want || formula === want || (want.includes("Na") && formula.includes("Na") && plain === want.replace("Na", ""));
      if (good) ok++; else bad.push(`${name}: 得到 ${formula}，期望 ${want}`);
    } catch (e) {
      bad.push(`${name}: 无法解析（${String(e).slice(0, 60)}）`);
    }
  }
} finally {
  opts.delete();
  sel.delete();
}

console.log(`中文名表 ${Object.keys(CN_NAMES).length} 条，通过 ${ok} 条`);
if (bad.length) { console.error("有问题的条目："); bad.forEach((b) => console.error("  " + b)); process.exit(1); }
