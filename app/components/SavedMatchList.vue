<script setup lang="ts">
import { ref, computed } from 'vue';

const isVisible = ref(false);
const rawMatches = ref<string[]>([]);
const expandedGroups = ref<string[]>([]); // 열려있는 그룹 관리

const emit = defineEmits(['select']);

const openList = async () => {
  try {
    rawMatches.value = await $fetch<string[]>('/api/get-list');
    isVisible.value = true;
  } catch (error) {
    console.error('로드 실패:', error);
  }
};

// 🚩 핵심: 평면 리스트를 계층 구조로 변환하는 로직
const groupedMatches = computed(() => {
  const groups: Record<string, { main: string; children: string[] }> = {};

  rawMatches.value.forEach(key => {
    // 예: "2026-04-06-상대편_1쿼터" -> "2026-04-06-상대편" 추출
    const baseKey = key.split('_')[0];
    const isFinal = key.includes('_최종');

    if (!groups[baseKey]) {
      groups[baseKey] = { main: '', children: [] };
    }

    if (isFinal) {
      groups[baseKey].main = key;
    } else {
      groups[baseKey].children.push(key);
    }
  });

  // 자식(쿼터) 순서 정렬
  Object.values(groups).forEach(g => g.children.sort());

  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])); // 최신순 정렬
});

const toggleGroup = (baseKey: string) => {
  const index = expandedGroups.value.indexOf(baseKey);
  if (index > -1) expandedGroups.value.splice(index, 1);
  else expandedGroups.value.push(baseKey);
};

const handleSelect = (key: string) => {
  emit('select', key);
  isVisible.value = false;
};
</script>

<template>
  <div class="match-list-wrapper">
    <button class="hamburger-btn" @click="openList">☰ 기록 목록</button>

    <Transition name="fade-scale">
      <div v-if="isVisible" class="modal-overlay" @click.self="isVisible = false">
        <div class="modal-content">
          <div class="modal-header">
            <h3>저장된 경기 (그룹별)</h3>
            <button @click="isVisible = false">✕</button>
          </div>

          <div class="modal-body">
            <div v-for="[baseKey, group] in groupedMatches" :key="baseKey" class="match-group">

              <div class="group-header" :class="{ 'has-final': group.main }">
                <div class="main-info" @click="group.main ? handleSelect(group.main) : null">
                  <span class="label">최종</span>
                  <span class="name">{{ group.main || baseKey }}</span>
                </div>
                <button v-if="group.children.length > 0"
                        class="toggle-btn"
                        @click.stop="toggleGroup(baseKey)">
                  {{ expandedGroups.includes(baseKey) ? '▲' : '▼' }}
                </button>
              </div>

              <Transition name="slide-fade">
                <div v-if="expandedGroups.includes(baseKey)" class="group-children">
                  <div v-for="child in group.children"
                       :key="child"
                       class="child-item"
                       @click="handleSelect(child)">
                    <span class="bullet">ㄴ</span> {{ child.split('_')[1] || child }}
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
