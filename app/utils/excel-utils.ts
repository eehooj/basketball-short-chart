// utils/excel-utils.ts
import * as XLSX from 'xlsx-js-style'; // 🚩 라이브러리 import 변경
import type { Shot } from '~/composables/useShotChart';

// 공통 테두리 스타일 정의 (얇은 검은색 선)
const borderStyle = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } }
};

// 중앙 정렬 스타일 정의
const alignmentStyle = { horizontal: "center", vertical: "center" };

// 데이터 셀 스타일 (테두리 + 중앙 정렬)
const dataStyle = { border: borderStyle, alignment: alignmentStyle };

// 헤더 셀 스타일 (데이터 스타일에 배경색 추가)
const headerStyle = {
    ...dataStyle,
    fill: { fgColor: { rgb: "D9EAD3" } }, // 연한 녹색 배경
    font: { bold: true }
};

export const saveBasketballExcel = (players: string[], leftShots: Shot[], rightShots: Shot[]) => {
    // 1. 헤더 및 데이터 생성 (이미지 양식 반영)
    const header = [
        ["선수명", "Left", "", "", "Right", "", ""],
        ["", "골 밑", "미드레인지", "3점슛", "골 밑", "미드레인지", "3점슛"]
    ];

    const rows = players.map(playerName => {
        const allShots = [...leftShots, ...rightShots].filter(s => s.playerName === playerName);
        const getZoneStat = (side: 'left' | 'right', zone: string) => {
            const shots = allShots.filter(s => s.side === side && s.zone === zone);
            const total = shots.length;
            const made = shots.filter(s => s.type === 'made').length;
            const rate = total > 0 ? Math.round((made / total) * 100) : 0;
            return total > 0 ? `${rate}% (${made}/${total})` : "-";
        };

        return [
            playerName,
            getZoneStat('left', '골 밑'),
            getZoneStat('left', '미드레인지'),
            getZoneStat('left', '3점슛'),
            getZoneStat('right', '골 밑'),
            getZoneStat('right', '미드레인지'),
            getZoneStat('right', '3점슛')
        ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([...header, ...rows]);

    // 2. 모든 셀에 테두리 및 스타일 적용
    const range = XLSX.utils.decode_range(worksheet['!ref']!); // 전체 셀 범위 가져오기

    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = XLSX.utils.encode_cell({ r: R, c: C });

            // 만약 셀이 비어있다면(null), 스타일을 적용하기 위해 빈 오브젝트 생성
            if (!worksheet[cell_address]) {
                worksheet[cell_address] = { t: 'z' }; // 'z'는 스텁(Stub) 셀 타입
            }

            // 헤더 영역(0~1행)과 데이터 영역에 다른 스타일 적용
            if (R <= 1) {
                worksheet[cell_address].s = headerStyle;
            } else {
                worksheet[cell_address].s = dataStyle;
            }
        }
    }

    // 3. 셀 너비(폭) 설정 [!cols]
    worksheet['!cols'] = [
        { wch: 15 }, // 선수명
        { wch: 15 }, { wch: 15 }, { wch: 15 }, // Left
        { wch: 15 }, { wch: 15 }, { wch: 15 }  // Right
    ];

    // 4. 셀 병합 (이미지 동일)
    worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // 선수명 세로 병합
        { s: { r: 0, c: 1 }, e: { r: 0, c: 3 } }, // Left 가로 병합
        { s: { r: 0, c: 4 }, e: { r: 0, c: 6 } }  // Right 가로 병합
    ];

    // 5. 파일 저장
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "농구 기록지");
    XLSX.writeFile(workbook, `농구_기록_${new Date().toISOString().slice(0, 10)}.xlsx`);
};