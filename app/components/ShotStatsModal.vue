<script setup lang="ts">
import { computed } from 'vue';

// 부모로부터 데이터를 전달받기 위한 Interface (자바의 DTO 느낌)
interface Props {
  isVisible: boolean;
  leftZoneStats: any[];
  rightZoneStats: any[];
  filterPlayer: string;
}

const props = defineProps<Props>();

// 좌측과 우측 통계를 합산한 전체 통계 계산
const totalZoneStats = computed(() => {
  return props.leftZoneStats.map((left, index) => {
    const right = props.rightZoneStats[index];
    const made = left.made + (right?.made || 0);
    const attempts = left.attempts + (right?.attempts || 0);
    const percentage = attempts > 0 ? Math.round((made / attempts) * 100) : 0;
    
    return {
      name: left.name,
      made,
      attempts,
      percentage
    };
  });
});

// 부모에게 "창 닫아줘!"라고 신호를 보내기 위한 정의
const emit = defineEmits(['close']);

const close = () => {
  emit('close');
};
</script>

<template>
  <!-- 통계 모달   -->
  <div v-if="props.isVisible" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title"> {{ props.filterPlayer }} 구역별 상세 통계</h2>
        <button class="close-x-btn" @click="close">×</button>
      </div>

      <div class="stats-container">
        <!-- 좌측 구역 통계 -->
        <div class="stats-box">
          <h3 class="team-label home">LEFT 구역별 통계</h3>
          <table>
            <thead>
            <tr><th>구역</th><th>성공/시도</th><th>확률</th></tr>
            </thead>
            <tbody>
            <tr v-for="stat in leftZoneStats" :key="stat.name">
              <td>{{ stat.name }}</td>
              <td>{{ stat.made }} / {{ stat.attempts }}</td>
              <td :class="{
                'high-rate': stat.percentage >= 70,
                'zero-rate': stat.percentage == 0 }">{{ stat.percentage }}%</td>
            </tr>
            </tbody>
          </table>
        </div>

        <!-- 우측 구역 통계 -->
        <div class="stats-box is-right">
          <h3 class="team-label away">RIGHT 구역별 통계</h3>
          <table>
            <thead>
            <tr><th>구역</th><th>성공/시도</th><th>확률</th></tr>
            </thead>
            <tbody>
            <tr v-for="stat in rightZoneStats" :key="stat.name">
              <td>{{ stat.name }}</td>
              <td>{{ stat.made }} / {{ stat.attempts }}</td>
              <td :class="{
                'high-rate': stat.percentage >= 70,
                'zero-rate': stat.percentage == 0 }">{{ stat.percentage }}%</td>
            </tr>
            </tbody>
          </table>
        </div>

        <!-- 전체(좌+우) 합계 통계 추가 -->
        <div class="stats-box total-stats">
          <h3 class="team-label total">TOTAL 구역별 합계</h3>
          <table>
            <thead>
            <tr><th>구역</th><th>성공/시도</th><th>확률</th></tr>
            </thead>
            <tbody>
            <tr v-for="stat in totalZoneStats" :key="stat.name">
              <td>{{ stat.name }}</td>
              <td>{{ stat.made }} / {{ stat.attempts }}</td>
              <td :class="{
                'high-rate': stat.percentage >= 70,
                'zero-rate': stat.percentage == 0 }">{{ stat.percentage }}%</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="close-bottom-btn" @click="close">닫기</button>
      </div>
    </div>
  </div>
</template>
