<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { usePokedexStore } from "@/stores/pokedex";
import {
  attachSpriteFallback,
  buildSpriteCandidates,
  buildMoveRecords,
  collectMoveGenerationOptions,
  computeTypeMatchups,
  fetchAbilityNameMap,
  fetchAppearanceData,
  fetchMoveNameMap,
  fetchPokemonDetail,
  fetchSpeciesDetail,
  fetchTypeDamageRelations,
  fetchTypeNameMap,
  findSpeciesGenusJa,
  formatSlug,
  generationLabelFor,
  parseFormFromName,
} from "@/composables/usePokeApi";
import { GENERATION_LABELS } from "@/data/generations";
import type {
  AppearanceData,
  MoveEntry,
  MoveGenerationOption,
  PokeApiPokemon,
  PokeApiSpecies,
  StatEntry,
  TypeDamageRelations,
  TypeMatchupGroup,
} from "@/types/pokemon";
import TypeBadge from "@/components/TypeBadge.vue";
import MoveList from "@/components/MoveList.vue";

const route = useRoute();
const router = useRouter();
const store = usePokedexStore();
const { showShiny } = storeToRefs(store);

const status = ref("詳細データを読み込み中...");
const errored = ref(false);

const pokemon = ref<PokeApiPokemon | null>(null);
const species = ref<PokeApiSpecies | null>(null);
const appearance = ref<AppearanceData | null>(null);
const typeNameMap = ref<Record<string, string>>({});
const abilityNameMap = ref<Record<string, string>>({});
const moveNameMap = ref<Record<string, string>>({});
const moveGenerationOptions = ref<MoveGenerationOption[]>([]);
const selectedGenerationKey = ref<string>("");
const typeDamageRelations = ref<Record<string, TypeDamageRelations>>({});

const dexFromQuery = computed<number | null>(() => {
  const v = route.query.dex;
  if (typeof v === "string") {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
});

const displayName = computed<string>(() => {
  if (!pokemon.value || !species.value) return "";
  const form = parseFormFromName(pokemon.value.name);
  const baseName =
    species.value.names?.find((entry) => entry.language?.name === "ja-Hrkt")
      ?.name ||
    species.value.names?.find((entry) => entry.language?.name === "ja")?.name ||
    formatSlug(species.value.name);
  return form ? `${baseName} (${form.label})` : baseName;
});

const subtitle = computed<string>(() => {
  if (!pokemon.value || !species.value) return "";
  const genus = findSpeciesGenusJa(species.value);
  return `${formatSlug(pokemon.value.name)} / ${genus}`;
});

const generationLabel = computed<string>(() => {
  const key = species.value?.generation?.name;
  if (!key) return "";
  return GENERATION_LABELS[key] || formatSlug(key);
});

const heightLabel = computed<string>(() =>
  pokemon.value ? `${pokemon.value.height / 10} m` : "",
);
const weightLabel = computed<string>(() =>
  pokemon.value ? `${pokemon.value.weight / 10} kg` : "",
);

const abilitiesLabel = computed<string>(() => {
  if (!pokemon.value) return "";
  return pokemon.value.abilities
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map(
      (entry) =>
        abilityNameMap.value[entry.ability?.name] ||
        formatSlug(entry.ability?.name || "unknown"),
    )
    .join(" / ");
});

const sortedTypes = computed(() => {
  if (!pokemon.value) return [] as { slot: number; label: string }[];
  return pokemon.value.types
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((entry) => ({
      slot: entry.slot,
      label:
        typeNameMap.value[entry.type?.name] ||
        formatSlug(entry.type?.name || "unknown"),
    }));
});

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "こうげき",
  defense: "ぼうぎょ",
  "special-attack": "とくこう",
  "special-defense": "とくぼう",
  speed: "すばやさ",
};
const STAT_ORDER = [
  "hp",
  "attack",
  "defense",
  "special-attack",
  "special-defense",
  "speed",
];
/** 種族値バーの最大値 (255 が事実上の上限) */
const STAT_BAR_MAX = 255;

const stats = computed<StatEntry[]>(() => {
  if (!pokemon.value) return [];
  const map = new Map<string, number>();
  for (const entry of pokemon.value.stats) {
    const key = entry.stat?.name;
    if (!key) continue;
    map.set(key, entry.base_stat);
  }
  return STAT_ORDER.filter((key) => map.has(key)).map((key) => ({
    key,
    label: STAT_LABELS[key] || formatSlug(key),
    value: map.get(key) as number,
  }));
});

const statTotal = computed<number>(() =>
  stats.value.reduce((sum, s) => sum + s.value, 0),
);

function statBarWidth(value: number): string {
  const ratio = Math.min(1, Math.max(0, value / STAT_BAR_MAX));
  return `${(ratio * 100).toFixed(1)}%`;
}

function statBarClass(value: number): string {
  if (value >= 150) return "stat-bar--max";
  if (value >= 110) return "stat-bar--high";
  if (value >= 80) return "stat-bar--mid";
  if (value >= 50) return "stat-bar--low";
  return "stat-bar--min";
}

const moves = computed<MoveEntry[]>(() => {
  if (!pokemon.value || !appearance.value || !selectedGenerationKey.value)
    return [];
  const label =
    moveGenerationOptions.value.find(
      (o) => o.key === selectedGenerationKey.value,
    )?.label || generationLabelFor(selectedGenerationKey.value);
  return buildMoveRecords(
    pokemon.value,
    moveNameMap.value,
    appearance.value.versionGroupMap,
    selectedGenerationKey.value,
    label,
  );
});

const movesGenerationLabel = computed<string>(
  () =>
    moveGenerationOptions.value.find(
      (o) => o.key === selectedGenerationKey.value,
    )?.label || "世代情報なし",
);

const typeMatchups = computed<TypeMatchupGroup[]>(() => {
  if (!pokemon.value) return [];
  const defenderTypes = pokemon.value.types
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((entry) => entry.type?.name)
    .filter((v): v is string => Boolean(v));
  if (!defenderTypes.length) return [];
  return computeTypeMatchups(defenderTypes, typeDamageRelations.value);
});

const dexNumber = computed(() => {
  if (dexFromQuery.value) return dexFromQuery.value;
  return species.value?.id || pokemon.value?.id || 0;
});

const spriteRef = ref<HTMLImageElement | null>(null);

function applySprite(): void {
  if (!pokemon.value || !spriteRef.value) return;
  const dex = dexNumber.value || pokemon.value.id;
  const candidates = buildSpriteCandidates(
    pokemon.value.id,
    dex,
    showShiny.value,
  );
  attachSpriteFallback(spriteRef.value, candidates);
}

watch([showShiny, pokemon], () => applySprite());

watch(showShiny, (value) => {
  const query = { ...route.query };
  if (value) {
    query.shiny = "1";
  } else {
    delete query.shiny;
  }
  router.replace({ query });
});

async function loadDetail(): Promise<void> {
  const nameParam = route.params.name;
  const targetName = Array.isArray(nameParam) ? nameParam[0] : nameParam;
  if (!targetName) {
    status.value = "ポケモン情報が指定されていません。";
    errored.value = true;
    return;
  }

  status.value = "詳細データを読み込み中...";
  errored.value = false;
  pokemon.value = null;
  species.value = null;

  try {
    const fetchedPokemon = await fetchPokemonDetail(targetName);
    const fetchedSpecies = await fetchSpeciesDetail(fetchedPokemon.species.url);
    const typeNames = fetchedPokemon.types
      .map((entry) => entry.type?.name)
      .filter((v): v is string => Boolean(v));
    const [movesMap, appearanceData, typeMap, abilityMap, damageRelations] =
      await Promise.all([
        fetchMoveNameMap(fetchedPokemon.moves),
        fetchAppearanceData(fetchedPokemon, fetchedSpecies),
        fetchTypeNameMap(typeNames),
        fetchAbilityNameMap(
          fetchedPokemon.abilities
            .map((entry) => entry.ability?.name)
            .filter(Boolean),
        ),
        fetchTypeDamageRelations(typeNames),
      ]);

    pokemon.value = fetchedPokemon;
    species.value = fetchedSpecies;
    appearance.value = appearanceData;
    moveNameMap.value = movesMap;
    typeNameMap.value = typeMap;
    abilityNameMap.value = abilityMap;
    typeDamageRelations.value = damageRelations;
    moveGenerationOptions.value = collectMoveGenerationOptions(
      fetchedPokemon,
      appearanceData.versionGroupMap,
    );
    selectedGenerationKey.value = moveGenerationOptions.value.at(-1)?.key || "";
    document.title = `${displayName.value} | ポケモン詳細`;

    // 初期スプライト適用
    setTimeout(applySprite, 0);
  } catch (error) {
    console.error(error);
    status.value =
      "詳細データの取得に失敗しました。時間をおいて再読み込みしてください。";
    errored.value = true;
  }
}

onMounted(() => {
  if (route.query.shiny === "1") {
    showShiny.value = true;
  }
  loadDetail();
});

watch(
  () => route.params.name,
  () => loadDetail(),
);
</script>

<template>
  <header class="page-header">
    <router-link class="back-link" :to="{ name: 'pokedex' }"
      >← 図鑑一覧へ戻る</router-link
    >
    <label class="shiny-toggle" for="shiny-toggle">
      <input id="shiny-toggle" v-model="showShiny" type="checkbox" />
      <span>色違いを表示</span>
    </label>
  </header>

  <main class="detail-main">
    <p v-if="!pokemon || errored" class="detail-status">{{ status }}</p>

    <section
      v-if="pokemon && species && appearance && !errored"
      class="detail-shell"
    >
      <section class="hero-card">
        <div class="hero-visual">
          <img
            ref="spriteRef"
            class="detail-sprite"
            :alt="`${displayName} の画像`"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div class="hero-copy">
          <p class="detail-number">#{{ dexNumber }}</p>
          <h1 class="detail-name">{{ displayName }}</h1>
          <p class="detail-subtitle">{{ subtitle }}</p>
          <div class="tag-list" aria-label="タイプ">
            <TypeBadge
              v-for="t in sortedTypes"
              :key="t.slot"
              :label="t.label"
            />
          </div>
        </div>
      </section>

      <section class="info-grid">
        <article class="info-card">
          <h2>基本情報</h2>
          <dl class="info-list">
            <div>
              <dt>初登場世代</dt>
              <dd>{{ generationLabel }}</dd>
            </div>
            <div>
              <dt>高さ</dt>
              <dd>{{ heightLabel }}</dd>
            </div>
            <div>
              <dt>重さ</dt>
              <dd>{{ weightLabel }}</dd>
            </div>
            <div>
              <dt>特性</dt>
              <dd>{{ abilitiesLabel }}</dd>
            </div>
          </dl>
        </article>

        <article class="info-card">
          <h2>出現世代・作品</h2>
          <p class="card-note">
            {{ appearance.generations.length }}世代 /
            {{ appearance.versions.length }}作品に出現
          </p>
          <h3 class="subheading">出現世代</h3>
          <div class="tag-list" aria-label="出現世代">
            <TypeBadge
              v-if="!appearance.generations.length"
              label="出現世代情報なし"
            />
            <TypeBadge
              v-for="(g, i) in appearance.generations"
              :key="`gen-${i}`"
              :label="g"
            />
          </div>
          <h3 class="subheading">出現作品</h3>
          <div class="tag-list" aria-label="収録バージョン">
            <TypeBadge
              v-if="!appearance.versions.length"
              label="バージョン情報なし"
            />
            <TypeBadge
              v-for="(v, i) in appearance.versions"
              :key="`ver-${i}`"
              :label="v"
            />
          </div>
        </article>
      </section>

      <section
        v-if="typeMatchups.length"
        class="info-card matchup-card"
        aria-label="タイプ相性"
      >
        <div class="matchup-header">
          <h2>タイプ相性</h2>
          <p class="card-note">攻撃を受けた時のダメージ倍率</p>
        </div>
        <ul class="matchup-list">
          <li
            v-for="group in typeMatchups"
            :key="group.variant"
            class="matchup-row"
            :class="`matchup-row--${group.variant}`"
          >
            <span class="matchup-label">{{ group.label }}</span>
            <div class="matchup-types">
              <TypeBadge
                v-for="t in group.types"
                :key="t.value"
                :label="t.label"
              />
            </div>
          </li>
        </ul>
      </section>

      <section class="info-card stats-card">
        <div class="stats-header">
          <h2>種族値</h2>
          <p class="stats-total">
            合計 <strong>{{ statTotal }}</strong>
          </p>
        </div>
        <ul class="stat-list">
          <li v-for="s in stats" :key="s.key" class="stat-row">
            <span class="stat-label">{{ s.label }}</span>
            <span class="stat-value">{{ s.value }}</span>
            <span class="stat-bar">
              <span
                class="stat-bar-fill"
                :class="statBarClass(s.value)"
                :style="{ width: statBarWidth(s.value) }"
              />
            </span>
          </li>
        </ul>
      </section>

      <section class="moves-card">
        <div class="moves-header">
          <h2>覚える技</h2>
          <div class="moves-controls">
            <label class="move-generation-field" for="move-generation-select">
              <span>表示世代</span>
              <select
                id="move-generation-select"
                v-model="selectedGenerationKey"
                :disabled="!moveGenerationOptions.length"
              >
                <option v-if="!moveGenerationOptions.length" value="">
                  世代情報なし
                </option>
                <option
                  v-for="opt in moveGenerationOptions"
                  :key="opt.key"
                  :value="opt.key"
                >
                  {{ opt.label }}
                </option>
              </select>
            </label>
          </div>
        </div>
        <MoveList
          :moves="moves"
          :latest-generation-label="movesGenerationLabel"
        />
      </section>
    </section>
  </main>
</template>

<style scoped>
.page-header,
.detail-main {
  max-width: 1120px;
  margin: 0 auto;
  padding-left: 20px;
  padding-right: 20px;
}

.page-header {
  padding-top: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.back-link,
.shiny-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text);
  text-decoration: none;
}

.shiny-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
}

.detail-main {
  padding-top: 16px;
  padding-bottom: 40px;
}

.detail-status {
  color: var(--text-sub);
  font-size: 1rem;
}

.detail-shell {
  display: grid;
  gap: 18px;
}

.hero-card,
.info-card,
.moves-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.hero-card {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 18px;
  padding: 22px;
}

.hero-visual {
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(180deg, #f7fbff 0%, #eef7f5 100%);
}

.detail-sprite {
  width: 180px;
  height: 180px;
  object-fit: contain;
}

.detail-number {
  margin: 0;
  color: var(--accent);
  font-size: 0.96rem;
  font-weight: 700;
}

.detail-name {
  margin: 6px 0 0;
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  line-height: 1.15;
}

.detail-subtitle {
  margin: 8px 0 0;
  color: var(--text-sub);
}

.tag-list {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.info-card,
.moves-card {
  padding: 18px;
}

.info-card h2,
.moves-card h2 {
  margin: 0;
  font-size: 1.1rem;
}

.info-list {
  margin: 16px 0 0;
  display: grid;
  gap: 14px;
}

.info-list div {
  display: grid;
  gap: 4px;
}

.info-list dt {
  color: var(--text-sub);
  font-size: 0.84rem;
}

.info-list dd {
  margin: 0;
  font-weight: 700;
}

.card-note {
  margin: 8px 0 0;
  color: var(--text-sub);
  font-size: 0.88rem;
}

.subheading {
  margin: 16px 0 0;
  color: var(--text-sub);
  font-size: 0.86rem;
}

.matchup-card {
  display: grid;
  gap: 12px;
}

.matchup-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.matchup-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.matchup-row {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--surface-soft, #f7f8fa);
  border-left: 4px solid transparent;
}

.matchup-label {
  font-weight: 700;
  font-size: 0.92rem;
}

.matchup-types {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.matchup-row--weak4 {
  border-left-color: #d9322f;
  background: #fdecec;
}
.matchup-row--weak4 .matchup-label {
  color: #b1231f;
}
.matchup-row--weak2 {
  border-left-color: #ef6c4a;
  background: #fdf1ec;
}
.matchup-row--weak2 .matchup-label {
  color: #c14a2b;
}
.matchup-row--half {
  border-left-color: #2ea36c;
  background: #ebf7f0;
}
.matchup-row--half .matchup-label {
  color: #1f7a4f;
}
.matchup-row--quarter {
  border-left-color: #2f7fd9;
  background: #eaf2fb;
}
.matchup-row--quarter .matchup-label {
  color: #1f5da8;
}
.matchup-row--immune {
  border-left-color: #4a4a55;
  background: #ececef;
}
.matchup-row--immune .matchup-label {
  color: #2d2d36;
}

@media (max-width: 540px) {
  .matchup-row {
    grid-template-columns: 1fr;
  }
}

.stats-card {
  display: grid;
  gap: 12px;
}

.stats-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.stats-total {
  margin: 0;
  color: var(--text-sub);
  font-size: 0.9rem;
}

.stats-total strong {
  color: var(--text);
  font-size: 1.05rem;
  margin-left: 4px;
}

.stat-list {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.stat-row {
  display: grid;
  grid-template-columns: 84px 48px 1fr;
  align-items: center;
  gap: 10px;
}

.stat-label {
  color: var(--text-sub);
  font-size: 0.88rem;
}

.stat-value {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  text-align: right;
}

.stat-bar {
  position: relative;
  height: 10px;
  background: var(--accent-soft, #eef2f7);
  border-radius: 999px;
  overflow: hidden;
}

.stat-bar-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.3s ease;
}

.stat-bar--min {
  background: #e57373;
}
.stat-bar--low {
  background: #ffb74d;
}
.stat-bar--mid {
  background: #fdd835;
}
.stat-bar--high {
  background: #81c784;
}
.stat-bar--max {
  background: #4fc3f7;
}

.moves-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.moves-controls {
  display: flex;
  align-items: end;
  gap: 12px;
}

.move-generation-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--text-sub);
  font-size: 0.82rem;
}

.move-generation-field select {
  min-width: 170px;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px 10px;
  font-family: inherit;
  background: var(--surface);
  color: var(--text);
}

.move-generation-field select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}

@media (max-width: 800px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-card {
    grid-template-columns: 1fr;
  }

  .hero-visual {
    min-height: 200px;
  }

  .moves-header,
  .moves-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .move-generation-field select {
    min-width: 0;
    width: 100%;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .stat-row {
    grid-template-columns: 72px 40px 1fr;
    gap: 8px;
  }
}
</style>
