/**
 * Хранилище сессий выбирается по окружению.
 *
 * На Vercel инстансы поднимаются и гаснут, поэтому память процесса не годится: посетителя
 * выбрасывало бы произвольно. Локально внешнее хранилище не нужно — хватает памяти.
 */
function serverStorage() {
  // Драйвер выбирается на сборке, поэтому его можно задать явно — на случай, когда
  // секреты доступны только в рантайме.
  const upstashUrl = process.env.NUXT_REDIS_KV_REST_API_URL
  const upstashToken = process.env.NUXT_REDIS_KV_REST_API_TOKEN
  const driver = process.env.NUXT_STORAGE_DRIVER
    ?? (upstashUrl && upstashToken ? 'upstash' : process.env.REDIS_URL ? 'redis' : 'memory')

  // Ключи Upstash передаются серверному драйверу из переменных Vercel.
  if (driver === 'upstash') {
    return { driver: 'upstash', base: 'itd-example', url: upstashUrl, token: upstashToken }
  }

  if (driver === 'redis') {
    return { driver: 'redis', base: 'itd-example', url: process.env.REDIS_URL }
  }

  return { driver: 'memory' }
}

export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  nitro: {
    storage: {
      'itd-sessions': serverStorage(),
      'itd-sandboxes': serverStorage(),
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
        },
      ],
    },
  },

  runtimeConfig: {
    // Пароль шифрования cookie сессии. В проде обязателен: NUXT_SESSION_PASSWORD (32+ символа).
    sessionPassword: 'dev-only-insecure-password-change-me!!',
    // Базовый URL API итд.com. Менять обычно не нужно.
    itdBaseUrl: '',
    // Прокси для локального запуска, например socks5://127.0.0.1:1080. Пусто — прямые запросы.
    proxyUrl: '',
    // Как доставлять уведомления: poll (дёшево на serverless), sse или off.
    realtime: 'poll',

    public: {
      // Пускать ли посетителя без токена в песочницу @itd-api/testing.
      sandbox: true,
      // Собирать ли журнал вызовов SDK для панели «под капотом».
      inspector: true,
    },
  },
})
