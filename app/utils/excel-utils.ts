import ExcelJS from 'exceljs';
import type { Shot } from '~/composables/useShotChart';

export const saveBasketballExcel = async (players: string[], leftShots: Shot[], rightShots: Shot[]) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('농구 기록지');

    // 1. 공통 스타일 정의
    const borderStyle: Partial<ExcelJS.Borders> = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };

    const alignmentStyle: Partial<ExcelJS.Alignment> = {
        vertical: 'middle',
        horizontal: 'center'
    };

    // 2. 헤더 생성 (2개 행)
    const headerRow1 = ['선수명', 'Left', '', '', 'Right', '', '', 'Total', '', ''];
    const headerRow2 = ['', '골 밑', '미드레인지', '3점슛', '골 밑', '미드레인지', '3점슛', '골 밑', '미드레인지', '3점슛'];

    worksheet.addRow(headerRow1);
    worksheet.addRow(headerRow2);

    // 3. 데이터 행 생성 및 추가
    players.forEach(playerName => {
        const allShots = [...leftShots, ...rightShots].filter(s => s.playerName === playerName);

        // 특정 사이드와 구역의 통계를 계산하는 헬퍼 함수
        const getZoneStat = (zone: string, side?: 'left' | 'right') => {
            // side가 있으면 해당 사이드만, 없으면 전체 사이드 필터링
            const shots = allShots.filter(s => (side ? s.side === side : true) && s.zone === zone);
            const total = shots.length;
            const made = shots.filter(s => s.type === 'made').length;
            const rate = total > 0 ? Math.round((made / total) * 100) : 0;
            return total > 0 ? `${rate}% (${made}/${total})` : "-";
        };

        worksheet.addRow([
            playerName,
            getZoneStat('골 밑', 'left'),
            getZoneStat('미드레인지', 'left'),
            getZoneStat('3점슛', 'left'),
            getZoneStat('골 밑', 'right'),
            getZoneStat('미드레인지', 'right'),
            getZoneStat('3점슛', 'right'),
            getZoneStat('골 밑'),      // Total: 골 밑
            getZoneStat('미드레인지'), // Total: 미드레인지
            getZoneStat('3점슛')       // Total: 3점슛
        ]);
    });

    // 4. 셀 병합 설정
    worksheet.mergeCells('A1:A2'); // 선수명 세로 병합
    worksheet.mergeCells('B1:D1'); // Left 가로 병합
    worksheet.mergeCells('E1:G1'); // Right 가로 병합
    worksheet.mergeCells('H1:J1'); // Total 가로 병합

    // 5. 전체 스타일 적용
    worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
            cell.border = borderStyle;
            cell.alignment = alignmentStyle;

            if (rowNumber <= 2) {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFD9D2E9' }
                };
                cell.font = { bold: true };
            }
        });
    });

    // 6. 열 너비 설정
    worksheet.columns.forEach(column => {
        column.width = 15;
    });

    // 7. 브라우저 다운로드 실행
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    const now = new Date();
    const kstDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
        .toISOString()
        .split('T')[0];

    anchor.href = url;
    anchor.download = `농구_기록_${kstDate}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
};