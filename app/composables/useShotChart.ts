import { COURT_CONFIG } from '~/utils/constants'

export interface Shot {
    id: number;
    x: number;
    y: number;
    type: 'made' | 'miss';
    distance?: number;
    is3Point?: boolean;
    zone?: string;
}

export const useShotChart = () => {
    const leftShots = ref<Shot[]>([])
    const rightShots = ref<Shot[]>([])

    // 초기화 (LocalStorage 로드)
    onMounted(() => {
        leftShots.value = JSON.parse(localStorage.getItem('leftShots') || '[]')
        rightShots.value = JSON.parse(localStorage.getItem('rightShots') || '[]')
    })

    // 자동 저장
    watch([leftShots, rightShots], ([newLeft, newRight]) => {
        localStorage.setItem('leftShots', JSON.stringify(newLeft))
        localStorage.setItem('rightShots', JSON.stringify(newRight))
    }, { deep: true })

    const addShot = (x: number, y: number, isMade: boolean = true) => {
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
        const ARC_THREE_DISTANCE = 180;  // 정면/윙 3점 거리
        const CORNER_THREE_DX = 145;     // 코너 직선의 가로 시작점
        const CORNER_ZONE_DY = 135;      // 코너 직선이 시작되는 세로 높이
        const BASELINE_THREE_DY = 175;   // 베이스라인 부근 세로 높이

        // 4. 3점슛 판정 로직 (Priority: Corner/Baseline -> Arc)
        let is3Point;
        let zoneName;

        if (dy > BASELINE_THREE_DY) {
            // A. 베이스라인 깊숙한 곳 (dx가 작아도 무조건 3점)
            is3Point = dx > (CORNER_THREE_DX - 5);
            zoneName = "3점슛";
        } else if (dy > CORNER_ZONE_DY) {
            // B. 일반 코너 직선 구간
            is3Point = dx > CORNER_THREE_DX;
            zoneName = is3Point ? "3점슛" : "미드레인지";
        } else {
            // C. 정면 및 윙 부채꼴 구간
            is3Point = distance >= ARC_THREE_DISTANCE;
            zoneName = is3Point ? "3점슛" : "미드레인지";
        }

        // 5. 제한구역(Paint) 예외 처리 (우선순위 높음)
        if (distance < 65) {
            zoneName = "페인트존";
            is3Point = false;
        }

        // 6. 데이터 push (DTO 생성)
        target.value.push({
            id: Date.now(),
            x, y,
            type: isMade ? 'made' : 'miss',
            zone: zoneName,
            distance: Math.round(distance),
            is3Point: is3Point
        });

        // 디버깅용 로그
        console.log(`[판정결과] ${zoneName} | dx:${Math.round(dx)} dy:${Math.round(dy)} dist:${Math.round(distance)}`);
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
        const zones = ["페인트존", "미드레인지", "3점슛"]

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



    return {
        leftShots, rightShots,
        addShot, removeShot, toggleStatus,
        resetData, calculateZoneStats,
        leftZoneStats: computed(() => calculateZoneStats(leftShots.value)),
        rightZoneStats: computed(() => calculateZoneStats(rightShots.value)),
        leftStats: computed(() => getStats(leftShots.value)),
        rightStats: computed(() => getStats(rightShots.value))
    }
}