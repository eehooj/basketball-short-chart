<script setup lang="ts">
defineProps<{
  stats: { total: number; made: number; rate: number }
  isRight?: boolean // 오른쪽 팀인지 여부 (스타일 분리용)
}>()
</script>

<template>
  <div :class="['stat-box', { right: isRight }]">
    <span class="percent">{{ stats.rate }}%</span>
    <span class="count">({{ stats.made }}/{{ stats.total }})</span>
  </div>
</template>
