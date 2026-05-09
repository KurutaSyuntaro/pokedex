<script setup lang="ts">
import { computed } from "vue";
import type { MoveEntry } from "@/types/pokemon";
import { MOVE_METHOD_ORDER } from "@/data/formRules";

const props = defineProps<{
  moves: MoveEntry[];
  latestGenerationLabel: string;
}>();

interface MoveGroup {
  methodKey: string;
  methodLabel: string;
  items: MoveEntry[];
}

const groupedMoves = computed<MoveGroup[]>(() => {
  const grouped = new Map<string, MoveEntry[]>();
  for (const move of props.moves) {
    const bucket = grouped.get(move.methodKey) || [];
    bucket.push(move);
    grouped.set(move.methodKey, bucket);
  }

  const result: MoveGroup[] = [];
  for (const methodKey of MOVE_METHOD_ORDER) {
    const bucket = grouped.get(methodKey);
    if (!bucket || !bucket.length) continue;
    const sorted = bucket.slice();
    if (methodKey === "level-up") {
      sorted.sort((a, b) => {
        const levelA = a.level ?? Number.MAX_SAFE_INTEGER;
        const levelB = b.level ?? Number.MAX_SAFE_INTEGER;
        if (levelA !== levelB) return levelA - levelB;
        return a.nameJa.localeCompare(b.nameJa, "ja");
      });
    } else {
      sorted.sort((a, b) => a.nameJa.localeCompare(b.nameJa, "ja"));
    }
    result.push({
      methodKey,
      methodLabel: sorted[0].methodLabel,
      items: sorted,
    });
  }
  return result;
});
</script>

<template>
  <p class="card-note count">
    {{ moves.length }}件 / {{ latestGenerationLabel }}
  </p>
  <div class="move-groups">
    <p v-if="!groupedMoves.length" class="card-note">
      習得技データがありません。
    </p>
    <section
      v-for="group in groupedMoves"
      :key="group.methodKey"
      class="move-group"
    >
      <div class="move-group-header">
        <h3 class="move-group-title">{{ group.methodLabel }}</h3>
        <span class="move-group-count">{{ group.items.length }}件</span>
      </div>
      <ul class="move-list">
        <li
          v-for="move in group.items"
          :key="`${group.methodKey}-${move.nameEn}-${move.level ?? ''}`"
          class="move-item"
        >
          <span class="move-name">{{ move.nameJa }}</span>
          <span class="move-meta">{{ move.meta }} / {{ move.nameEn }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.count {
  margin: 0 0 12px;
}

.move-groups {
  display: grid;
  gap: 18px;
}

.move-group {
  display: grid;
  gap: 12px;
}

.move-group-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.move-group-title {
  margin: 0;
  font-size: 0.98rem;
}

.move-group-count {
  color: var(--text-sub);
  font-size: 0.84rem;
}

.move-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
}

.move-item {
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fbfdff;
}

.move-name {
  display: block;
  font-weight: 700;
}

.move-meta {
  display: block;
  margin-top: 4px;
  color: var(--text-sub);
  font-size: 0.82rem;
}

.card-note {
  margin: 0;
  color: var(--text-sub);
  font-size: 0.88rem;
}

@media (max-width: 800px) {
  .move-list {
    grid-template-columns: 1fr;
  }
}
</style>
