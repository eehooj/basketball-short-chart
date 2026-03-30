<script setup lang="ts">
// Composable에서 로직을 가져옵니다. (자동 import)
const { leftShots, rightShots, addShot, removeShot, toggleStatus, leftStats, rightStats } = useShotChart()

// 최근 기록 리스트용 계산
const recentLogs = computed(() => {
  return [...leftShots.value, ...rightShots.value]
      .sort((a, b) => b.id - a.id) // 최신순 정렬
      .slice(0, 8) // 8개만 표시
})
</script>

<template>
  <div class="container">
    <BasketballCourt
        :leftShots="leftShots"
        :rightShots="rightShots"
        @record="addShot"
    />

    <div class="footer-stats">
      <ShotStats :stats="leftStats" />
      <ShotStats :stats="rightStats" isRight />
    </div>

    <ShotLog
        :logs="recentLogs"
        @toggle="toggleStatus"
        @remove="removeShot"
    />
  </div>
</template>

<style>
/* 전역 스타일 (폰트 등) */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;800&display=swap');
body { margin: 0; font-family: sans-serif; }
</style>

<style scoped>
/* 메인 레이아웃 스타일 */
.container {
  padding: 40px;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 통계 배치 스타일 */
.footer-stats {
  width: 100%;
  max-width: 900px;
  display: flex;
  justify-content: space-between;
  margin-top: 10px; /* 코트와의 간격 좁힘 */
  padding: 0 20px;
}
</style>