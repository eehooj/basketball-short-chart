<script setup lang="ts">
// 부모(app.vue)로부터 최근 슛 목록을 받습니다.
defineProps<{
  logs: any[]
}>()

// 부모에게 수정/삭제 이벤트를 보냅니다.
const emit = defineEmits(['toggle', 'remove'])
</script>

<template>
  <div class="log-section">
    <h3>최근 기록 (수정/삭제)</h3>
    <div class="scroll-area">
      <div v-if="logs.length === 0" class="empty-msg">
        기록된 슛이 없습니다.
      </div>

      <div v-for="s in logs" :key="s.id" class="log-item">
        <span :class="['status-dot', s.type === 'made' ? 'made-bg' : 'miss-bg']"></span>
        <span class="coord">({{ Math.round(s.x) }}, {{ Math.round(s.y) }})</span>
        <div class="btn-group">
          <button @click="emit('toggle', s)">전환</button>
          <button @click="emit('remove', s.id)" class="del-btn">삭제</button>
        </div>
      </div>
    </div>
  </div>
</template>

