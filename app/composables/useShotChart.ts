import { COURT_CONFIG } from '~/utils/constants'
import { computed, ref, onMounted, watch } from "vue";
import { saveBasketballExcel } from '~/utils/excel-utils';

export interface BasketballShot {
    id: number;
    x: number;
    y: number;
    type: 'made' | 'miss';
    side: string;
    playerName: string; // optional 대신 필수값으로 변경하여 오류 방지
    newPlayers?: string;
    distance?: number;
    is3Point?: boolean;
    zone?: string;
}

export const useShotChart = () => {
    const leftShots = ref<BasketballShot[]>([])
    const rightShots = ref<BasketballShot[]>([])
    const players = ref<string[]>([])

    // 초기화 (LocalStorage 로드)
    onMounted(() => {
        leftShots.value = JSON.parse(localStorage.getItem('leftShots') || '[]')
        rightShots.value = JSON.parse(localStorage.getItem('rightShots') || '[]')
        players.value = JSON.parse(localStorage.getItem('playerList') || '[]')
    })

    // 자동 저장
    watch([leftShots, rightShots, players],
        ([newLeft, newRight, newPlayers]) => {
        localStorage.setItem('leftShots', JSON.stringify(newLeft))
        localStorage.setItem('rightShots', JSON.stringify(newRight))
        localStorage.setItem('playerList', JSON.stringify(newPlayers))
    }, { deep: true })

    const addPlayer = (name: string) => {
        const trimmedName = name.trim()
        if (trimmedName && !players.value.includes(trimmedName)) {
            players.value.push(trimmedName)
        }
    }

    const removePlayer = (name: string) => {
        players.value = players.value.filter(p => p !== name)
    }

    const resetPlayers = () => {
        if (confirm('등록된 모든 선수 목록을 삭제하시겠습니까?')) {
            players.value = [] // 빈 배열로 초기화
            localStorage.removeItem('playerList')
        }
    }

    const addShot = (x: number, y: number, isMade: boolean = true, playerName: string = '익명') => {
        const isLeft = x < COURT_CONFIG.HALF_WIDTH;
        const target = isLeft ? leftShots : rightShots;

        // 1. 기준점 설정 (코트 이미지상의 골대 위치)
        const rimX = isLeft ? 30 : 620;
        const rimY = 200;

        // 2. 상대 좌표 및 거리 계산
        const dx = Math.abs(x - rimX); // 가로 차이
        const dy = Math.abs(y - rimY); // 세로 차이
        const distance = Math.sqrt(dx * dx + dy * dy); // 직선 거리

        // 3. 판정 임계값 (Thresholds) - 이 수치들을 조정해서 감도를 맞춥니다.
        const ARC_THREE_DISTANCE = 185;  // 정면/윙 3점 거리
        const CORNER_THREE_DX = 148;     // 코너 직선의 가로 시작점
        const CORNER_ZONE_DY = 135;      // 코너 직선이 시작되는 세로 높이

        let is3Point = false;

        // 우선 전체 거리(반지름)가 180 이상이면 3점으로 간주
        if (distance >= ARC_THREE_DISTANCE) {
            is3Point = true;
        }
        // 혹은, 코너 직선 구간(dy가 높을 때)에서 가로 거리가 140 이상이면 3점
        else if (dy > CORNER_ZONE_DY && dx >= CORNER_THREE_DX) {
            is3Point = true;
        }

        // 5. 구역 이름 및 예외 처리
        let zoneName = is3Point ? "3점슛" : "미드레인지";

        // 5. 제한구역(Paint) 예외 처리 (우선순위 높음)
        if (distance < 40) {
            zoneName = "골 밑";
            is3Point = false;
        }

        // 6. 데이터 push (DTO 생성)
        target.value.push({
            id: Date.now(),
            x, y,
            type: isMade ? 'made' : 'miss',
            playerName: playerName, // 추가: 현재 선택된 선수 이름 저장
            zone: zoneName,
            distance: Math.round(distance),
            is3Point: is3Point,
            side: isLeft ? 'left' : 'right'
        });

        // 디버깅용 로그
        console.log(`[${playerName}] ${zoneName} | dist:${Math.round(distance)}`);
    }

    const removeShot = (id: number) => {
        leftShots.value = leftShots.value.filter(s => s.id !== id)
        rightShots.value = rightShots.value.filter(s => s.id !== id)
    }

    const toggleStatus = (shot: any) => {
        shot.type = shot.type === 'made' ? 'miss' : 'made'
    }

    const getStats = (data: any[]) => {
        const total = data.length
        const made = data.filter(s => s.type === 'made').length
        return { total, made, rate: total > 0 ? Math.round((made / total) * 100) : 0 }
    }

    // 2. 구역별로 쪼개서 리스트를 만드는 로직 (새로 추가)
    const calculateZoneStats = (shots: any[]) => {
        const zones = ["골 밑", "미드레인지", "3점슛"]

        return zones.map(zoneName => {
            // 해당 구역 데이터만 필터링
            const zoneData = shots.filter(s => s.zone === zoneName)

            // 기존 getStats를 재사용해서 수치 계산
            const result = getStats(zoneData)

            return {
                name: zoneName,
                made: result.made,
                attempts: result.total,
                percentage: result.rate
            }
        })
    }

    const resetData = () => {
        if (confirm('모든 슛 기록을 초기화하시겠습니까?')) {
            leftShots.value = []
            rightShots.value = []
            // 선택사항: 특정 키만 삭제하거나 전체 삭제
            localStorage.removeItem('leftShots')
            localStorage.removeItem('rightShots')
        }
    }

    // 엑셀
    const downloadExcel = () => {
        // 분리한 파일을 호출하면서 현재 데이터들을 인자로 넘깁니다.
        saveBasketballExcel(players.value, leftShots.value, rightShots.value);
    };

    return {
        leftShots, rightShots, players,
        addShot, removeShot, toggleStatus,
        resetData, calculateZoneStats,
        leftZoneStats: computed(() => calculateZoneStats(leftShots.value)),
        rightZoneStats: computed(() => calculateZoneStats(rightShots.value)),
        leftStats: computed(() => getStats(leftShots.value)),
        rightStats: computed(() => getStats(rightShots.value)),
        addPlayer, removePlayer, resetPlayers,
        downloadExcel
    }
}