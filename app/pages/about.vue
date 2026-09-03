<script setup lang="ts">
/** Как устроено демо и что оно делает с данными посетителя. */
useHead({ title: 'О демо' })
definePageMeta({ layout: 'plain' })

const { info, fetchMode } = useMode()

onMounted(() => {
  if (!info.value) fetchMode()
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
    <div class="flex flex-col gap-2">
      <NuxtLink to="/" class="text-sm text-itd-muted hover:text-itd-text">
        ← На главную
      </NuxtLink>
      <h1 class="text-2xl font-semibold text-itd-text">
        Как устроено демо
      </h1>
    </div>

    <section class="itd-card flex flex-col gap-3">
      <h2 class="font-medium text-itd-text">
        Два режима
      </h2>
      <p class="text-sm text-itd-muted">
        Без токена сайт работает на песочнице: это сервер API в памяти из
        <code>@itd-api/testing</code>. Она своя у каждого посетителя, живёт полчаса после
        последнего действия и исчезает вместе со всем, что в ней написали.
      </p>
      <p class="text-sm text-itd-muted">
        Со своим access token те же самые страницы ходят в настоящий API итд.com. Код
        роутов при этом один и тот же — меняется только клиент.
      </p>
    </section>

    <section class="itd-card flex flex-col gap-3">
      <h2 class="font-medium text-itd-text">
        Что демо делает с вашими данными
      </h2>
      <ul class="flex list-disc flex-col gap-2 pl-5 text-sm text-itd-muted">
        <li>Токен хранится на сервере демо и в браузер не возвращается.</li>
        <li>В браузере лежит только cookie с идентификатором сессии — httpOnly и подписанная.</li>
        <li>Запись с токенами живёт сутки с последнего обращения, «Забыть токен» стирает её сразу. Сессию на итд.com это не закрывает.</li>
        <li>Тела запросов и токены не логируются; в журнале вызовов операции авторизации не показываются.</li>
        <li>Данные вашего аккаунта видите только вы: клиенты и кэш разделены по сессиям.</li>
      </ul>
    </section>

    <section class="itd-card flex flex-col gap-3">
      <h2 class="font-medium text-itd-text">
        Чего здесь нет
      </h2>
      <ul class="flex list-disc flex-col gap-2 pl-5 text-sm text-itd-muted">
        <li>
          Входа по email и паролю, кода из письма и QR: публичный сайт не должен принимать
          чужие учётные данные, а капча требует запустить браузер на сервере. В самом SDK
          эти способы есть — см. руководство по авторизации.
        </li>
        <li>Оплаты и оформления заказов в магазине — только витрина.</li>
      </ul>
    </section>

    <section class="itd-card flex flex-col gap-3">
      <h2 class="font-medium text-itd-text">
        Ограничения платформы
      </h2>
      <ul class="flex list-disc flex-col gap-2 pl-5 text-sm text-itd-muted">
        <li>
          Списки подписчиков и подписок сервер отдаёт первыми двадцатью записями и дальше
          не листает.
        </li>
        <li>
          Частота запросов ограничена по IP. Все посетители демо приходят с одного адреса,
          поэтому библиотека разводит их запросы общей очередью, а ответы читающих методов
          кэширует на полминуты.
        </li>
      </ul>
    </section>

    <footer class="flex flex-col gap-2 border-t border-itd-border pt-6 text-sm text-itd-muted">
      <p>
        Проект не является официальным и не аффилирован с итд.com. Лицензия MIT.
        <span v-if="info?.library">Версия SDK: {{ info.library }}.</span>
      </p>
      <div class="flex flex-wrap gap-4">
        <a href="https://kiowdev.github.io/itd-api/" target="_blank" rel="noopener" class="hover:text-itd-text">Документация</a>
        <a href="https://github.com/KiowDev/itd-api" target="_blank" rel="noopener" class="hover:text-itd-text">GitHub</a>
      </div>
    </footer>
  </div>
</template>
