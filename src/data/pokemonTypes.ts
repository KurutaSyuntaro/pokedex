export interface PokemonType {
  /** PokeAPI 上の英語スラッグ */
  value: string;
  /** UI 表示用日本語名 */
  label: string;
}

/** 世代9 までの主要 18 タイプ */
export const POKEMON_TYPES: PokemonType[] = [
  { value: "normal", label: "ノーマル" },
  { value: "fire", label: "ほのお" },
  { value: "water", label: "みず" },
  { value: "electric", label: "でんき" },
  { value: "grass", label: "くさ" },
  { value: "ice", label: "こおり" },
  { value: "fighting", label: "かくとう" },
  { value: "poison", label: "どく" },
  { value: "ground", label: "じめん" },
  { value: "flying", label: "ひこう" },
  { value: "psychic", label: "エスパー" },
  { value: "bug", label: "むし" },
  { value: "rock", label: "いわ" },
  { value: "ghost", label: "ゴースト" },
  { value: "dragon", label: "ドラゴン" },
  { value: "dark", label: "あく" },
  { value: "steel", label: "はがね" },
  { value: "fairy", label: "フェアリー" },
];
