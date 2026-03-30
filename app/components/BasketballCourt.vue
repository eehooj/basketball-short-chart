<script setup lang="ts">
import { COURT_CONFIG } from '~/utils/constants'

// 부모(app.vue)로부터 데이터를 받습니다.
defineProps<{
  leftShots: any[]
  rightShots: any[]
}>()

// 부모에게 클릭 이벤트를 전달합니다.
const emit = defineEmits<{
  record: [x: number, y: number]
}>()

const onCourtClick = (event: MouseEvent) => {
  const svg = event.currentTarget as SVGSVGElement
  const pt = svg.createSVGPoint()
  pt.x = event.clientX; pt.y = event.clientY
  const { x, y } = pt.matrixTransform(svg.getScreenCTM()!.inverse())
  // 계산된 좌표만 부모에게 넘깁니다.
  emit('record', x, y)
}
</script>

<template>
  <div class="court-wrapper">
    <svg
        :viewBox="`0 0 ${COURT_CONFIG.WIDTH} ${COURT_CONFIG.HEIGHT}`"
        class="main-court"
        @click="onCourtClick"
    >
      <rect width="100%" height="100%" fill="#fff" />
      <line :x1="COURT_CONFIG.HALF_WIDTH" y1="0" :x2="COURT_CONFIG.HALF_WIDTH" :y2="COURT_CONFIG.HEIGHT" stroke="#ddd" stroke-width="1" />
      <rect width="100%" height="100%" fill="none" stroke="#eee" stroke-width="1" />

      <g class="court-lines">
        <rect x="0" y="120" width="150" height="160" fill="none" stroke="#ccc" />
        <path d="M 150 150 A 50 50 0 0 1 150 250" fill="none" stroke="#ccc" stroke-dasharray="4" />
        <path d="M 0 30 L 110 30 A 200 200 0 0 1 110 370 L 0 370" fill="none" stroke="#bbb" stroke-width="1.5" />
        <line x1="30" y1="170" x2="30" y2="230" stroke="#bbb" stroke-width="2" />
        <circle cx="45" cy="200" r="10" fill="none" stroke="#bbb" stroke-width="2" />
      </g>

      <g class="court-lines">
        <rect :x="COURT_CONFIG.WIDTH-150" y="120" width="150" height="160" fill="none" stroke="#ccc" />
        <path :d="`M ${COURT_CONFIG.WIDTH-150} 150 A 50 50 0 0 0 ${COURT_CONFIG.WIDTH-150} 250`" fill="none" stroke="#ccc" stroke-dasharray="4" />
        <path :d="`M ${COURT_CONFIG.WIDTH} 30 L ${COURT_CONFIG.WIDTH-110} 30 A 200 200 0 0 0 ${COURT_CONFIG.WIDTH-110} 370 L ${COURT_CONFIG.WIDTH} 370`" fill="none" stroke="#bbb" stroke-width="1.5" />
        <line :x1="COURT_CONFIG.WIDTH-30" y1="170" :x2="COURT_CONFIG.WIDTH-30" :y2="230" stroke="#bbb" stroke-width="2" />
        <circle :cx="COURT_CONFIG.WIDTH-45" :cy="200" r="10" fill="none" stroke="#bbb" stroke-width="2" />
      </g>

      <g v-for="s in leftShots" :key="s.id">
        <circle v-if="s.type==='made'" :cx="s.x" :cy="s.y" r="6" class="marker made red" />
        <text v-else :x="s.x" :y="s.y" dy=".35em" class="marker miss">✕</text>
      </g>

      <g v-for="s in rightShots" :key="s.id">
        <circle v-if="s.type==='made'" :cx="s.x" :cy="s.y" r="6" class="marker made blue" />
        <text v-else :x="s.x" :y="s.y" dy=".35em" class="marker miss">✕</text>
      </g>
    </svg>
    <p class="hint">팁: 코트 위 마커를 클릭하면 상태가 변합니다.</p>
  </div>
</template>

<style scoped>
/* 이전 코드의 스타일을 그대로 가져왔습니다. */
.court-wrapper { width: 100%; max-width: 900px; border: 1px solid #eee; position: relative; margin-bottom: 20px; }
.main-court { width: 100%; height: auto; cursor: crosshair; display: block; }
</style>