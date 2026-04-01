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
    const headerRow1 = ['선수명', 'Left', '', '', 'Right', '', ''];
    const headerRow2 = ['', '골 밑', '미드레인지', '3점슛', '골 밑', '미드레인지', '3점슛'];

    worksheet.addRow(headerRow1);
    worksheet.addRow(headerRow2);

    // 3. 데이터 행 생성 및 추가
    players.forEach(playerName => {
        const allShots = [...leftShots, ...rightShots].filter(s => s.playerName === playerName);

        const getZoneStat = (side: 'left' | 'right', zone: string) => {
            const shots = allShots.filter(s => s.side === side && s.zone === zone);
            const total = shots.length;
            const made = shots.filter(s => s.type === 'made').length;
            const rate = total > 0 ? Math.round((made / total) * 100) : 0;
            return total > 0 ? `${rate}% (${made}/${total})` : "-";
        };

        worksheet.addRow([
            playerName,
            getZoneStat('left', '골 밑'),
            getZoneStat('left', '미드레인지'),
            getZoneStat('left', '3점슛'),
            getZoneStat('right', '골 밑'),
            getZoneStat('right', '미드레인지'),
            getZoneStat('right', '3점슛')
        ]);
    });

    // 4. 셀 병합 설정
    worksheet.mergeCells('A1:A2'); // 선수명 세로 병합
    worksheet.mergeCells('B1:D1'); // Left 가로 병합
    worksheet.mergeCells('E1:G1'); // Right 가로 병합

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

    anchor.href = url;
    anchor.download = `농구_기록_${new Date().toISOString().slice(0, 10)}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
};