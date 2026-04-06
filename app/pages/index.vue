<script setup lang="ts">
import { computed, ref } from 'vue'
import ShotStats from "../components/ShotStats.vue";
import BasketballCourt from "../components/BasketballCourt.vue";
import ShotStatsModal from "../components/ShotStatsModal.vue";
import ShotLog from "../components/ShotLog.vue"; // ref가 빠졌다면 추가

const {
  leftShots, rightShots, addShot, removeShot,
  toggleStatus, leftStats, rightStats, resetData,
  players, addPlayer, removePlayer, calculateZoneStats,
  resetPlayers, downloadExcel
} = useShotChart()

const recentLogs = computed(() => {
  return [...leftShots.value, ...rightShots.value]
      .sort((a, b) => b.id - a.id)
      /*.slice(0, 8)*/
})

const isStatsVisible = ref(false)
const currentPlayer = ref('');      // 현재 슛을 기록할 선수
const newPlayerName = ref('');
const filterPlayer = ref('전체')
const activeLogId = ref<number | null>(null);

const toggleStats = () => isStatsVisible.value = !isStatsVisible.value

const filteredLeftShots = computed(() => {
  if (filterPlayer.value === '전체') return leftShots.value
  return leftShots.value.filter(s => s.playerName === filterPlayer.value)
})

const filteredRightShots = computed(() => {
  if (filterPlayer.value === '전체') return rightShots.value
  return rightShots.value.filter(s => s.playerName === filterPlayer.value)
})

// 2. 상단 요약 통계(LEFT/RIGHT)도 필터링된 데이터 기준으로 재계산
const getStats = (data: any[]) => {
  const total = data.length
  const made = data.filter(s => s.type === 'made').length
  return { total, made, rate: total > 0 ? Math.round((made / total) * 100) : 0 }
}

// 로그 클릭 시 호출될 함수
const handleHighlightShot = (id: number) => {
  // 이미 선택된 걸 다시 누르면 강조 해제, 아니면 강조
  activeLogId.value = activeLogId.value === id ? null : id;
};

// 3. 구역별 상세 통계(모달용) 필터링
const displayLeftZoneStats = computed(() => calculateZoneStats(filteredLeftShots.value))
const displayRightZoneStats = computed(() => calculateZoneStats(filteredRightShots.value))

const handleAddPlayer = () => {
  if (newPlayerName.value.trim()) {
    addPlayer(newPlayerName.value.trim()); // useShotChart의 addPlayer 호출
    newPlayerName.value = ''; // 입력창 비우기
  }
};

const handleRemovePlayer = (name: string) => {
  if (confirm(`${name} 선수를 삭제하시겠습니까?`)) {
    removePlayer(name);
    if (currentPlayer.value === name) {
      currentPlayer.value = players.value[0] || ''; // 삭제 후 첫 번째 선수로 변경
    }
  }
};

const handleRecordShot = (x: number, y: number) => {
  if (!currentPlayer.value) {
    alert('먼저 슛을 기록할 선수를 선택해주세요!');
    return;
  }
  addShot(x, y, true, currentPlayer.value);
  activeLogId.value = null; // 새 슛을 쏘면 강조 해제
};

const handleResetPlayers = () => {
  resetPlayers();
  currentPlayer.value = ''; // 🚩 선수가 다 지워졌으므로 현재 선택된 선수도 초기화
  filterPlayer.value = '전체'; // 필터도 전체로 되돌림
}

const selectedDate = ref(new Date().toISOString().split('T')[0]); // 오늘 날짜 기본값

const saveToCloud = async () => {
  try {
    // 우리가 만든 /api/save-shots로 데이터를 쏩니다.
    const res = await $fetch('/api/save-shots', {
      method: 'POST',
      body: {
        date: selectedDate.value,
        leftShots: leftShots.value,   // 기존 reactive 변수명에 맞게 수정
        rightShots: rightShots.value,
        players: players.value
      }
    });

    if (res.success) {
      alert(`${selectedDate.value} 기록이 서버에 저장되었습니다!`);
    }
  } catch (error) {
    alert('저장 실패! 터미널의 에러 로그를 확인해주세요.');
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
                현재 선택: <strong>{{ currentPlayer || '-' }}</strong>
              </div>
            </div>

            <div class="add-player">
              <input
                  v-model="newPlayerName"
                  placeholder="이름 입력"
                  @keyup.enter="handleAddPlayer"
              />
              <button @click="handleAddPlayer">추가</button>
            </div>
          </div>

          <div class="player-list">
            <div
                v-for="name in players"
                :key="name"
                class="player-item"
            >
              <button
                  :class="{ active: currentPlayer === name }"
                  @click="currentPlayer = name"
              >
                {{ name }}
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
      <input type="date" v-model="selectedDate" class="date-input" />
      <button @click="saveToCloud" class="save-btn">클라우드에 저장</button>
    </div>
  </div>

</template>
