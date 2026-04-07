<script setup lang="ts">
import { ref, computed } from 'vue';

/**
 * [상태 관리]
 */
const isVisible = ref(false);           // 목록 모달 표시 여부
const rawMatches = ref<string[]>([]);   // 서버에서 받아온 전체 키 목록
const expandedGroups = ref<string[]>([]); // 현재 펼쳐진 그룹들의 baseKey 목록

const emit = defineEmits(['select']);

/**
 * [목록 불러오기]
 * 햄버거 메뉴 클릭 시 서버에서 저장된 경기 목록을 가져옵니다.
 */
const openList = async () => {
  const password = prompt('비밀번호를 입력해주세요:');
  if (!password) return;

  try {
    // API 호출 시 비밀번호 쿼리 파라미터 추가
    rawMatches.value = await $fetch<string[]>('/api/get-list', {
      query: { password: password }
    });
    isVisible.value = true;
  } catch (error: any) {
    console.error('[Match List Fetch Error]', error);
    const msg = error.statusText || '비밀번호가 틀렸거나 목록을 불러오는 데 실패했습니다.';
    alert(msg);
  }
};

/**
 * [Computed - 데이터 그룹화]
 * 평면 리스트를 { baseKey: { children: ['1쿼터키', ...] } } 구조로 변환
 */
const groupedMatches = computed(() => {
  const groups: Record<string, { children: string[] }> = {};

  rawMatches.value.forEach(key => {
    // "_"를 기준으로 baseKey(날짜-경기명)와 tag(쿼터/연장)를 분리
    const splitIndex = key.lastIndexOf('_');
    const baseKey = splitIndex > -1 ? key.substring(0, splitIndex) : key;

    if (!groups[baseKey]) {
      groups[baseKey] = { children: [] };
    }
    groups[baseKey].children.push(key);
  });

  // 그룹 목록을 최신 날짜 순으로 정렬하여 배열로 반환
  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([baseKey, group]) => ({
      baseKey,
      children: group.children.sort() // 1쿼터, 2쿼터 순 정렬
    }));
});

/**
 * [이벤트 핸들러]
 */
// 그룹 펼치기/접기 토글
const toggleGroup = (baseKey: string) => {
  const index = expandedGroups.value.indexOf(baseKey);
  if (index > -1) {
    expandedGroups.value.splice(index, 1);
  } else {
    expandedGroups.value.push(baseKey);
  }
};

// 경기 선택 시 부모 컴포넌트로 전달
const handleSelect = (key: string) => {
  if (!key) return;
  emit('select', key);
  isVisible.value = false; // 모달 닫기
};
</script>

<template>
  <div class="match-list-wrapper">
    <!-- 햄버거 버튼 -->
    <button class="hamburger-btn" @click="openList" title="저장된 경기 목록 보기">
      ☰ 기록 목록
    </button>

    <Transition name="fade-scale">
      <div v-if="isVisible" class="modal-overlay" @click.self="isVisible = false">
        <div class="modal-content match-list-modal">
          <div class="modal-header">
            <h3>저장된 경기 목록</h3>
            <button class="close-btn" @click="isVisible = false">✕</button>
          </div>

          <div class="modal-body">
            <!-- 저장된 데이터가 없는 경우 -->
            <div v-if="groupedMatches.length === 0" class="no-data">
              저장된 경기 기록이 없습니다.
            </div>

            <!-- 그룹별 목록 렌더링 -->
            <div v-for="group in groupedMatches" :key="group.baseKey" class="match-group">
              <div class="group-header" @click="toggleGroup(group.baseKey)">
                <!-- 그룹 메인 정보 -->
                <div class="main-info">
                  <span class="name">{{ group.baseKey }}</span>
                  <span class="count">({{ group.children.length }}개 기록)</span>
                </div>
                
                <!-- 하위 쿼터 토글 버튼 -->
                <button class="toggle-btn">
                  {{ expandedGroups.includes(group.baseKey) ? '▲' : '▼' }}
                </button>
              </div>

              <!-- 하위 쿼터 목록 -->
              <Transition name="slide-fade">
                <div v-if="expandedGroups.includes(group.baseKey)" class="group-children">
                  <div v-for="child in group.children"
                       :key="child"
                       class="child-item"
                       @click.stop="handleSelect(child)">
                    <span class="bullet">ㄴ</span> 
                    {{ child.split('_')[1] || '기타' }}
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

<style scoped>
/* 컴포넌트 내부 스타일 정돈 */
.match-list-wrapper {
  display: inline-block;
}

.hamburger-btn {
  height: 40px; /* 높이 통일 */
  background: #333;
  color: white;
  border: none;
  padding: 0 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hamburger-btn:hover {
  background: #444;
}

.match-list-modal {
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-body {
  overflow-y: auto;
  padding: 15px;
}
</style>
