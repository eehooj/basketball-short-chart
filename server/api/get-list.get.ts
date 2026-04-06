import { createClient } from '@vercel/kv';

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event);
    const kv = createClient({
        url: config.kvRestApiUrl,
        token: config.kvRestApiToken,
    });

    const keys = await kv.keys('shots:*');

    // 1. "shots:" 제거된 새로운 배열 생성
    const cleanedKeys = keys.map(key => key.replace('shots:', ''));

    // localeCompare를 사용하여 문자열 정렬을 명시적으로 처리 (역순)
    return [...cleanedKeys].sort((a, b) => b.localeCompare(a));
});