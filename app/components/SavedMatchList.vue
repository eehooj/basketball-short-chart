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
    rawMatches.value = await $fetch<string[]>('/api/get-list', {
      query: { password: password }
    });
    setSessionPassword(password);
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
 */
const groupedMatches = computed(() => {
  const groups: Record<string, { children: string[] }> = {};

  rawMatches.value.forEach(key => {
    const splitIndex = key.lastIndexOf('_');
    const baseKey = splitIndex > -1 ? key.substring(0, splitIndex) : key;

    if (!groups[baseKey]) {
      groups[baseKey] = { children: [] };
    }
    groups[baseKey].children.push(key);
  });

  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([baseKey, group]) => ({
      baseKey,
      children: group.children.sort()
    }));
});

/**
 * [이벤트 핸들러]
 */
const toggleGroup = (baseKey: string) => {
  const index = expandedGroups.value.indexOf(baseKey);
  if (index > -1) {
    expandedGroups.value.splice(index, 1);
  } else {
    expandedGroups.value.push(baseKey);
  }
};

const handleSelect = (key: string) => {
  if (!key) return;
  emit('select', key);
  isVisible.value = false;
};

const handleSelectGroup = (baseKey: string, children: string[]) => {
  if (children.length === 0) return;
  emit('selectGroup', baseKey, children);
  isVisible.value = false;
};

/**
 * [데이터 삭제 로직]
 */
const deleteSingleRecord = async (key: string) => {
  if (!confirm(`[${key}] 기록을 삭제하시겠습니까?`)) return;

  const password = getSessionPassword();
  if (!password) return alert('비밀번호 정보가 없습니다. 목록을 다시 열어주세요.');

  try {
    const res = await $fetch<{ success: boolean }>('/api/delete-shot', {
      method: 'DELETE',
      query: { key, password }
    });

    if (res.success) {
      rawMatches.value = rawMatches.value.filter(k => k !== key);
    }
  } catch (error: any) {
    alert(error.statusText || '삭제 실패');
  }
};

const deleteGroupRecords = async (baseKey: string, keys: string[]) => {
  if (!confirm(`[${baseKey}] 경기의 모든 기록(${keys.length}개)을 삭제하시겠습니까?`)) return;

  const password = getSessionPassword();
  if (!password) return alert('비밀번호 정보가 없습니다.');

  try {
    // 모든 삭제 요청 실행 및 결과 수집
    const results = await Promise.allSettled(keys.map(key => 
      $fetch('/api/delete-shot', { method: 'DELETE', query: { key, password } })
    ));
    
    // 성공한 키와 실패한 에러 필터링
    const failed = results.filter(r => r.status === 'rejected');
    const successKeys = keys.filter((_, i) => results[i].status === 'fulfilled');

    // 성공한 데이터 목록 반영
    rawMatches.value = rawMatches.value.filter(k => !successKeys.includes(k));

    if (failed.length > 0) {
      console.error('[Bulk Delete Partial Failure]', failed);
      alert(`${failed.length}개의 기록 삭제에 실패했습니다. 상세 내용은 콘솔을 확인해주세요.`);
      
      // 만약 인증 오류가 포함되어 있다면 세션 만료 처리
      if (failed.some(f => (f as any).reason?.status === 401)) {
        localStorage.removeItem('app_auth');
      }
    } else {
      alert('전체 삭제되었습니다.');
    }
  } catch (error: any) {
    console.error('[Bulk Delete Critical Error]', error);
    alert('기록 삭제 중 예기치 못한 오류가 발생했습니다.');
  }
};
</script>

<template>
  <div class="match-list-wrapper">
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
            <div v-if="groupedMatches.length === 0" class="no-data">
              저장된 경기 기록이 없습니다.
            </div>

            <div v-for="group in groupedMatches" :key="group.baseKey" class="match-group">
              <div class="group-header">
                <div class="main-info" @click="handleSelectGroup(group.baseKey, group.children)">
                  <span class="name">{{ group.baseKey }}</span>
                  <span class="count">전체보기 ({{ group.children.length }}개)</span>
                </div>
                
                <div class="header-actions">
                  <button class="delete-group-btn" @click.stop="deleteGroupRecords(group.baseKey, group.children)" title="전체 삭제">🗑️</button>
                  <button class="toggle-btn" @click.stop="toggleGroup(group.baseKey)">
                    {{ expandedGroups.includes(group.baseKey) ? '▲' : '▼' }}
                  </button>
                </div>
              </div>

              <Transition name="slide-fade">
                <div v-if="expandedGroups.includes(group.baseKey)" class="group-children">
                  <div v-for="child in group.children"
                       :key="child"
                       class="child-item">
                    <div class="child-info" @click="handleSelect(child)">
                      <span class="bullet">ㄴ</span> 
                      {{ child.split('_')[1] || '기타' }}
                    </div>
                    <button class="delete-item-btn" @click.stop="deleteSingleRecord(child)" title="삭제">×</button>
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
.match-list-wrapper { display: inline-block; }
.hamburger-btn {
  height: 40px; background: #333; color: white; border: none; padding: 0 15px;
  border-radius: 4px; cursor: pointer; font-weight: bold; box-sizing: border-box;
  display: flex; align-items: center; justify-content: center;
}
.hamburger-btn:hover { background: #444; }
.match-list-modal { max-width: 500px; width: 90%; max-height: 80vh; display: flex; flex-direction: column; }
.modal-body { overflow-y: auto; padding: 15px; }
.group-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; background: #fff; }
.main-info { flex-grow: 1; padding: 12px; cursor: pointer; }
.main-info:hover { background: #f0f7ff; }
.name { font-weight: bold; color: #2196F3; }
.count { font-size: 12px; color: #666; margin-left: 8px; }
.header-actions { display: flex; align-items: center; gap: 5px; padding-right: 10px; }
.delete-group-btn { background: none; border: none; cursor: pointer; font-size: 14px; opacity: 0.5; transition: 0.2s; }
.delete-group-btn:hover { opacity: 1; transform: scale(1.1); }
.toggle-btn { background: none; border: none; cursor: pointer; padding: 10px; }
.group-children { background: #f9f9f9; padding-left: 20px; }
.child-item { padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.child-info { flex-grow: 1; cursor: pointer; }
.bullet { color: #999; margin-right: 5px; }
.delete-item-btn { background: none; border: none; color: #ff5252; cursor: pointer; padding: 5px 10px; font-weight: bold; font-size: 18px; }
.delete-item-btn:hover { transform: scale(1.2); }
.no-data { text-align: center; padding: 40px 20px; color: #999; }

/* 애니메이션 */
.fade-scale-enter-active, .fade-scale-leave-active { transition: all 0.3s ease; }
.fade-scale-enter-from, .fade-scale-leave-to { opacity: 0; transform: scale(0.9); }
.slide-fade-enter-active { transition: all 0.2s ease-out; }
.slide-fade-leave-active { transition: all 0.1s cubic-bezier(1, 0.5, 0.8, 1); }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateY(-10px); opacity: 0; }
</style>
