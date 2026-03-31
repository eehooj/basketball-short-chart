<script setup lang="ts">
// 부모로부터 데이터를 전달받기 위한 Interface (자바의 DTO 느낌)
interface Props {
  isVisible: boolean;
  leftZoneStats: any[];
  rightZoneStats: any[];
}

const props = defineProps<Props>();

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
        <h2 class="modal-title">구역별 상세 통계</h2>
        <button class="close-x-btn" @click="close">×</button>
      </div>

      <div class="stats-container">
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
      </div> <div class="modal-footer">
      <button class="close-bottom-btn" @click="close">닫기</button>
    </div>
    </div>
  </div>
</template>
