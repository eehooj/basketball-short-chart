import { createClient } from '@vercel/kv';

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event);

    if (!config.kvRestApiUrl || !config.kvRestApiToken) {
        console.error("❌ DB 연결 정보가 없습니다! .env와 nuxt.config.ts를 확인하세요.");
        throw createError({
            status: 500,          // 🚩 statusCode 대신 status
            statusText: 'Internal Server Error: Missing KV Credentials', // 🚩 statusMessage 대신 statusText
        });
    }

    // 1. Vercel KV 연결
    const kv = createClient({
        url: config.kvRestApiUrl,
        token: config.kvRestApiToken,
    });

    // 2. 프론트엔드에서 보낸 데이터 받기
    const body = await readBody(event);
    const { date, leftShots, rightShots, players } = body;

    // 3. DB에 저장 (날짜별로 저장됨)
    await kv.set(`shots:${date}`, {
        leftShots,
        rightShots,
        players,
        updatedAt: new Date().toISOString()
    });

    return { success: true };
});