<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <span class="tag">{{ label }}</span>
</template>

<style scoped>
.tag {
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 0.85rem;
}
</style>
