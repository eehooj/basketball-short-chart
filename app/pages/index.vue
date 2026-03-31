<script setup lang="ts">
import { computed, ref } from 'vue' // ref가 빠졌다면 추가

const {
  leftShots, rightShots, addShot, removeShot,
  toggleStatus, leftStats, rightStats, resetData,
  leftZoneStats, rightZoneStats,
  players, addPlayer, removePlayer
} = useShotChart()

const recentLogs = computed(() => {
  return [...leftShots.value, ...rightShots.value]
      .sort((a, b) => b.id - a.id)
      /*.slice(0, 8)*/
})

const isStatsVisible = ref(false)
const toggleStats = () => isStatsVisible.value = !isStatsVisible.value

const currentPlayer = ref('선수1');      // 현재 슛을 기록할 선수
const newPlayerName = ref('');

const handleAddPlayer = () => {
  if (newPlayerName.value.trim()) {
    addPlayer(newPlayerName.value.trim()); // useShotChart의 addPlayer 호출
    newPlayerName.value = ''; // 입력창 비우기
  }
};

const handleRemovePlayer = (name: string) => {
  if (confirm(`${name} 선수를 삭제하시겠습니까?`)) {
    removePlayer(name);
    if (currentPlayer.value === name) {
      currentPlayer.value = players.value[0] || ''; // 삭제 후 첫 번째 선수로 변경
    }
  }
};
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
        @record="(x, y) => addShot(x, y, true, currentPlayer)"
    />

    <ShotStatsModal
        :isVisible="isStatsVisible"
        :leftZoneStats="leftZoneStats"
        :rightZoneStats="rightZoneStats"
        @close="toggleStats"
    />

    <div class="bottom-content-area">
      <ShotLog
          :logs="recentLogs"
          @toggle="toggleStatus"
          @remove="removeShot"
      />

      <div class="player-management">
        <h3>선수 관리</h3>

        <div class="current-shooter-info">
          현재 슈터: <strong>{{ currentPlayer || '선수를 선택하세요' }}</strong>
        </div>

        <div class="add-player">
          <input
              v-model="newPlayerName"
              placeholder="선수 이름 입력"
              @keyup.enter="handleAddPlayer"
          />
          <button @click="handleAddPlayer">추가</button>
        </div>

        <div class="player-list">
          <div
              v-for="name in players"
              :key="name"
              class="player-item"
          >
            <button
                :class="{ active: currentPlayer === name }"
                @click="currentPlayer = name"
            >
              {{ name }}
            </button>

            <button
                class="delete-player-btn"
                @click.stop="handleRemovePlayer(name)"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>
