import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useLocalStorage } from "@vueuse/core";
import {
  fetchJapaneseNameMapForRange,
  fetchPokemonList,
  fetchPokemonNamesByType,
} from "@/composables/usePokeApi";
import { GENERATION_RANGES, type GenerationKey } from "@/data/generations";
import type { Pokemon } from "@/types/pokemon";

export const usePokedexStore = defineStore("pokedex", () => {
  const allPokemon = ref<Pokemon[]>([]);
  const loading = ref(false);
  const namesLoading = ref(false);
  const typeLoading = ref(false);
  const errorMessage = ref("");

  /** 取得済みの dexId -> 日本語名 */
  const japaneseNames = ref<Record<number, string>>({});

  /** タイプ別の nameEn セット (取得済みのみ) */
  const typeIndex = ref<Record<string, Set<string>>>({});

  const searchWord = ref("");
  const generation = useLocalStorage<GenerationKey>(
    "pokedex-generation",
    "gen1",
  );
  const selectedType = ref<string>("");
  const showShiny = useLocalStorage<boolean>("pokedex-show-shiny", false);

  function decoratePokemon(pokemon: Pokemon): Pokemon {
    const baseJa = japaneseNames.value[pokemon.dexId];
    if (!baseJa) return pokemon;
    if (!pokemon.isForm) return { ...pokemon, nameJa: baseJa };
    return { ...pokemon, nameJa: `${baseJa} (${pokemon.formLabel})` };
  }

  const filteredPokemon = computed<Pokemon[]>(() => {
    const range = GENERATION_RANGES[generation.value] || GENERATION_RANGES.all;
    const [minDexId, maxDexId] = range;
    const word = searchWord.value.trim().toLowerCase();
    const typeNames = selectedType.value
      ? typeIndex.value[selectedType.value]
      : null;
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

  function ensureNamesForCurrentGeneration(): Promise<void> {
    const range = GENERATION_RANGES[generation.value] || GENERATION_RANGES.all;
    return ensureNamesForRange(range[0], range[1]);
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

  async function load(): Promise<void> {
    if (allPokemon.value.length) {
      void ensureNamesForCurrentGeneration();
      return;
    }
    if (listPromise) return listPromise;
    loading.value = true;
    errorMessage.value = "";
    listPromise = (async () => {
      try {
        const list = await fetchPokemonList();
        allPokemon.value = list;
        void ensureNamesForCurrentGeneration();
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

  watch(generation, () => {
    if (allPokemon.value.length) {
      void ensureNamesForCurrentGeneration();
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
    errorMessage,
    searchWord,
    generation,
    selectedType,
    showShiny,
    load,
  };
});
