import { createClient } from '@vercel/kv';

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event);

    const kv = createClient({
        url: config.kvRestApiUrl,
        token: config.kvRestApiToken,
    });

    // URL에서 날짜 파라미터를 읽어옵니다 (예: ?date=2026-04-06)
    const query = getQuery(event);
    const date = query.date as string;

    if (!date) {
        throw createError({
            status: 400,
            statusText: '날짜를 지정해야 합니다.',
        });
    }

    // DB에서 해당 날짜의 데이터를 쏙 가져옵니다.
    const data = await kv.get(`shots:${date}`);

    // 데이터가 없으면 빈 구조를 보내서 에러를 방지합니다.
    return data || { leftShots: [], rightShots: [], players: [] };
});