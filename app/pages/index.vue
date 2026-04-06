<script setup lang="ts">
import { computed, ref } from 'vue'
import ShotStats from "../components/ShotStats.vue";
import BasketballCourt from "../components/BasketballCourt.vue";
import ShotStatsModal from "../components/ShotStatsModal.vue";
import ShotLog from "../components/ShotLog.vue"; // ref가 빠졌다면 추가

// 1. 서버에서 받아올 데이터의 타입을 정의
interface ShotData {
  leftShots: any[];  // 상세한 타입이 있다면 any 대신 해당 타입을 적어주세요 (예: Shot[])
  rightShots: any[];
  players: string[];
  updatedAt?: string;
}

const matchName = ref('상대편'); // 기본 경기명
const saveTag = ref('최종');      // 기본 쿼터
const tags = ['1쿼터', '2쿼터', '3쿼터', '4쿼터', '최종', '연장'];

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
  currentPlayer.value = ''; // 선수가 다 지워졌으므로 현재 선택된 선수도 초기화
  filterPlayer.value = '전체'; // 필터도 전체로 되돌림
}

const selectedDate = ref(new Date().toISOString().split('T')[0]); // 오늘 날짜 기본값

const saveToCloud = async () => {
  if (!matchName.value.trim()) {
    alert('경기 이름을 입력해주세요!');
    return;
  }

  // 키 생성: 2026-04-06-위켄즈_1쿼터
  const versionKey = `${selectedDate.value}-${matchName.value.trim()}_${saveTag.value}`;

  // 데이터 존재 확인
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
      alert(`[${versionKey}] 기록이 서버에 저장되었습니다!`);

      // 추가된 로직: 저장이 성공하면 화면의 슛 기록을 비웁니다.
      // 쿼터별로 따로 관리하기 위해 '최종' 저장 시에는 물어보고 지우거나 유지할 수 있습니다.
      if (saveTag.value !== '최종') {
        if (confirm(`${saveTag.value} 기록이 저장되었습니다. 다음 쿼터 기록을 위해 화면을 비울까요?`)) {
          leftShots.value = [];
          rightShots.value = [];
          // 참고: useShotChart의 resetData를 써도 되지만,
          // 선수 목록까지 지워질 수 있으니 슛 변수만 직접 비우는 게 안전합니다.
        }
      }
    }
  } catch (e) {
    console.error('[SaveToCloud Error]:', e);

    alert('저장 실패! 서버 상태를 확인해주세요.');
  }
};

const loadFromCloud = async () => {
  try {
    // 1. '최종'을 선택했을 때의 특별 로직
    if (saveTag.value === '최종') {
      const quarters = ['1쿼터', '2쿼터', '3쿼터', '4쿼터'];

      // 4개의 쿼터 데이터를 동시에 요청합니다.
      const promises = quarters.map(q =>
          $fetch<ShotData>(`/api/get-shots`, {
            query: { date: `${selectedDate.value}-${matchName.value.trim()}_${q}` }
          }).catch(() => null) // 데이터가 없는 쿼터는 무시
      );

      const results = await Promise.all(promises);

      // 데이터를 하나로 합칩니다 (Merge)
      let combinedLeft: any[] = [];
      let combinedRight: any[] = [];
      let combinedPlayers = new Set<string>();

      results.forEach(data => {
        if (data) {
          combinedLeft = [...combinedLeft, ...(data.leftShots || [])];
          combinedRight = [...combinedRight, ...(data.rightShots || [])];
          (data.players || []).forEach(p => combinedPlayers.add(p));
        }
      });

      // 합쳐진 데이터를 화면에 뿌려줍니다.
      leftShots.value = combinedLeft;
      rightShots.value = combinedRight;
      players.value = Array.from(combinedPlayers);

      alert(`[${matchName.value}] 모든 쿼터 기록을 합산하여 불러왔습니다!`);
    }

    // 2. 일반 쿼터(1, 2, 3, 4) 불러오기 로직 (기존과 동일)
    else {
      const versionKey = `${selectedDate.value}-${matchName.value.trim()}_${saveTag.value}`;
      const data = await $fetch<ShotData>(`/api/get-shots`, { query: { date: versionKey } });

      if (data) {
        leftShots.value = data.leftShots || [];
        rightShots.value = data.rightShots || [];
        players.value = data.players || [];
        alert(`[${versionKey}] 기록을 불러왔습니다!`);
      }
    }
  } catch (e) {
    console.error('[loadFromCloud Error]:', e);

    alert('데이터를 불러오는 중 오류가 발생했습니다.');
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
    <div class="save-container" style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; background: #f4f4f4; padding: 15px; border-radius: 8px; margin-top: 20px;">
      <div class="input-group">
        <label for="game-date" style="font-size: 12px; display: block;">경기 날짜</label>
        <input type="date" id="game-date" v-model="selectedDate" class="date-input" />
      </div>

      <div class="input-group">
        <label for="match-name" style="font-size: 12px; display: block;">경기명</label>
        <input
            id="match-name"
            v-model="matchName"
            placeholder="예: 상대편"
            style="padding: 6px; border: 1px solid #ccc; border-radius: 4px; width: 140px;"
        />
      </div>

      <div class="input-group">
        <label for="save-tag" style="font-size: 12px; display: block;">쿼터/버전</label>
        <select id="save-tag" v-model="saveTag" style="padding: 6px; border-radius: 4px; border: 1px solid #ccc;">
          <option v-for="tag in tags" :key="tag" :value="tag">{{ tag }}</option>
        </select>
      </div>

      <div class="button-group" style="display: flex; gap: 8px; margin-top: 18px;">
        <button @click="saveToCloud" class="save-btn" style="background-color: #4CAF50; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">서버 저장</button>
        <button @click="loadFromCloud" class="load-btn" style="background-color: #2196F3; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">불러오기</button>
      </div>
    </div>
  </div>


</template>
