<script setup lang="ts">
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { usePokedexStore } from "@/stores/pokedex";
import { POKEDEX_OPTION_GROUPS } from "@/data/pokedexes";
import { POKEMON_TYPES } from "@/data/pokemonTypes";
import PokemonCard from "@/components/PokemonCard.vue";

const store = usePokedexStore();
const {
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
} = storeToRefs(store);

onMounted(() => store.load());
</script>

<template>
  <header class="hero">
    <h1>ポケモン図鑑</h1>
    <p>
      全国図鑑をサクッと閲覧。メガ進化・リージョン違いも表示、名前検索と世代フィルターに対応。
    </p>

    <div class="controls" role="search">
      <label class="control-field" for="search-input">
        <span>名前で検索</span>
        <input
          id="search-input"
          v-model="searchWord"
          type="search"
          placeholder="例: ピカチュウ / pikachu"
          autocomplete="off"
        />
      </label>

      <label class="control-field" for="pokedex-select">
        <span>図鑑</span>
        <select id="pokedex-select" v-model="pokedex">
          <optgroup
            v-for="group in POKEDEX_OPTION_GROUPS"
            :key="group.group"
            :label="group.group"
          >
            <option
              v-for="opt in group.options"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </optgroup>
        </select>
      </label>

      <label class="control-field" for="type-select">
        <span>タイプ</span>
        <select id="type-select" v-model="selectedType">
          <option value="">すべて</option>
          <option v-for="t in POKEMON_TYPES" :key="t.value" :value="t.value">
            {{ t.label }}
          </option>
        </select>
      </label>

      <label class="toggle-field" for="shiny-toggle">
        <input id="shiny-toggle" v-model="showShiny" type="checkbox" />
        <span>色違いを表示</span>
      </label>
    </div>

    <p class="result-count" aria-live="polite">
      <template v-if="loading && !allPokemon.length">読み込み中...</template>
      <template v-else>
        <template v-if="isRegional">
          {{ filteredPokemon.length }}件表示 (地方図鑑)
        </template>
        <template v-else>
          {{ filteredPokemon.length }}件表示 / 全{{ allPokemon.length }}件
        </template>
        <span v-if="pokedexLoading" class="names-loading">
          （図鑑エントリーを取得中…）
        </span>
        <span v-if="namesLoading" class="names-loading">
          （日本語名を取得中…）
        </span>
        <span v-if="typeLoading" class="names-loading">
          （タイプ情報を取得中…）
        </span>
      </template>
    </p>
  </header>

  <main>
    <section class="pokedex-grid" aria-label="ポケモン一覧">
      <p v-if="errorMessage" class="status">{{ errorMessage }}</p>
      <p v-else-if="loading && !allPokemon.length" class="status">
        図鑑データを読み込み中...
      </p>
      <p
        v-else-if="isRegional && pokedexLoading && !filteredPokemon.length"
        class="status"
      >
        図鑑エントリーを読み込み中...
      </p>
      <p v-else-if="!filteredPokemon.length" class="status">
        一致するポケモンがいません。
      </p>
      <PokemonCard
        v-for="pokemon in filteredPokemon"
        :key="pokemon.id"
        :pokemon="pokemon"
        :shiny="showShiny"
      />
    </section>
  </main>
</template>

<style scoped>
.hero {
  max-width: 1120px;
  margin: 0 auto;
  padding: 28px 20px 10px;
}

.hero h1 {
  margin: 0;
  font-size: clamp(1.5rem, 3vw, 2.2rem);
  font-weight: 900;
  letter-spacing: 0.02em;
}

.hero > p {
  margin: 8px 0 0;
  color: var(--text-sub);
}

.controls {
  margin-top: 18px;
  display: grid;
  gap: 12px;
  grid-template-columns: 2fr 1fr 1fr auto;
}

.control-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.88rem;
  color: var(--text-sub);
}

.control-field input[type="search"],
.control-field select {
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  border-radius: 12px;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 0.96rem;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.control-field input[type="search"]:focus,
.control-field select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.toggle-field {
  align-self: end;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text-sub);
  font-size: 0.9rem;
}

.toggle-field input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
}

.result-count {
  margin: 12px 0 0;
  font-size: 0.92rem;
  color: var(--text-sub);
}

main {
  max-width: 1120px;
  margin: 0 auto;
  padding: 12px 20px 32px;
}

.pokedex-grid {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 14px 10px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 10px 4px;
}

.status {
  grid-column: 1 / -1;
  text-align: center;
  padding: 36px 12px;
  color: var(--text-sub);
  font-size: 0.98rem;
  margin: 0;
}

@media (max-width: 720px) {
  .controls {
    grid-template-columns: 1fr;
  }

  .pokedex-grid {
    grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
    gap: 8px 3px;
    padding: 10px 6px;
  }
}
</style>
