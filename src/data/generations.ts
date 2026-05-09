export const API_LIMIT = 1025;
export const API_FORM_LIMIT = 20000;
export const FETCH_CONCURRENCY = 16;

export type GenerationKey =
  | "all"
  | "gen1"
  | "gen2"
  | "gen3"
  | "gen4"
  | "gen5"
  | "gen6"
  | "gen7"
  | "gen8"
  | "gen9";

export const GENERATION_RANGES: Record<GenerationKey, [number, number]> = {
  all: [1, API_LIMIT],
  gen1: [1, 151],
  gen2: [152, 251],
  gen3: [252, 386],
  gen4: [387, 493],
  gen5: [494, 649],
  gen6: [650, 721],
  gen7: [722, 809],
  gen8: [810, 905],
  gen9: [906, API_LIMIT],
};

export const GENERATION_OPTIONS: { value: GenerationKey; label: string }[] = [
  { value: "all", label: "全世代 (#1-1025)" },
  { value: "gen1", label: "第1世代 カントー (#1-151)" },
  { value: "gen2", label: "第2世代 ジョウト (#152-251)" },
  { value: "gen3", label: "第3世代 ホウエン (#252-386)" },
  { value: "gen4", label: "第4世代 シンオウ (#387-493)" },
  { value: "gen5", label: "第5世代 イッシュ (#494-649)" },
  { value: "gen6", label: "第6世代 カロス (#650-721)" },
  { value: "gen7", label: "第7世代 アローラ (#722-809)" },
  { value: "gen8", label: "第8世代 ガラル/ヒスイ (#810-905)" },
  { value: "gen9", label: "第9世代 パルデア (#906-1025)" },
];

export const GENERATION_LABELS: Record<string, string> = {
  "generation-i": "第1世代 カントー",
  "generation-ii": "第2世代 ジョウト",
  "generation-iii": "第3世代 ホウエン",
  "generation-iv": "第4世代 シンオウ",
  "generation-v": "第5世代 イッシュ",
  "generation-vi": "第6世代 カロス",
  "generation-vii": "第7世代 アローラ",
  "generation-viii": "第8世代 ガラル/ヒスイ",
  "generation-ix": "第9世代 パルデア",
};

export const GENERATION_ORDER: Record<string, number> = {
  "generation-i": 1,
  "generation-ii": 2,
  "generation-iii": 3,
  "generation-iv": 4,
  "generation-v": 5,
  "generation-vi": 6,
  "generation-vii": 7,
  "generation-viii": 8,
  "generation-ix": 9,
};

export const GENERATION_LABEL_TO_KEY: Record<string, string> =
  Object.fromEntries(
    Object.entries(GENERATION_LABELS).map(([key, label]) => [label, key]),
  );
