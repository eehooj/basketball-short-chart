import { createClient } from '@vercel/kv';

export default defineEventHandler(async (event) => {
    console.log('------- DELETE API 호출 시작 -------');
    const query = getQuery(event);
    const key = query.key as string;
    const password = query.password as string;

    console.log(`[DEBUG] 전달받은 키: ${key}`);

    // [1] 필수 파라미터 체크
    if (!key) {
        throw createError({ statusCode: 400, message: '삭제할 키가 없습니다.' });
    }

    // [2] 비밀번호 검증 (환경변수 appPassword 와 비교)
    const config = useRuntimeConfig(event);
    if (config.appPassword && password !== config.appPassword) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized',
            message: '비밀번호가 틀렸습니다.',
        });
    }

    // [3] 실제 DB 삭제 작업
    try {
        const kv = createClient({
            url: config.kvRestApiUrl,
            token: config.kvRestApiToken,
        });

        // 한글 키는 SDK 가 내부적으로 인코딩하여 처리하므로 그대로 전달
        let finalKey = key;
        if (!finalKey.startsWith('shots:')) {
            finalKey = `shots:${finalKey}`;
        }

        console.log(`[DEBUG] 최종 삭제 시도 키: ${finalKey}`);

        // 이제 shots:가 붙은 정확한 키로 삭제를 시도합니다.
        const deletedCount = await kv.del(finalKey);

        console.log(`[DEBUG] 삭제 결과 (Count): ${deletedCount}`);
        console.log('------- DELETE API 호출 종료 -------');

        return {
            success: true,
            message: `[${key}] 삭제 완료`
        };
    } catch (error: any) {
        console.error('[Server Delete Error]', error);
        throw createError({
            statusCode: 500,
            message: '서버 내부 오류로 삭제에 실패했습니다.'
        });
    }
});