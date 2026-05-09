export interface FormRule {
  suffix: string;
  label: string;
}

export const SUPPORTED_FORM_RULES: FormRule[] = [
  { suffix: "-curly-mega", label: "メガ" },
  { suffix: "-droopy-mega", label: "メガ" },
  { suffix: "-stretchy-mega", label: "メガ" },
  { suffix: "-curly", label: "そったすがた" },
  { suffix: "-droopy", label: "たれたすがた" },
  { suffix: "-stretchy", label: "のびたすがた" },
  { suffix: "-gmax", label: "キョダイマックス" },
  { suffix: "-mega-x", label: "メガX" },
  { suffix: "-mega-y", label: "メガY" },
  { suffix: "-mega", label: "メガ" },
  { suffix: "-primal", label: "ゲンシカイキ" },
  { suffix: "-alola", label: "アローラ" },
  { suffix: "-galar", label: "ガラル" },
  { suffix: "-hisui", label: "ヒスイ" },
  { suffix: "-paldea", label: "パルデア" },
];

export const SPECIAL_BASE_NAME_FALLBACKS: Record<string, string[]> = {
  tatsugiri: ["tatsugiri-curly"],
  "urshifu-rapid-strike": ["urshifu-single-strike", "urshifu"],
  "toxtricity-low-key": ["toxtricity-amped", "toxtricity"],
};

export interface FormAppearanceRule {
  suffix: string;
  generations: string[];
  versions: string[];
}

export const FORM_APPEARANCE_RULES: FormAppearanceRule[] = [
  {
    suffix: "-gmax",
    generations: ["第8世代 ガラル/ヒスイ"],
    versions: ["ソード", "シールド"],
  },
  { suffix: "-mega-x", generations: ["第6世代 カロス"], versions: ["X", "Y"] },
  { suffix: "-mega-y", generations: ["第6世代 カロス"], versions: ["X", "Y"] },
  { suffix: "-mega", generations: ["第6世代 カロス"], versions: ["X", "Y"] },
  {
    suffix: "-primal",
    generations: ["第6世代 カロス"],
    versions: ["オメガルビー", "アルファサファイア"],
  },
  {
    suffix: "-alola",
    generations: ["第7世代 アローラ"],
    versions: ["サン", "ムーン", "ウルトラサン", "ウルトラムーン"],
  },
  {
    suffix: "-galar",
    generations: ["第8世代 ガラル/ヒスイ"],
    versions: ["ソード", "シールド"],
  },
  {
    suffix: "-hisui",
    generations: ["第8世代 ガラル/ヒスイ"],
    versions: ["Pokémon LEGENDS アルセウス"],
  },
  {
    suffix: "-paldea",
    generations: ["第9世代 パルデア"],
    versions: ["スカーレット", "バイオレット"],
  },
  {
    suffix: "-curly",
    generations: ["第9世代 パルデア"],
    versions: ["スカーレット", "バイオレット"],
  },
  {
    suffix: "-droopy",
    generations: ["第9世代 パルデア"],
    versions: ["スカーレット", "バイオレット"],
  },
  {
    suffix: "-stretchy",
    generations: ["第9世代 パルデア"],
    versions: ["スカーレット", "バイオレット"],
  },
  {
    suffix: "-curly-mega",
    generations: ["第9世代 パルデア"],
    versions: ["スカーレット", "バイオレット"],
  },
  {
    suffix: "-droopy-mega",
    generations: ["第9世代 パルデア"],
    versions: ["スカーレット", "バイオレット"],
  },
  {
    suffix: "-stretchy-mega",
    generations: ["第9世代 パルデア"],
    versions: ["スカーレット", "バイオレット"],
  },
];

export const MOVE_METHOD_LABELS: Record<string, string> = {
  "level-up": "レベルアップ",
  machine: "わざマシン",
  egg: "タマゴわざ",
  tutor: "教え技",
  "form-change": "フォルム変化",
  "light-ball-egg": "特別遺伝",
  "colosseum-purification": "特別習得",
  "xd-shadow": "特別習得",
  "stadium-surfing-pikachu": "特別習得",
};

export const MOVE_METHOD_ORDER: string[] = [
  "level-up",
  "machine",
  "tutor",
  "egg",
  "form-change",
  "light-ball-egg",
  "colosseum-purification",
  "xd-shadow",
  "stadium-surfing-pikachu",
  "other",
];
