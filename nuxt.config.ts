// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    css: ['~/assets/css/main.css', '~/assets/css/modal.css'],
    runtimeConfig: {
        // 서버 전용 (Server-side only)
        kvRestApiUrl: process.env.KV_REST_API_URL,
        kvRestApiToken: process.env.KV_REST_API_TOKEN,

        // public 안에 넣으면 브라우저(클라이언트)에서도 접근 가능해지니 주의!
        public: {
            // 여기에 적는 것만 브라우저에서 보입니다.
        }
    },
    compatibilityDate: '2025-07-15',
    devtools: { enabled: true }
})
