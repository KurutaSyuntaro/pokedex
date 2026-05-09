<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { usePokedexStore } from "@/stores/pokedex";
import {
  attachSpriteFallback,
  buildSpriteCandidates,
  buildEvolutionTree,
  buildFlavorTextEntries,
  buildMoveRecords,
  collectMoveGenerationOptions,
  computeTypeMatchups,
  fetchAbilityInfoMap,
  fetchAbilityNameMap,
  fetchAppearanceData,
  fetchMoveNameMap,
  fetchNamedResourceLabels,
  fetchPokemonDetail,
  fetchSpeciesDetail,
  fetchTypeDamageRelations,
  fetchTypeNameMap,
  findSpeciesGenusJa,
  formatSlug,
  generationLabelFor,
  parseFormFromName,
  resolveAbilitiesForGeneration,
  resolveStatsForGeneration,
  resolveTypesForGeneration,
} from "@/composables/usePokeApi";
import { GENERATION_LABELS, GENERATION_ORDER } from "@/data/generations";
import type {
  AbilityEntry,
  AbilityInfo,
  AppearanceData,
  EvolutionNode,
  FlavorTextEntry,
  MoveEntry,
  MoveGenerationOption,
  PokeApiPokemon,
  PokeApiSpecies,
  StatEntry,
  TypeMatchupGroup,
  TypeWithPast,
} from "@/types/pokemon";
import TypeBadge from "@/components/TypeBadge.vue";
import MoveList from "@/components/MoveList.vue";
import EvolutionTree from "@/components/EvolutionTree.vue";

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
const abilityInfoMap = ref<Record<string, AbilityInfo>>({});
const eggGroupLabels = ref<Record<string, string>>({});
const growthRateLabels = ref<Record<string, string>>({});
const moveNameMap = ref<Record<string, string>>({});
const moveGenerationOptions = ref<MoveGenerationOption[]>([]);
const selectedGenerationKey = ref<string>("");
const typeDamageRelations = ref<Record<string, TypeWithPast>>({});
const evolutionTree = ref<EvolutionNode | null>(null);
/** ページ全体の表示世代（種族値・タイプ・特性・相性・図鑑説明に連動）。空文字列 = 現行。 */
const viewGenerationKey = ref<string>("");

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

const effectiveAbilities = computed(() => {
  if (!pokemon.value) return [] as PokeApiPokemon["abilities"];
  return resolveAbilitiesForGeneration(pokemon.value, viewGenerationKey.value);
});
const effectiveTypes = computed(() => {
  if (!pokemon.value) return [] as PokeApiPokemon["types"];
  return resolveTypesForGeneration(pokemon.value, viewGenerationKey.value);
});
const effectiveStats = computed(() => {
  if (!pokemon.value) return [] as PokeApiPokemon["stats"];
  return resolveStatsForGeneration(pokemon.value, viewGenerationKey.value);
});

const abilityEntries = computed<AbilityEntry[]>(() => {
  if (!effectiveAbilities.value.length) return [];
  // 特性は第3世代から導入された概念。第1・2世代では存在しない。
  const rank = GENERATION_ORDER[viewGenerationKey.value] || 0;
  if (rank > 0 && rank < 3) return [];
  return effectiveAbilities.value
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((entry) => {
      const key = entry.ability?.name || "";
      const info = abilityInfoMap.value[key];
      return {
        key,
        slot: entry.slot,
        isHidden: entry.is_hidden,
        nameJa:
          info?.nameJa ||
          abilityNameMap.value[key] ||
          formatSlug(key || "unknown"),
        flavorJa: info?.flavorJa || "",
      };
    });
});

const genderLabel = computed<{ male: string; female: string } | null>(() => {
  const rate = species.value?.gender_rate;
  if (rate == null) return null;
  if (rate < 0) return null; // 性別不明 (-1)
  const female = (rate / 8) * 100;
  const male = 100 - female;
  return {
    male: `${male.toFixed(male % 1 === 0 ? 0 : 1)}%`,
    female: `${female.toFixed(female % 1 === 0 ? 0 : 1)}%`,
  };
});

const eggGroupsLabel = computed<string>(() => {
  const groups = species.value?.egg_groups || [];
  if (!groups.length) return "—";
  return groups
    .map((g) => eggGroupLabels.value[g.name] || formatSlug(g.name))
    .join(" / ");
});

const growthRateLabel = computed<string>(() => {
  const key = species.value?.growth_rate?.name;
  if (!key) return "—";
  return growthRateLabels.value[key] || formatSlug(key);
});

/** 孵化歩数 = (hatch_counter + 1) * 256 (Gen2 以降の汎用式) */
const hatchStepsLabel = computed<string>(() => {
  const hc = species.value?.hatch_counter;
  if (hc == null) return "—";
  return `${((hc + 1) * 256).toLocaleString()} 歩`;
});

const baseHappinessLabel = computed<string>(() => {
  const v = species.value?.base_happiness;
  return v == null ? "—" : String(v);
});

const captureRateLabel = computed<string>(() => {
  const v = species.value?.capture_rate;
  return v == null ? "—" : String(v);
});

/** 特性が第3世代から導入された旨のノート（第1・2世代選択時のみ表示） */
const abilitiesUnavailableNote = computed<string>(() => {
  const rank = GENERATION_ORDER[viewGenerationKey.value] || 0;
  if (rank > 0 && rank < 3) {
    return "特性は第3世代『ルビー・サファイア』から導入された概念のため、この世代には存在しません。";
  }
  return "";
});

const sortedTypes = computed(() => {
  if (!effectiveTypes.value.length)
    return [] as { slot: number; label: string }[];
  return effectiveTypes.value
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
  if (!effectiveStats.value.length) return [];
  const map = new Map<string, number>();
  for (const entry of effectiveStats.value) {
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
  if (!effectiveTypes.value.length) return [];
  const defenderTypes = effectiveTypes.value
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((entry) => entry.type?.name)
    .filter((v): v is string => Boolean(v));
  if (!defenderTypes.length) return [];
  return computeTypeMatchups(
    defenderTypes,
    typeDamageRelations.value,
    viewGenerationKey.value,
  );
});

const dexNumber = computed(() => {
  if (dexFromQuery.value) return dexFromQuery.value;
  return species.value?.id || pokemon.value?.id || 0;
});

const ALL_GENERATION_KEYS = [
  "generation-i",
  "generation-ii",
  "generation-iii",
  "generation-iv",
  "generation-v",
  "generation-vi",
  "generation-vii",
  "generation-viii",
  "generation-ix",
];

/** ページ世代セレクタの選択肢（種族の登場世代以降を列挙） */
const viewGenerationOptions = computed<{ key: string; label: string }[]>(() => {
  const debutKey = species.value?.generation?.name || "";
  const debutRank = GENERATION_ORDER[debutKey] || 1;
  return ALL_GENERATION_KEYS.filter(
    (key) => (GENERATION_ORDER[key] || 0) >= debutRank,
  ).map((key) => ({
    key,
    label: GENERATION_LABELS[key] || formatSlug(key),
  }));
});

const flavorEntries = computed<FlavorTextEntry[]>(() => {
  if (!species.value || !appearance.value) return [];
  return buildFlavorTextEntries(
    species.value,
    appearance.value.versionGroupMap,
  );
});

/** 表示中の世代に該当する図鑑説明（複数バージョン分） */
const flavorEntriesForView = computed<FlavorTextEntry[]>(() => {
  if (!flavorEntries.value.length) return [];
  if (!viewGenerationKey.value) {
    // 現行：最新世代のものを優先
    const latest = flavorEntries.value
      .slice()
      .sort(
        (a, b) =>
          (GENERATION_ORDER[b.generationKey] || 0) -
          (GENERATION_ORDER[a.generationKey] || 0),
      );
    const topRank = GENERATION_ORDER[latest[0]?.generationKey || ""] || 0;
    return latest.filter(
      (e) => (GENERATION_ORDER[e.generationKey] || 0) === topRank,
    );
  }
  return flavorEntries.value.filter(
    (e) => e.generationKey === viewGenerationKey.value,
  );
});

const viewGenerationLabel = computed<string>(() => {
  if (!viewGenerationKey.value) return "最新世代";
  return GENERATION_LABELS[viewGenerationKey.value] || "";
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
    const abilityNames = fetchedPokemon.abilities
      .map((entry) => entry.ability?.name)
      .filter((v): v is string => Boolean(v));
    const eggGroupNames = (fetchedSpecies.egg_groups || [])
      .map((g) => g.name)
      .filter(Boolean);
    const growthRateName = fetchedSpecies.growth_rate?.name;
    const [
      movesMap,
      appearanceData,
      typeMap,
      abilityMap,
      abilityInfo,
      damageRelations,
      eggGroupLabelMap,
      growthRateLabelMap,
    ] = await Promise.all([
      fetchMoveNameMap(fetchedPokemon.moves),
      fetchAppearanceData(fetchedPokemon, fetchedSpecies),
      fetchTypeNameMap(typeNames),
      fetchAbilityNameMap(abilityNames),
      fetchAbilityInfoMap(abilityNames),
      fetchTypeDamageRelations(typeNames),
      fetchNamedResourceLabels("egg-group", eggGroupNames),
      growthRateName
        ? fetchNamedResourceLabels("growth-rate", [growthRateName])
        : Promise.resolve({} as Record<string, string>),
    ]);

    pokemon.value = fetchedPokemon;
    species.value = fetchedSpecies;
    appearance.value = appearanceData;
    moveNameMap.value = movesMap;
    typeNameMap.value = typeMap;
    abilityNameMap.value = abilityMap;
    abilityInfoMap.value = abilityInfo;
    eggGroupLabels.value = eggGroupLabelMap;
    growthRateLabels.value = growthRateLabelMap;
    typeDamageRelations.value = damageRelations;
    evolutionTree.value = null;
    const evoUrl = fetchedSpecies.evolution_chain?.url;
    if (evoUrl) {
      const targetSpeciesId = fetchedSpecies.id;
      buildEvolutionTree(evoUrl)
        .then((tree) => {
          if (species.value?.id === targetSpeciesId) {
            evolutionTree.value = tree;
          }
        })
        .catch((error) => console.error(error));
    }
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
      <section class="view-generation-bar" aria-label="表示世代切替">
        <div class="view-generation-bar__copy">
          <span class="view-generation-bar__title">表示世代</span>
          <span class="view-generation-bar__hint"
            >種族値・タイプ・特性・タイプ相性・図鑑説明が連動します</span
          >
        </div>
        <label class="view-generation-bar__select">
          <span class="visually-hidden">表示世代を選択</span>
          <select v-model="viewGenerationKey" class="view-gen-select">
            <option value="">最新世代</option>
            <option
              v-for="opt in viewGenerationOptions"
              :key="opt.key"
              :value="opt.key"
            >
              {{ opt.label }}
            </option>
          </select>
        </label>
      </section>

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

      <section
        v-if="flavorEntriesForView.length"
        class="info-card flavor-card"
        aria-label="図鑑説明"
      >
        <div class="flavor-header">
          <h2>図鑑の説明</h2>
          <span class="flavor-gen">{{ viewGenerationLabel }}</span>
        </div>
        <ul class="flavor-list">
          <li
            v-for="entry in flavorEntriesForView"
            :key="entry.versionKey"
            class="flavor-item"
          >
            <span class="flavor-version">{{ entry.versionLabel }}</span>
            <p class="flavor-text">{{ entry.text }}</p>
          </li>
        </ul>
      </section>

      <section class="info-grid">
        <article
          v-if="abilityEntries.length"
          class="info-card abilities-card"
          aria-label="特性"
        >
          <h2><span class="card-icon" aria-hidden="true">★</span> 特性</h2>
          <ul class="abilities-list">
            <li
              v-for="ab in abilityEntries"
              :key="ab.key"
              class="ability-item"
              :class="{ 'ability-item--hidden': ab.isHidden }"
            >
              <div class="ability-row">
                <span class="ability-name">{{ ab.nameJa }}</span>
                <span
                  class="ability-badge"
                  :class="
                    ab.isHidden
                      ? 'ability-badge--hidden'
                      : 'ability-badge--normal'
                  "
                  >{{ ab.isHidden ? "隠れ特性" : "通常" }}</span
                >
              </div>
              <p v-if="ab.flavorJa" class="ability-flavor">
                {{ ab.flavorJa }}
              </p>
            </li>
          </ul>
        </article>
        <article
          v-else-if="abilitiesUnavailableNote"
          class="info-card abilities-card abilities-card--empty"
          aria-label="特性"
        >
          <h2><span class="card-icon" aria-hidden="true">★</span> 特性</h2>
          <p class="card-note">{{ abilitiesUnavailableNote }}</p>
        </article>

        <article class="info-card">
          <h2><span class="card-icon" aria-hidden="true">ⓘ</span> 基本情報</h2>
          <div class="basic-grid">
            <div class="basic-cell">
              <span class="basic-label">高さ</span>
              <span class="basic-value">{{ heightLabel }}</span>
            </div>
            <div class="basic-cell">
              <span class="basic-label">重さ</span>
              <span class="basic-value">{{ weightLabel }}</span>
            </div>
            <div class="basic-cell">
              <span class="basic-label">性別比</span>
              <span v-if="genderLabel" class="basic-value basic-value--gender">
                <span class="gender-male">♂ {{ genderLabel.male }}</span>
                <span class="gender-female">♀ {{ genderLabel.female }}</span>
              </span>
              <span v-else class="basic-value">不明</span>
            </div>
            <div class="basic-cell">
              <span class="basic-label">タマゴグループ</span>
              <span class="basic-value">{{ eggGroupsLabel }}</span>
            </div>
            <div class="basic-cell">
              <span class="basic-label">孵化歩数</span>
              <span class="basic-value">{{ hatchStepsLabel }}</span>
            </div>
            <div class="basic-cell">
              <span class="basic-label">成長タイプ</span>
              <span class="basic-value">{{ growthRateLabel }}</span>
            </div>
            <div class="basic-cell">
              <span class="basic-label">基礎なつき度</span>
              <span class="basic-value">{{ baseHappinessLabel }}</span>
            </div>
            <div class="basic-cell">
              <span class="basic-label">捕捉率</span>
              <span class="basic-value">{{ captureRateLabel }}</span>
            </div>
            <div class="basic-cell">
              <span class="basic-label">初登場世代</span>
              <span class="basic-value">{{ generationLabel }}</span>
            </div>
          </div>
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

      <section
        v-if="evolutionTree"
        class="info-card evolution-card"
        aria-label="進化"
      >
        <div class="evolution-header">
          <h2>進化</h2>
          <p v-if="!evolutionTree.children.length" class="card-note">
            このポケモンは進化しません
          </p>
        </div>
        <div class="evolution-canvas">
          <EvolutionTree
            :node="evolutionTree"
            :current-species="species?.name"
          />
        </div>
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

.card-icon {
  display: inline-block;
  margin-right: 6px;
  color: var(--accent, #2f7fd9);
}

.abilities-card .card-icon {
  color: #f0b400;
}

.abilities-list {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.ability-item {
  position: relative;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface-soft, #f7f8fa);
  display: grid;
  gap: 4px;
}

.ability-item--hidden {
  background: #fff8e1;
  border-color: #f3d27a;
}

.ability-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ability-name {
  font-weight: 700;
  font-size: 1rem;
}

.ability-flavor {
  margin: 0;
  color: var(--text-sub);
  font-size: 0.88rem;
  line-height: 1.55;
  white-space: pre-wrap;
}

.ability-badge {
  flex-shrink: 0;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.ability-badge--normal {
  background: #e7ecf3;
  color: #5a6a7d;
}

.ability-badge--hidden {
  background: #f3c64a;
  color: #533c00;
}

.basic-grid {
  margin: 14px 0 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

@media (max-width: 720px) {
  .basic-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.basic-cell {
  display: grid;
  gap: 4px;
  padding: 10px 8px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface-soft, #f7f8fa);
  text-align: center;
}

.basic-label {
  color: var(--text-sub);
  font-size: 0.78rem;
}

.basic-value {
  font-weight: 700;
  font-size: 0.98rem;
}

.basic-value--gender {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.92rem;
}

.gender-male {
  color: #2f7fd9;
}

.gender-female {
  color: #d94f8a;
}

.subheading {
  margin: 16px 0 0;
  color: var(--text-sub);
  font-size: 0.86rem;
}

.view-generation-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 18px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border: 1px solid var(--line);
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.view-generation-bar__copy {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  align-items: baseline;
}

.view-generation-bar__title {
  font-weight: 700;
  font-size: 0.95rem;
}

.view-generation-bar__hint {
  color: var(--text-sub);
  font-size: 0.78rem;
}

.view-generation-bar__select {
  display: inline-flex;
}

.view-gen-select {
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid var(--line);
  background: var(--surface-soft, #f7f8fa)
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%23667' d='M0 0l5 6 5-6z'/></svg>")
    no-repeat right 12px center;
  background-size: 10px 6px;
  color: var(--text);
  border-radius: 999px;
  padding: 6px 32px 6px 14px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  min-width: 160px;
}

.view-gen-select:focus-visible {
  outline: 2px solid var(--accent, #2f7fd9);
  outline-offset: 2px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.flavor-card {
  display: grid;
  gap: 10px;
}

.flavor-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.flavor-gen {
  color: var(--text-sub);
  font-size: 0.84rem;
}

.flavor-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.flavor-item {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--surface-soft, #f7f8fa);
  border-left: 3px solid var(--accent, #2f7fd9);
}

.flavor-version {
  font-size: 0.78rem;
  color: var(--text-sub);
  font-weight: 700;
}

.flavor-text {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  white-space: pre-wrap;
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

.evolution-card {
  display: grid;
  gap: 12px;
}

.evolution-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.evolution-canvas {
  overflow-x: auto;
  padding-bottom: 4px;
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
