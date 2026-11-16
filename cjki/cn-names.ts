// 中文俗名 → SMILES（内置离线表）
// 数据来源：Wikidata 化合物条目（P233 canonical SMILES），逐条经 Indigo 解析并核对分子式。
// 键为中文常用名（含俗称/异体字），值为该化合物 SMILES。随应用打包，离线可用。
// 扩充：见 tools/build-cn-names.mjs；校验：node src/cn-names.check.ts

export const CN_NAMES: Record<string, string> = {
  // 解热镇痛（Q18216）
  阿司匹林: "CC(=O)OC1=CC=CC=C1C(=O)O",
  乙酰水杨酸: "CC(=O)OC1=CC=CC=C1C(=O)O",
  布洛芬: "CC(C)CC1=CC=C(C=C1)C(C)C(=O)O",
  对乙酰氨基酚: "CC(=O)NC1=CC=C(C=C1)O",
  扑热息痛: "CC(=O)NC1=CC=C(C=C1)O",
  // 安乃近（Q422761，metamizole sodium，钠盐）
  安乃近: "CC1=C(C(=O)N(N1C)C2=CC=CC=C2)N(C)CS(=O)(=O)[O-].[Na+]",
  // 生物碱与天然产物
  咖啡因: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C",
  吗啡: "CN1CCC23C4C1CC5=C2C(=C(C=C5)O)OC3C(C=C4)O",
  奎宁: "COC1=CC2=C(C=CN=C2C=C1)C(C3CC4CCN3CC4C=C)O",
  尼古丁: "N=1C=CC=C(C1)C2N(C)CCC2",
  士的宁: "C1CN2CC3=CCOC4CC(=O)N5C6C4C3CC2C61C7=CC=CC=C75",
  番木鳖碱: "C1CN2CC3=CCOC4CC(=O)N5C6C4C3CC2C61C7=CC=CC=C75",
  紫杉醇: "CC1=C2C(C(=O)C3(C(CC4C(C3C(C(C2(C)C)(CC1OC(=O)C(C(C5=CC=CC=C5)NC(=O)C6=CC=CC=C6)O)O)OC(=O)C7=CC=CC=C7)(CO4)OC(=O)C)O)C)OC(=O)C",
  // 萜类
  樟脑: "CC1(C2CCC1(C(=O)C2)C)C",
  薄荷醇: "CC(C)C1CCC(C)CC1O",
  柠檬烯: "CC1=CCC(CC1)C(=C)C",
  // 芳香与酚类
  苯酚: "C1=CC=C(C=C1)O",
  苯甲酸: "C1=CC=CC=C1C(=O)O",
  水杨酸: "C1=CC=C(C(=C1)C(=O)O)O",
  香草醛: "COC1=C(C=CC(=C1)C=O)O",
  蒽: "C1=CC=C2C=C3C=CC=CC3=CC2=C1",
  萘: "C1=CC=C2C=CC=CC2=C1",
  // 药物
  阿莫西林: "CC1(C(N2C(S1)C(C2=O)NC(=O)C(C3=CC=C(C=C3)O)N)C(=O)O)C",
  奥司他韦: "CCC(CC)OC1C=C(CC(C1NC(=O)C)N)C(=O)OCC",
  二甲双胍: "CN(C)C(=N)N=C(N)N",
  阿托伐他汀: "CC(C)C1=C(C(=C(N1CCC(CC(CC(=O)O)O)O)C2=CC=C(C=C2)F)C3=CC=CC=C3)C(=O)NC4=CC=CC=C4",
  氯霉素: "C1=CC(=CC=C1C(C(CO)NC(=O)C(Cl)Cl)O)[N+](=O)[O-]",
  // 其他常见
  糖精: "C1=CC=C2C(=C1)C(=O)NS2(=O)=O",
  尿素: "C(=O)(N)N",
  甘油: "C(C(CO)O)O",
  丙酮: "CC(=O)C",
  乙醇: "CCO",
  乙酸乙酯: "CCOC(=O)C",
  乙腈: "CC#N",
  二甲基亚砜: "CS(=O)C",
  四氢呋喃: "C1CCOC1",
  二氯甲烷: "ClCCl",
  三氯甲烷: "ClC(Cl)Cl",
  甲苯: "CC1=CC=CC=C1",
  吡啶: "C1=CC=NC=C1",
  乙醚: "CCOCC",
};
