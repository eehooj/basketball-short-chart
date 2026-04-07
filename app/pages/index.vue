<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { useShotChart, type BasketballShot } from '../composables/useShotChart' // BasketballShot으로 변경
import ShotStats from "../components/ShotStats.vue";
import BasketballCourt from "../components/BasketballCourt.vue";
import ShotStatsModal from "../components/ShotStatsModal.vue";
import ShotLog from "../components/ShotLog.vue";
import SavedMatchList from '../components/SavedMatchList.vue'

/**
 * [타입 정의]
 * 서버와 주고받는 데이터 구조 정의
 */
interface ShotData {
  leftShots: BasketballShot[];
  rightShots: BasketballShot[];
  players: string[];
  updatedAt?: string;
}

/**
 * [상태 관리 - 기본 정보]
 */
const selectedDate = ref(new Date().toISOString().split('T')[0]); // 오늘 날짜
const matchName = ref('상대편');                                   // 경기명
const saveTag = ref('1쿼터');                                      // 초기값을 1쿼터로 변경
const tags = ['1쿼터', '2쿼터', '3쿼터', '4쿼터', '연장']; // '최종' 제거

/**
 * [상태 관리 - UI 제어]
 */
const isStatsVisible = ref(false)
const currentPlayer = ref('');
const newPlayerName = ref('');
const filterPlayer = ref('전체')
const activeLogId = ref<number | null>(null);

/**
 * [Composable 활용]
 */
const {
  leftShots, rightShots, addShot, removeShot,
  toggleStatus, leftStats, rightStats, resetData,
  players, addPlayer, removePlayer, calculateZoneStats,
  resetPlayers, downloadExcel
} = useShotChart()

/**
 * [Computed - 데이터 필터링]
 */
const recentLogs = computed(() => {
  return [...leftShots.value, ...rightShots.value].sort((a, b) => b.id - a.id)
})

const filteredLeftShots = computed(() => 
  filterPlayer.value === '전체' ? leftShots.value : leftShots.value.filter((s: BasketballShot) => s.playerName === filterPlayer.value)
)
const filteredRightShots = computed(() => 
  filterPlayer.value === '전체' ? rightShots.value : rightShots.value.filter((s: BasketballShot) => s.playerName === filterPlayer.value)
)

const displayLeftZoneStats = computed(() => calculateZoneStats(filteredLeftShots.value))
const displayRightZoneStats = computed(() => calculateZoneStats(filteredRightShots.value))

/**
 * [헬퍼 함수]
 */
const getVersionKey = (date: string, name: string, tag: string) => `${date}-${name.trim()}_${tag}`;

const fetchShotData = async (key: string): Promise<ShotData | null> => {
  try {
    return await $fetch<ShotData>(`/api/get-shots`, { query: { date: key } });
  } catch (error: any) {
    console.error('상세 원인:', error);

    return null;
  }
};

/**
 * [이벤트 핸들러]
 */
const isDeleteMode = ref(false); // 삭제 모드 상태 추가

const handleAddPlayer = () => {
  const name = newPlayerName.value.trim();
  if (name) {
    addPlayer(name);
    newPlayerName.value = '';
  }
};

const handleRemovePlayer = (name: string) => {
  if (confirm(`${name} 선수를 삭제하시겠습니까?`)) {
    removePlayer(name);
    if (currentPlayer.value === name) currentPlayer.value = players.value[0] || '';
    isDeleteMode.value = false; // 삭제 후 모드 해제
  }
};

const handlePlayerClick = (name: string) => {
  if (isDeleteMode.value) {
    handleRemovePlayer(name);
  } else {
    currentPlayer.value = name;
  }
};

const handleResetPlayers = () => {
  if (confirm('모든 선수 목록을 초기화할까요?')) {
    resetPlayers();
    currentPlayer.value = '';
    filterPlayer.value = '전체';
  }
}

const handleRecordShot = (x: number, y: number) => {
  if (!currentPlayer.value) {
    alert('먼저 슛을 기록할 선수를 선택해주세요!');
    return;
  }
  addShot(x, y, true, currentPlayer.value);
  activeLogId.value = null;
};

const handleHighlightShot = (id: number) => {
  activeLogId.value = activeLogId.value === id ? null : id;
};

const toggleStats = () => isStatsVisible.value = !isStatsVisible.value

/**
 * [클라우드 데이터 처리]
 */
const saveToCloud = async () => {
  if (!matchName.value.trim()) return alert('경기 이름을 입력해주세요!');

  const versionKey = getVersionKey(selectedDate.value || '', matchName.value, saveTag.value);

  if (leftShots.value.length === 0 && rightShots.value.length === 0) {
    if (!confirm(`[${versionKey}] 현재 기록된 슛이 없습니다. 빈 데이터를 저장하시겠습니까?`)) return;
  }

  try {
    const res = await $fetch<{ success: boolean }>('/api/save-shots', {
      method: 'POST',
      body: {
        date: versionKey,
        leftShots: leftShots.value,
        rightShots: rightShots.value,
        players: players.value
      }
    });

    if (res.success) {
      alert(`[${versionKey}] 기록이 저장되었습니다!`);
      // 저장 후 화면 비우기 확인
      if (confirm(`${saveTag.value} 저장 완료. 다음 기록을 위해 화면을 비울까요?`)) {
        leftShots.value = [];
        rightShots.value = [];
      }
    }
  } catch (error: any) {
    console.error('저장 실패 상세 원인:', error);

    alert('저장 실패!');
  }
};

const loadFromCloud = async () => {
  try {
    const versionKey = getVersionKey(selectedDate.value || '', matchName.value, saveTag.value);
    const data = await fetchShotData(versionKey);

    if (data) {
      leftShots.value = data.leftShots || [];
      rightShots.value = data.rightShots || [];
      players.value = data.players || [];
      alert(`[${versionKey}] 기록을 불러왔습니다!`);
    } else {
      alert('해당 쿼터의 데이터가 없습니다.');
    }
  } catch (error: any) {
    console.error('데이터 불러오기 실패 상세 원인:', error);

    alert('불러오기 실패!');
  }
};

const onMatchSelected = async (fullKey: string) => {
  try {
    const datePart = fullKey.substring(0, 10);
    const remaining = fullKey.substring(11);
    const [namePart = '', tagPart = '1쿼터'] = remaining.split('_');

    selectedDate.value = datePart;
    matchName.value = namePart;
    saveTag.value = tagPart;

    await nextTick();
    await loadFromCloud();
  } catch (error: any) {
    console.error('데이터 불러오기 실패 상세 원인:', error);

    alert("데이터 형식이 올바르지 않습니다.");
  }
};
</script>

<template>
  <div class="shot-tracker-page">
    <div class="top-controls-row">
      <div class="action-bar">
        <button class="reset-btn" @click="resetData">슛 초기화</button>
        <button class="reset-players-btn" @click="handleResetPlayers">선수 초기화</button>
        <button class="stats-toggle-btn" @click="toggleStats">
          {{ isStatsVisible ? '통계 숨기기' : '구역별 통계 보기' }}
        </button>
      </div>

      <div class="filter-box">
        <label for="player-filter">필터: </label>
        <select id="player-filter" v-model="filterPlayer">
          <option value="전체">전체 보기</option>
          <option v-for="name in players" :key="name" :value="name">{{ name }}</option>
        </select>
      </div>

      <div class="stats-flex-container court-overlay">
        <div class="stats-item">
          <span class="team-label home">LEFT</span>
          <ShotStats :stats="leftStats" />
        </div>

        <div class="stats-item">
          <span class="team-label away">RIGHT</span>
          <ShotStats :stats="rightStats" isRight />
        </div>
      </div>
    </div>

    <div class="main-content-block">
      <BasketballCourt
          :leftShots="filteredLeftShots"
          :rightShots="filteredRightShots"
          :activeId="activeLogId"
          @record="handleRecordShot"
      />

      <ShotStatsModal
          :isVisible="isStatsVisible"
          :leftZoneStats="displayLeftZoneStats"
          :rightZoneStats="displayRightZoneStats"
          :filterPlayer="filterPlayer"
          @close="toggleStats"
      />

      <div class="bottom-content-area">
        <ShotLog
            :logs="recentLogs"
            :activeId="activeLogId"
            @toggle="toggleStatus"
            @remove="removeShot"
            @highlight="handleHighlightShot"
        />

        <div class="player-management flex-item">
          <div class="management-header">
            <div class="left-group">
              <h3>선수</h3>
              <div class="current-shooter-info">
                {{ isDeleteMode ? '삭제할 선수를 선택하세요' : '현재 선택: ' + (currentPlayer || '-') }}
              </div>
            </div>

            <div class="add-player">
              <input
                  v-model="newPlayerName"
                  placeholder="이름 입력"
                  @keyup.enter="handleAddPlayer"
                  style="height: 32px; box-sizing: border-box;"
              />
              <button @click="handleAddPlayer">추가</button>
              <button
                  class="btn-delete-mode"
                  :class="{ 'is-active': isDeleteMode }"
                  @click="isDeleteMode = !isDeleteMode"
              >
                {{ isDeleteMode ? '취소' : '삭제' }}
              </button>
            </div>
          </div>

          <div class="player-list">
            <div
                v-for="name in players"
                :key="name"
                class="player-item"
            >
              <button
                  :class="{ active: currentPlayer === name && !isDeleteMode }"
                  :style="isDeleteMode ? { border: '1px dashed #ff5252', color: '#ff5252' } : {}"
                  @click="handlePlayerClick(name)"
              >
                {{ name }}
                <span v-if="isDeleteMode" style="margin-left: 5px; font-weight: bold;">×</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <button @click="downloadExcel" class="btn-excel">
      엑셀 다운로드
    </button>
    <div class="save-container">
      <div class="input-group">
        <label for="game-date">경기 날짜</label>
        <input type="date" id="game-date" v-model="selectedDate" class="date-input" />
      </div>

      <div class="input-group">
        <label for="match-name">경기명</label>
        <input
            id="match-name"
            v-model="matchName"
            placeholder="예: 상대편"
            class="match-name-input"
        />
      </div>

      <div class="input-group">
        <label for="save-tag">쿼터/버전</label>
        <select id="save-tag" v-model="saveTag" class="save-tag-select">
          <option v-for="tag in tags" :key="tag" :value="tag">{{ tag }}</option>
        </select>
      </div>

      <div class="button-group main-actions">
        <button @click="saveToCloud" class="save-btn">서버 저장</button>
        <SavedMatchList @select="onMatchSelected" />
      </div>
    </div>
  </div>
</template>
