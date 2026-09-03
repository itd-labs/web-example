<script setup lang="ts">
/** Лендинг: зачем этот сайт и что с ним делать. */
useHead({ title: 'itd-api — пример приложения' })
definePageMeta({ layout: 'plain' })

const { info, fetchMode } = useMode()

const snippet = `import { ItdClient } from 'itd-api'

const itd = new ItdClient({ auth: process.env.ITD_ACCESS_TOKEN })
const page = await itd.posts.list({ tab: 'popular', limit: 20 })

for (const post of page.items) {
  console.log(post.author.username, post.content)
}`

const features = [
  {
    icon: 'i-lucide-list',
    title: 'Лента, профили, посты',
    text: 'Три вкладки ленты, стены пользователей, комментарии с ветками ответов, реакции, репосты и опросы — всё поверх методов SDK.',
  },
  {
    icon: 'i-lucide-bell',
    title: 'Уведомления',
    text: 'Поток событий на сервере или опрос — переключается переменной окружения, интерфейс одинаковый.',
  },
  {
    icon: 'i-lucide-terminal',
    title: 'Журнал вызовов',
    text: 'Панель «под капотом» показывает, какой метод библиотеки вызвал экран, сколько это заняло и что вернулось.',
  },
  {
    icon: 'i-lucide-flask-conical',
    title: 'Песочница без токена',
    text: 'Сервер API в памяти из @itd-api/testing: можно листать, лайкать и публиковать, ничего не заводя.',
  },
]

onMounted(() => {
  if (!info.value) fetchMode()
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-12 px-4 py-12">
    <header class="flex flex-col gap-5">
      <span class="text-sm font-medium text-itd-accent">itd-api</span>
      <h1 class="text-3xl font-semibold text-itd-text sm:text-4xl">
        Так выглядит приложение на этом SDK
      </h1>
      <p class="max-w-2xl text-lg text-itd-muted">
        Рабочий клиент социальной сети итд.com: лента, профили, комментарии, уведомления и
        поиск. Весь код открыт — это пример, который можно копировать.
      </p>

      <div class="flex flex-wrap gap-3">
        <UButton to="/feed" color="neutral" size="lg" class="rounded-full" label="Открыть песочницу" />
        <UButton
          to="/token"
          color="neutral"
          variant="subtle"
          size="lg"
          class="rounded-full"
          label="Войти по токену"
        />
        <UButton
          to="https://www.npmjs.com/package/itd-api"
          target="_blank"
          color="neutral"
          variant="ghost"
          size="lg"
          class="rounded-full"
          label="npm"
          trailing-icon="i-lucide-external-link"
        />
      </div>
    </header>

    <section class="itd-card flex flex-col gap-3">
      <div class="flex items-center gap-2 text-sm text-itd-muted">
        <UIcon name="i-lucide-package" class="size-4" />
        <code>npm install itd-api</code>
      </div>
      <pre class="overflow-x-auto rounded-2xl bg-itd-block-2 p-4 text-sm text-itd-text"><code>{{ snippet }}</code></pre>
    </section>

    <section class="grid gap-4 sm:grid-cols-2">
      <article v-for="feature in features" :key="feature.title" class="itd-card flex flex-col gap-2">
        <UIcon :name="feature.icon" class="size-5 text-itd-accent" />
        <h2 class="font-medium text-itd-text">
          {{ feature.title }}
        </h2>
        <p class="text-sm text-itd-muted">
          {{ feature.text }}
        </p>
      </article>
    </section>

    <section class="itd-card flex flex-col gap-3">
      <h2 class="font-medium text-itd-text">
        Браузер не ходит в API напрямую
      </h2>
      <p class="text-sm text-itd-muted">
        итд.com не отдаёт заголовки CORS, а refresh-токен лежит в httpOnly-cookie, которую
        из JS не выставить. Поэтому клиент SDK живёт только на сервере, а браузер общается
        со своими роутами <code>/api/*</code>. Токены наружу не выходят.
      </p>
      <NuxtLink to="/about" class="text-sm text-itd-accent">
        Подробнее о том, как устроено демо →
      </NuxtLink>
    </section>

    <footer class="flex flex-col gap-2 border-t border-itd-border pt-6 text-sm text-itd-muted">
      <p>
        Проект не является официальным и не аффилирован с итд.com.
        <span v-if="info?.library">Версия SDK: {{ info.library }}.</span>
      </p>
      <div class="flex flex-wrap gap-4">
        <a href="https://kiowdev.github.io/itd-api/" target="_blank" rel="noopener" class="hover:text-itd-text">Документация</a>
        <a href="https://github.com/KiowDev/itd-api" target="_blank" rel="noopener" class="hover:text-itd-text">GitHub</a>
        <NuxtLink to="/about" class="hover:text-itd-text">
          О демо
        </NuxtLink>
      </div>
    </footer>
  </div>
</template>
