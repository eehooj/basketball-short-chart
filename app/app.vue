<script setup>
import { ref, computed } from 'vue'

const leftShots = ref([])
const rightShots = ref([])

// NBA 규격 비율 기반 설정 (단위: 픽셀)
const WIDTH = 650  // 전체 가로
const HEIGHT = 400 // 전체 세로
const HALF_WIDTH = WIDTH / 2

// 통계 계산
const getStats = (data) => {
  const total = data.length
  const made = data.filter(s => s.type === 'made').length
  const rate = total > 0 ? Math.round((made / total) * 100) : 0
  return { total, made, rate }
}

const leftStats = computed(() => getStats(leftShots.value))
const rightStats = computed(() => getStats(rightShots.value))

const recordShot = (event) => {
  const svg = event.currentTarget
  const pt = svg.createSVGPoint()
  pt.x = event.clientX; pt.y = event.clientY
  const { x, y } = pt.matrixTransform(svg.getScreenCTM().inverse())

  const target = x < HALF_WIDTH ? leftShots : rightShots
  target.value.push({ id: Date.now(), x, y, type: 'made' })
}

// 슛 삭제 함수 추가
const removeShot = (team, id) => {
  if (team === 'left') {
    leftShots.value = leftShots.value.filter(s => s.id !== id)
  } else {
    rightShots.value = rightShots.value.filter(s => s.id !== id)
  }
}

// 슛 상태 변경 함수 (성공/실패)
const toggleShotStatus = (shot) => {
  shot.type = shot.type === 'made' ? 'miss' : 'made'
}
</script>

<template>
  <div class="container">
    <div class="court-wrapper">
      <svg :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" class="main-court" @click="recordShot">
        <rect width="100%" height="100%" fill="#fff" />

        <line :x1="HALF_WIDTH" y1="0" :x2="HALF_WIDTH" :y2="HEIGHT" stroke="#ddd" stroke-width="1" />
        <rect width="100%" height="100%" fill="none" stroke="#eee" stroke-width="1" />

        <g class="court-lines">
          <rect x="0" y="120" width="150" height="160" fill="none" stroke="#ccc" />
          <path d="M 150 150 A 50 50 0 0 1 150 250" fill="none" stroke="#ccc" stroke-dasharray="4" />
          <path d="M 0 30 L 110 30 A 200 200 0 0 1 110 370 L 0 370" fill="none" stroke="#bbb" stroke-width="1.5" />
          <line x1="30" y1="170" x2="30" y2="230" stroke="#bbb" stroke-width="2" />
          <circle cx="45" cy="200" r="10" fill="none" stroke="#bbb" stroke-width="2" />
        </g>

        <g class="court-lines">
          <rect :x="WIDTH-150" y="120" width="150" height="160" fill="none" stroke="#ccc" />
          <path :d="`M ${WIDTH-150} 150 A 50 50 0 0 0 ${WIDTH-150} 250`" fill="none" stroke="#ccc" stroke-dasharray="4" />
          <path :d="`M ${WIDTH} 30 L ${WIDTH-110} 30 A 200 200 0 0 0 ${WIDTH-110} 370 L ${WIDTH} 370`" fill="none" stroke="#bbb" stroke-width="1.5" />
          <line :x1="WIDTH-30" y1="170" :x2="WIDTH-30" :y2="230" stroke="#bbb" stroke-width="2" />
          <circle :cx="WIDTH-45" :cy="200" r="10" fill="none" stroke="#bbb" stroke-width="2" />
        </g>

        <g v-for="(s, i) in leftShots" :key="s.id">
          <circle v-if="s.type==='made'" :cx="s.x" :cy="s.y" r="6" class="marker made red" />
          <text v-else :x="s.x" :y="s.y" dy=".35em" class="marker miss">✕</text>
        </g>

        <g v-for="(s, i) in rightShots" :key="s.id">
          <circle v-if="s.type==='made'" :cx="s.x" :cy="s.y" r="6" class="marker made blue" />
          <text v-else :x="s.x" :y="s.y" dy=".35em" class="marker miss">✕</text>
        </g>
      </svg>

      <p class="hint">팁: 코트 위 마커를 클릭하면 상태가 변합니다.</p>
    </div>

    <div class="footer-stats">
      <div class="stat-box">
        <span class="percent">{{ leftStats.rate }}%</span>
        <span class="count">({{ leftStats.made }}/{{ leftStats.total }})</span>
      </div>
      <div class="stat-box right">
        <span class="percent">{{ rightStats.rate }}%</span>
        <span class="count">({{ rightStats.made }}/{{ rightStats.total }})</span>
      </div>
    </div>

    <div class="log-section">
      <h3>최근 기록 (수정/삭제)</h3>
      <div class="scroll-area">
        <div v-for="s in [...leftShots, ...rightShots].sort((a,b) => b.id - a.id).slice(0, 8)"
             :key="s.id"
             class="log-item">
          <span :class="['status-dot', s.type === 'made' ? 'made-bg' : 'miss-bg']"></span>
          <span class="coord">({{ Math.round(s.x) }}, {{ Math.round(s.y) }})</span>
          <div class="btn-group">
            <button @click="toggleShotStatus(s)">전환</button>
            <button @click="removeShot(s.x < 400 ? 'left' : 'right', s.id)" class="del-btn">삭제</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container { padding: 40px; background: #fff; display: flex; flex-direction: column; align-items: center; }
.court-wrapper { width: 100%; max-width: 900px; border: 1px solid #eee; position: relative; }
.main-court { width: 100%; height: auto; cursor: crosshair; }

/* 슛 마커 스타일 */
.marker {
  /* 핵심: 마커가 마우스 클릭을 가로채지 못하게 함 */
  pointer-events: none;
  user-select: none;
  transition: all 0.2s;
}
.made { fill: none; stroke-width: 2px; }
.made.red { stroke: #e63946; }
.made.blue { stroke: #4895ef; }
.miss { fill: #999; font-size: 16px; font-weight: bold; text-anchor: middle; }

/* 하단 통계 스타일 */
.footer-stats { width: 100%; max-width: 900px; display: flex; justify-content: space-between; margin-top: 20px; padding: 0 20px; }
.stat-box { display: flex; align-items: baseline; gap: 8px; font-family: 'Inter', sans-serif; }
.percent { font-size: 2rem; font-weight: 800; color: #111; }
.count { font-size: 1.2rem; color: #666; font-weight: 500; }
</style>