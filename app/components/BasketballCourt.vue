<script setup lang="ts">
import { COURT_CONFIG } from '~/utils/constants'
const props = defineProps(['leftShots', 'rightShots'])
const emit = defineEmits(['record'])

const onCourtClick = (event: MouseEvent) => {
  const svg = event.currentTarget as SVGSVGElement
  const pt = svg.createSVGPoint()
  pt.x = event.clientX; pt.y = event.clientY
  const { x, y } = pt.matrixTransform(svg.getScreenCTM()!.inverse())
  emit('record', x, y)
}
</script>

<template>
  <div class="court-wrapper">
    <svg :viewBox="`0 0 ${COURT_CONFIG.WIDTH} ${COURT_CONFIG.HEIGHT}`" class="main-court" @click="onCourtClick">
      <rect width="100%" height="100%" fill="#fff" />
      <line :x1="COURT_CONFIG.HALF_WIDTH" y1="0" :x2="COURT_CONFIG.HALF_WIDTH" :y2="COURT_CONFIG.HEIGHT" stroke="#ddd" />

      <g v-for="s in [...leftShots, ...rightShots]" :key="s.id">
        <circle v-if="s.type==='made'" :cx="s.x" :cy="s.y" r="6" :class="['marker made', s.x < COURT_CONFIG.HALF_WIDTH ? 'red' : 'blue']" />
        <text v-else :x="s.x" :y="s.y" dy=".35em" class="marker miss">✕</text>
      </g>
    </svg>
  </div>
</template>