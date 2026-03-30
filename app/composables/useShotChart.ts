import { COURT_CONFIG } from '~/utils/constants'

export interface Shot {
    id: number;
    x: number;
    y: number;
    type: 'made' | 'miss';
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

    const addShot = (x: number, y: number) => {
        const target = x < COURT_CONFIG.HALF_WIDTH ? leftShots : rightShots
        target.value.push({ id: Date.now(), x, y, type: 'made' })
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
        resetData,
        leftStats: computed(() => getStats(leftShots.value)),
        rightStats: computed(() => getStats(rightShots.value))
    }
}