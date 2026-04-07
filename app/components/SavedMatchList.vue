<script setup lang="ts">
import { ref, computed } from 'vue';

/**
 * [상태 관리]
 */
const isVisible = ref(false);           // 목록 모달 표시 여부
const rawMatches = ref<string[]>([]);   // 서버에서 받아온 전체 키 목록
const expandedGroups = ref<string[]>([]); // 현재 펼쳐진 그룹들의 baseKey 목록

const emit = defineEmits(['select', 'selectGroup']);

/**
 * [헬퍼 함수 - 비밀번호 세션 관리]
 */
const getSessionPassword = () => {
  const auth = JSON.parse(localStorage.getItem('app_auth') || '{}');
  if (auth.password && auth.expiresAt > Date.now()) {
    return auth.password;
  }
  return null;
};

const setSessionPassword = (pw: string) => {
  const expiresAt = Date.now() + 30 * 60 * 1000;
  localStorage.setItem('app_auth', JSON.stringify({ password: pw, expiresAt }));
};

/**
 * [목록 불러오기]
 * 햄버거 메뉴 클릭 시 서버에서 저장된 경기 목록을 가져옵니다.
 */
const openList = async () => {
  let password = getSessionPassword();
  if (!password) {
    password = prompt('비밀번호를 입력해주세요:');
    if (!password) return;
  }

  try {
    // API 호출 시 비밀번호 쿼리 파라미터 추가
    rawMatches.value = await $fetch<string[]>('/api/get-list', {
      query: { password: password }
    });
    setSessionPassword(password); // 성공 시 세션 저장/갱신
    isVisible.value = true;
  } catch (error: any) {
    if (error.status === 401) {
      localStorage.removeItem('app_auth');
      alert('비밀번호가 틀렸습니다. 다시 시도해주세요.');
    } else {
      console.error('[Match List Fetch Error]', error);
      alert('목록을 불러오는 데 실패했습니다.');
    }
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

// 경기 선택 시 부모 컴포넌트로 전달 (단일 쿼터)
const handleSelect = (key: string) => {
  if (!key) return;
  emit('select', key);
  isVisible.value = false; // 모달 닫기
};

// 그룹 전체 선택 (모든 쿼터 합산 로드)
const handleSelectGroup = (baseKey: string, children: string[]) => {
  if (children.length === 0) return;
  emit('selectGroup', baseKey, children);
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
              <div class="group-header">
                <!-- 경기명 클릭 시 해당 경기의 모든 쿼터 데이터 합산 로드 -->
                <div class="main-info" @click="handleSelectGroup(group.baseKey, group.children)" style="cursor: pointer;" title="전체 쿼터 합산해서 보기">
                  <span class="name" style="font-weight: bold; color: #2196F3;">{{ group.baseKey }}</span>
                  <span class="count" style="font-size: 12px; color: #666; margin-left: 8px;">전체보기 ({{ group.children.length }}개)</span>
                </div>
                
                <!-- 하위 쿼터 토글 버튼 -->
                <button class="toggle-btn" @click.stop="toggleGroup(group.baseKey)" style="background: none; border: none; cursor: pointer; padding: 10px;">
                  {{ expandedGroups.includes(group.baseKey) ? '▲' : '▼' }}
                </button>
              </div>

              <!-- 하위 쿼터 목록 -->
              <Transition name="slide-fade">
                <div v-if="expandedGroups.includes(group.baseKey)" class="group-children" style="background: #f9f9f9; padding-left: 20px;">
                  <div v-for="child in group.children"
                       :key="child"
                       class="child-item"
                       @click="handleSelect(child)"
                       style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;">
                    <span class="bullet" style="color: #999; margin-right: 5px;">ㄴ</span> 
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

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  background: #fff;
}

.main-info {
  flex-grow: 1;
  padding: 12px;
}

.main-info:hover {
  background: #f0f7ff;
}
</style>
