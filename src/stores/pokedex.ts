import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useLocalStorage } from "@vueuse/core";
import {
  fetchJapaneseNameMapForRange,
  fetchPokedexEntries,
  fetchPokemonList,
  fetchPokemonNamesByType,
} from "@/composables/usePokeApi";
import { GENERATION_RANGES, type GenerationKey } from "@/data/generations";
import {
  POKEDEX_OPTION_MAP,
  isRegionalPokedex,
  type PokedexKey,
} from "@/data/pokedexes";
import type { Pokemon } from "@/types/pokemon";

export const usePokedexStore = defineStore("pokedex", () => {
  const allPokemon = ref<Pokemon[]>([]);
  const loading = ref(false);
  const namesLoading = ref(false);
  const typeLoading = ref(false);
  const pokedexLoading = ref(false);
  const errorMessage = ref("");

  /** 取得済みの dexId -> 日本語名 */
  const japaneseNames = ref<Record<number, string>>({});

  /** タイプ別の nameEn セット (取得済みのみ) */
  const typeIndex = ref<Record<string, Set<string>>>({});

  /** 地方図鑑別の species名 -> エントリー番号 */
  const pokedexEntries = ref<Record<string, Record<string, number>>>({});

  const searchWord = ref("");
  /**
   * 図鑑キー (national / genN / 地方図鑑スラッグ)
   * 旧 "pokedex-generation" キーから初回のみ移行する
   */
  const pokedex = useLocalStorage<PokedexKey>("pokedex-pokedex", () => {
    try {
      const legacy = window.localStorage.getItem("pokedex-generation");
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (typeof parsed === "string" && POKEDEX_OPTION_MAP[parsed]) {
          return parsed as PokedexKey;
        }
      }
    } catch {
      // ignore
    }
    return "national";
  });
  const selectedType = ref<string>("");
  const showShiny = useLocalStorage<boolean>("pokedex-show-shiny", false);

  function decoratePokemon(pokemon: Pokemon, displayNumber?: number): Pokemon {
    const baseJa = japaneseNames.value[pokemon.dexId];
    const out: Pokemon = { ...pokemon };
    if (baseJa) {
      out.nameJa = pokemon.isForm ? `${baseJa} (${pokemon.formLabel})` : baseJa;
    }
    if (displayNumber !== undefined) {
      out.displayNumber = displayNumber;
    }
    return out;
  }

  /** 現在選択中の図鑑が地方図鑑か */
  const isRegional = computed(() => isRegionalPokedex(pokedex.value));

  /** 地方図鑑のエントリーマップ (未取得なら null) */
  const currentRegionalEntries = computed<Record<string, number> | null>(() => {
    if (!isRegional.value) return null;
    return pokedexEntries.value[pokedex.value] || null;
  });

  /** 全国図鑑（national / genX）レンジ */
  const currentNationalRange = computed<[number, number]>(() => {
    if (isRegional.value) return GENERATION_RANGES.all;
    if (pokedex.value === "national") return GENERATION_RANGES.all;
    const key = pokedex.value as GenerationKey;
    return GENERATION_RANGES[key] || GENERATION_RANGES.all;
  });

  const filteredPokemon = computed<Pokemon[]>(() => {
    const word = searchWord.value.trim().toLowerCase();
    const typeNames = selectedType.value
      ? typeIndex.value[selectedType.value]
      : null;

    // --- 地方図鑑モード ---
    if (isRegional.value) {
      const entries = currentRegionalEntries.value;
      if (!entries) return [];
      const list: Pokemon[] = [];
      for (const pokemon of allPokemon.value) {
        // 地方図鑑は species ベースなのでフォルムは対象外
        if (pokemon.isForm) continue;
        const entryNumber = entries[pokemon.nameEn];
        if (entryNumber === undefined) continue;
        if (typeNames && !typeNames.has(pokemon.nameEn)) continue;
        const decorated = decoratePokemon(pokemon, entryNumber);
        if (word) {
          if (
            !decorated.nameJa.toLowerCase().includes(word) &&
            !decorated.nameEn.includes(word) &&
            !String(decorated.dexId).includes(word) &&
            !String(entryNumber).includes(word)
          ) {
            continue;
          }
        }
        list.push(decorated);
      }
      list.sort((a, b) => (a.displayNumber ?? 0) - (b.displayNumber ?? 0));
      return list;
    }

    // --- 全国図鑑 / 世代別モード ---
    const [minDexId, maxDexId] = currentNationalRange.value;
    const list: Pokemon[] = [];
    for (const pokemon of allPokemon.value) {
      if (pokemon.dexId < minDexId || pokemon.dexId > maxDexId) continue;
      if (typeNames && !typeNames.has(pokemon.nameEn)) continue;
      const decorated = decoratePokemon(pokemon);
      if (word) {
        if (
          !decorated.nameJa.toLowerCase().includes(word) &&
          !decorated.nameEn.includes(word) &&
          !String(decorated.dexId).includes(word)
        ) {
          continue;
        }
      }
      list.push(decorated);
    }
    return list;
  });

  let listPromise: Promise<void> | null = null;
  const inflightRanges = new Map<string, Promise<void>>();
  const inflightTypes = new Map<string, Promise<void>>();
  const inflightPokedexes = new Map<string, Promise<void>>();

  async function ensureNamesForRange(
    minDexId: number,
    maxDexId: number,
  ): Promise<void> {
    const key = `${minDexId}-${maxDexId}`;
    const existing = inflightRanges.get(key);
    if (existing) return existing;

    namesLoading.value = true;
    const promise = (async () => {
      try {
        await fetchJapaneseNameMapForRange(minDexId, maxDexId, (partial) => {
          japaneseNames.value = {
            ...japaneseNames.value,
            ...partial,
          };
        });
      } catch (error) {
        console.error(error);
      } finally {
        inflightRanges.delete(key);
        if (inflightRanges.size === 0) {
          namesLoading.value = false;
        }
      }
    })();
    inflightRanges.set(key, promise);
    return promise;
  }

  function ensureNamesForCurrentSelection(): Promise<void> {
    // 地方図鑑選択時はどの dexId が必要か未確定なので全範囲取得
    if (isRegional.value) {
      return ensureNamesForRange(1, GENERATION_RANGES.all[1]);
    }
    const [min, max] = currentNationalRange.value;
    return ensureNamesForRange(min, max);
  }

  async function ensureTypeIndex(typeName: string): Promise<void> {
    if (!typeName) return;
    if (typeIndex.value[typeName]) return;
    const existing = inflightTypes.get(typeName);
    if (existing) return existing;

    typeLoading.value = true;
    const promise = (async () => {
      try {
        const names = await fetchPokemonNamesByType(typeName);
        typeIndex.value = { ...typeIndex.value, [typeName]: names };
      } catch (error) {
        console.error(error);
      } finally {
        inflightTypes.delete(typeName);
        if (inflightTypes.size === 0) {
          typeLoading.value = false;
        }
      }
    })();
    inflightTypes.set(typeName, promise);
    return promise;
  }

  async function ensurePokedexEntries(pokedexName: string): Promise<void> {
    if (!pokedexName || !isRegionalPokedex(pokedexName)) return;
    if (pokedexEntries.value[pokedexName]) return;
    const existing = inflightPokedexes.get(pokedexName);
    if (existing) return existing;

    pokedexLoading.value = true;
    const promise = (async () => {
      try {
        const entries = await fetchPokedexEntries(pokedexName);
        pokedexEntries.value = {
          ...pokedexEntries.value,
          [pokedexName]: entries,
        };
      } catch (error) {
        console.error(error);
        errorMessage.value = "図鑑データの取得に失敗しました。";
      } finally {
        inflightPokedexes.delete(pokedexName);
        if (inflightPokedexes.size === 0) {
          pokedexLoading.value = false;
        }
      }
    })();
    inflightPokedexes.set(pokedexName, promise);
    return promise;
  }

  async function load(): Promise<void> {
    if (allPokemon.value.length) {
      void ensureNamesForCurrentSelection();
      if (isRegional.value) void ensurePokedexEntries(pokedex.value);
      return;
    }
    if (listPromise) return listPromise;
    loading.value = true;
    errorMessage.value = "";
    listPromise = (async () => {
      try {
        const list = await fetchPokemonList();
        allPokemon.value = list;
        void ensureNamesForCurrentSelection();
        if (isRegional.value) void ensurePokedexEntries(pokedex.value);
      } catch (error) {
        console.error(error);
        errorMessage.value =
          "図鑑データの取得に失敗しました。時間をおいて再読み込みしてください。";
      } finally {
        loading.value = false;
      }
    })();
    return listPromise;
  }

  watch(pokedex, (value) => {
    if (!allPokemon.value.length) return;
    void ensureNamesForCurrentSelection();
    if (isRegionalPokedex(value)) {
      void ensurePokedexEntries(value);
    }
  });

  watch(selectedType, (typeName) => {
    if (typeName) void ensureTypeIndex(typeName);
  });

  // 検索語が入ったら全範囲の日本語名も取得
  watch(searchWord, (word) => {
    if (word.trim() && allPokemon.value.length) {
      void ensureNamesForRange(1, GENERATION_RANGES.all[1]);
    }
  });

  return {
    allPokemon,
    filteredPokemon,
    loading,
    namesLoading,
    typeLoading,
    pokedexLoading,
    errorMessage,
    searchWord,
    pokedex,
    isRegional,
    selectedType,
    showShiny,
    load,
  };
});
