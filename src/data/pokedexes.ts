import { API_LIMIT, type GenerationKey } from "./generations";

/**
 * 図鑑の種類:
 * - "national": 全国図鑑 (#1-1025)
 * - "gen1"〜"gen9": 全国図鑑の世代別レンジ
 * - それ以外: PokeAPI の /pokedex/{name} に対応する地方図鑑スラッグ
 */
export type PokedexKey = "national" | GenerationKey | string;

export interface PokedexOption {
  /** 内部キー (national / genN / PokeAPI pokedex name) */
  value: string;
  label: string;
  /** true の場合、PokeAPI /pokedex/{value} を呼び出して entry を取得 */
  isRegional: boolean;
  /** UI 上の optgroup ラベル */
  group: string;
}

/** 全国図鑑 */
const NATIONAL_OPTIONS: PokedexOption[] = [
  {
    value: "national",
    label: `全国図鑑 (#1-${API_LIMIT})`,
    isRegional: false,
    group: "全国図鑑",
  },
  {
    value: "gen1",
    label: "第1世代 カントー (#1-151)",
    isRegional: false,
    group: "全国図鑑",
  },
  {
    value: "gen2",
    label: "第2世代 ジョウト (#152-251)",
    isRegional: false,
    group: "全国図鑑",
  },
  {
    value: "gen3",
    label: "第3世代 ホウエン (#252-386)",
    isRegional: false,
    group: "全国図鑑",
  },
  {
    value: "gen4",
    label: "第4世代 シンオウ (#387-493)",
    isRegional: false,
    group: "全国図鑑",
  },
  {
    value: "gen5",
    label: "第5世代 イッシュ (#494-649)",
    isRegional: false,
    group: "全国図鑑",
  },
  {
    value: "gen6",
    label: "第6世代 カロス (#650-721)",
    isRegional: false,
    group: "全国図鑑",
  },
  {
    value: "gen7",
    label: "第7世代 アローラ (#722-809)",
    isRegional: false,
    group: "全国図鑑",
  },
  {
    value: "gen8",
    label: "第8世代 ガラル/ヒスイ (#810-905)",
    isRegional: false,
    group: "全国図鑑",
  },
  {
    value: "gen9",
    label: `第9世代 パルデア (#906-${API_LIMIT})`,
    isRegional: false,
    group: "全国図鑑",
  },
];

/** 地方図鑑 (PokeAPI スラッグ) */
const REGIONAL_OPTIONS: PokedexOption[] = [
  // 第1世代
  {
    value: "kanto",
    label: "カントー図鑑 (赤緑青ピ)",
    isRegional: true,
    group: "地方図鑑 (第1世代)",
  },
  // 第2世代
  {
    value: "original-johto",
    label: "ジョウト図鑑 (金銀ク)",
    isRegional: true,
    group: "地方図鑑 (第2世代)",
  },
  // 第3世代
  {
    value: "hoenn",
    label: "ホウエン図鑑 (RSE)",
    isRegional: true,
    group: "地方図鑑 (第3世代)",
  },
  // 第4世代
  {
    value: "original-sinnoh",
    label: "シンオウ図鑑 (DP)",
    isRegional: true,
    group: "地方図鑑 (第4世代)",
  },
  {
    value: "extended-sinnoh",
    label: "シンオウ図鑑 (Pt)",
    isRegional: true,
    group: "地方図鑑 (第4世代)",
  },
  {
    value: "updated-johto",
    label: "ジョウト図鑑 (HGSS)",
    isRegional: true,
    group: "地方図鑑 (第4世代)",
  },
  // 第5世代
  {
    value: "original-unova",
    label: "イッシュ図鑑 (BW)",
    isRegional: true,
    group: "地方図鑑 (第5世代)",
  },
  {
    value: "updated-unova",
    label: "イッシュ図鑑 (BW2)",
    isRegional: true,
    group: "地方図鑑 (第5世代)",
  },
  // 第6世代
  {
    value: "kalos-central",
    label: "カロス図鑑 セントラル (XY)",
    isRegional: true,
    group: "地方図鑑 (第6世代)",
  },
  {
    value: "kalos-coastal",
    label: "カロス図鑑 コースト (XY)",
    isRegional: true,
    group: "地方図鑑 (第6世代)",
  },
  {
    value: "kalos-mountain",
    label: "カロス図鑑 マウンテン (XY)",
    isRegional: true,
    group: "地方図鑑 (第6世代)",
  },
  {
    value: "updated-hoenn",
    label: "ホウエン図鑑 (ORAS)",
    isRegional: true,
    group: "地方図鑑 (第6世代)",
  },
  // 第7世代
  {
    value: "original-alola",
    label: "アローラ図鑑 (SM)",
    isRegional: true,
    group: "地方図鑑 (第7世代)",
  },
  {
    value: "updated-alola",
    label: "アローラ図鑑 (USUM)",
    isRegional: true,
    group: "地方図鑑 (第7世代)",
  },
  {
    value: "letsgo-kanto",
    label: "カントー図鑑 (Let's Go)",
    isRegional: true,
    group: "地方図鑑 (第7世代)",
  },
  // 第8世代
  {
    value: "galar",
    label: "ガラル図鑑 (剣盾)",
    isRegional: true,
    group: "地方図鑑 (第8世代)",
  },
  {
    value: "isle-of-armor",
    label: "ヨロイ島図鑑 (鎧の孤島)",
    isRegional: true,
    group: "地方図鑑 (第8世代)",
  },
  {
    value: "crown-tundra",
    label: "カンムリ雪原図鑑 (冠の雪原)",
    isRegional: true,
    group: "地方図鑑 (第8世代)",
  },
  {
    value: "hisui",
    label: "ヒスイ図鑑 (LEGENDS アルセウス)",
    isRegional: true,
    group: "地方図鑑 (第8世代)",
  },
  // 第9世代
  {
    value: "paldea",
    label: "パルデア図鑑 (SV)",
    isRegional: true,
    group: "地方図鑑 (第9世代)",
  },
  {
    value: "kitakami",
    label: "キタカミ図鑑 (碧の仮面)",
    isRegional: true,
    group: "地方図鑑 (第9世代)",
  },
  {
    value: "blueberry",
    label: "ブルーベリー図鑑 (藍の円盤)",
    isRegional: true,
    group: "地方図鑑 (第9世代)",
  },
];

export const POKEDEX_OPTIONS: PokedexOption[] = [
  ...NATIONAL_OPTIONS,
  ...REGIONAL_OPTIONS,
];

/** value -> option の検索 */
export const POKEDEX_OPTION_MAP: Record<string, PokedexOption> =
  Object.fromEntries(POKEDEX_OPTIONS.map((opt) => [opt.value, opt]));

/** UI 用にグループ化 */
export const POKEDEX_OPTION_GROUPS: {
  group: string;
  options: PokedexOption[];
}[] = (() => {
  const groups: { group: string; options: PokedexOption[] }[] = [];
  const map = new Map<string, PokedexOption[]>();
  for (const opt of POKEDEX_OPTIONS) {
    if (!map.has(opt.group)) {
      const arr: PokedexOption[] = [];
      map.set(opt.group, arr);
      groups.push({ group: opt.group, options: arr });
    }
    map.get(opt.group)!.push(opt);
  }
  return groups;
})();

export function isRegionalPokedex(value: string): boolean {
  return POKEDEX_OPTION_MAP[value]?.isRegional ?? false;
}
