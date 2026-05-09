<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import type { EvolutionNode } from "@/types/pokemon";
import { attachSpriteFallback } from "@/composables/usePokeApi";

const props = defineProps<{ node: EvolutionNode; currentSpecies?: string }>();

const spriteRef = ref<HTMLImageElement | null>(null);

function applySprite() {
  if (!spriteRef.value || !props.node.spriteCandidates.length) return;
  attachSpriteFallback(spriteRef.value, props.node.spriteCandidates);
}

onMounted(applySprite);
watch(() => props.node.speciesId, applySprite);
</script>

<template>
  <div class="evo-branch">
    <div class="evo-row">
      <div
        class="evo-node"
        :class="{ 'evo-node--current': node.speciesName === currentSpecies }"
      >
        <router-link
          class="evo-link"
          :to="{ name: 'detail', params: { name: node.speciesName } }"
        >
          <div class="evo-sprite-wrap">
            <img
              ref="spriteRef"
              class="evo-sprite"
              :alt="`${node.nameJa} の画像`"
              loading="lazy"
              decoding="async"
            />
          </div>
          <p class="evo-name">{{ node.nameJa }}</p>
          <p v-if="node.speciesId" class="evo-number">
            #{{ String(node.speciesId).padStart(4, "0") }}
          </p>
        </router-link>
      </div>

      <div v-if="node.children.length" class="evo-children">
        <div
          v-for="child in node.children"
          :key="child.speciesName"
          class="evo-child-row"
        >
          <div class="evo-arrow">
            <span class="evo-arrow-mark">→</span>
            <span v-if="child.conditions.length" class="evo-conditions">
              <span
                v-for="(cond, i) in child.conditions"
                :key="i"
                class="evo-condition"
                >{{ cond }}</span
              >
            </span>
            <span v-else class="evo-condition evo-condition--unknown"
              >進化条件不明</span
            >
          </div>
          <EvolutionTree :node="child" :current-species="currentSpecies" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default { name: "EvolutionTree" };
</script>

<style scoped>
.evo-branch {
  display: inline-block;
}

.evo-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.evo-node {
  flex: 0 0 auto;
}

.evo-link {
  display: grid;
  justify-items: center;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  text-decoration: none;
  min-width: 110px;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.evo-link:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.evo-node--current .evo-link {
  border-color: var(--accent, #2f7fd9);
  background: linear-gradient(180deg, #f7fbff 0%, #eef7f5 100%);
  box-shadow: 0 0 0 2px rgba(47, 127, 217, 0.18);
}

.evo-sprite-wrap {
  width: 88px;
  height: 88px;
  display: grid;
  place-items: center;
}

.evo-sprite {
  width: 88px;
  height: 88px;
  object-fit: contain;
}

.evo-name {
  margin: 0;
  font-weight: 700;
  font-size: 0.95rem;
}

.evo-number {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-sub);
}

.evo-children {
  display: grid;
  gap: 14px;
}

.evo-child-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.evo-arrow {
  display: grid;
  justify-items: center;
  gap: 4px;
  color: var(--text-sub);
  min-width: 110px;
}

.evo-arrow-mark {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--accent, #2f7fd9);
}

.evo-conditions {
  display: grid;
  gap: 2px;
  text-align: center;
}

.evo-condition {
  display: inline-block;
  font-size: 0.78rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-soft, #f7f8fa);
  color: var(--text);
  white-space: nowrap;
}

.evo-condition--unknown {
  color: var(--text-sub);
  background: transparent;
}

@media (max-width: 720px) {
  .evo-row {
    flex-direction: column;
    align-items: stretch;
  }
  .evo-child-row {
    flex-direction: column;
    align-items: center;
  }
  .evo-arrow-mark {
    transform: rotate(90deg);
  }
}
</style>
