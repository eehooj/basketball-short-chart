<script setup lang="ts">
import { computed, ref } from 'vue' // ref가 빠졌다면 추가

const {
  leftShots, rightShots, addShot, removeShot,
  toggleStatus, leftStats, rightStats, resetData,
  leftZoneStats, rightZoneStats
} = useShotChart()

const recentLogs = computed(() => {
  return [...leftShots.value, ...rightShots.value]
      .sort((a, b) => b.id - a.id)
      /*.slice(0, 8)*/
})

const isStatsVisible = ref(false)
const toggleStats = () => isStatsVisible.value = !isStatsVisible.value

</script>

<template>
  <div class="shot-tracker-page">
    <div class="top-controls-row">
      <div class="action-bar">
        <button class="reset-btn" @click="resetData">슛 초기화</button>
        <button class="stats-toggle-btn" @click="toggleStats">
          {{ isStatsVisible ? '통계 숨기기' : '구역별 통계 보기' }}
        </button>
      </div>

      <div class="stats-flex-container court-overlay">
        <div class="stats-item">
          <span class="team-label home">LEFT</span>
          <ShotStats :stats="leftStats" />
        </div>

        <div class="stats-item">
          <span class="team-label away">RIGHT</span>
          <ShotStats :stats="rightStats" isRight />
        </div>
      </div>
    </div>

    <BasketballCourt
        :leftShots="leftShots"
        :rightShots="rightShots"
        @record="addShot"
    />

    <ShotStatsModal
        :isVisible="isStatsVisible"
        :leftZoneStats="leftZoneStats"
        :rightZoneStats="rightZoneStats"
        @close="toggleStats"
    />

    <ShotLog
        :logs="recentLogs"
        @toggle="toggleStatus"
        @remove="removeShot"
    />
  </div>
</template>
