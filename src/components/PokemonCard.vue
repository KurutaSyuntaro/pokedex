<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import type { Pokemon } from "@/types/pokemon";
import {
  attachSpriteFallback,
  buildSpriteCandidates,
} from "@/composables/usePokeApi";

const props = defineProps<{
  pokemon: Pokemon;
  shiny: boolean;
}>();

const imgRef = ref<HTMLImageElement | null>(null);

function applySprite(): void {
  const img = imgRef.value;
  if (!img) return;
  const candidates = buildSpriteCandidates(
    props.pokemon.id,
    props.pokemon.dexId,
    props.shiny,
  );
  attachSpriteFallback(img, candidates);
}

onMounted(applySprite);
watch(
  () => [props.pokemon.id, props.pokemon.dexId, props.shiny],
  () => applySprite(),
);
</script>

<template>
  <router-link
    class="pokemon-card-link"
    :to="{
      name: 'detail',
      params: { name: pokemon.nameEn },
      query: {
        dex: String(pokemon.dexId),
        ...(shiny ? { shiny: '1' } : {}),
      },
    }"
    :title="
      pokemon.isForm
        ? `#${pokemon.dexId} ${pokemon.nameJa} (${pokemon.nameEn}, form id: ${pokemon.id})`
        : `#${pokemon.dexId} ${pokemon.nameJa} (${pokemon.nameEn})`
    "
  >
    <article class="pokemon-card">
      <img
        ref="imgRef"
        class="sprite"
        :alt="`${pokemon.nameJa} の画像`"
        loading="lazy"
        decoding="async"
      />
      <p class="number">#{{ pokemon.dexId }}</p>
      <p class="name">{{ pokemon.nameJa }}</p>
    </article>
  </router-link>
</template>

<style scoped>
.pokemon-card-link {
  color: inherit;
  text-decoration: none;
}

.pokemon-card-link:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
  border-radius: 10px;
}

.pokemon-card {
  border-radius: 10px;
  text-align: center;
  padding: 6px 2px;
  transition:
    background 0.2s,
    transform 0.2s;
  animation: card-in 0.28s ease both;
}

.pokemon-card:hover {
  background: var(--surface-soft);
  transform: translateY(-2px);
}

.sprite {
  width: 72px;
  height: 72px;
  object-fit: contain;
}

.number {
  margin: 2px 0 0;
  color: #4b5563;
  font-size: 0.9rem;
  font-weight: 700;
}

.name {
  margin: 2px 0 0;
  color: var(--text-sub);
  font-size: 0.72rem;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 720px) {
  .sprite {
    width: 64px;
    height: 64px;
  }
}
</style>
