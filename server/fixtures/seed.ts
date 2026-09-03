import type { MockServerSeed } from '@itd-api/testing'
import {
  encodeBeeCrypt,
  encodeInvisible,
  FRAME_END,
  FRAME_START,
  INVISIBLE_ALPHABET,
} from '@itd-api/crypto'
import { NotificationType } from 'itd-api'

/**
 * Данные песочницы: небольшой мир, в котором есть что листать, лайкать и комментировать.
 *
 * Жители заняты разными пакетами проекта — так у каждой стены свой характер, а посты
 * заодно рассказывают, из чего библиотека состоит. Тот же набор используют автотесты,
 * поэтому сценарии и демо не расходятся.
 */

/** От чьего имени ходит посетитель без токена. */
export const DEMO_USER = 'alice'

const DAY = 24 * 60 * 60 * 1000

/** Транспортный контейнер фрагмента встроенного invisible cipher со стабильным ID 0. */
function invisibleFragment(text: string): string {
  const cipherId = INVISIBLE_ALPHABET.charAt(0)
  return `${FRAME_START}${cipherId}${encodeInvisible(text)}${FRAME_END}`
}

/** Отметка времени «столько-то часов назад» — лента должна выглядеть живой. */
function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString()
}

/**
 * Новый набор данных.
 *
 * Функция, а не константа: у каждого посетителя своя песочница со своим состоянием, и
 * общий изменяемый объект им бы всё перепутал.
 */
export function sandboxSeed(): MockServerSeed {
  return {
    users: [
      {
        id: 'user-alice',
        username: DEMO_USER,
        displayName: 'Алиса',
        avatar: '🦊',
        bio: 'Смотрю демо itd-api. Всё, что здесь напишу, видно только мне.',
        createdAt: daysAgo(420),
        following: ['user-boris', 'user-vera', 'user-nika'],
      },
      {
        id: 'user-boris',
        username: 'boris',
        displayName: 'Борис',
        avatar: '🐻',
        bio: 'Пишу ботов на itd-api. Иногда они даже работают.',
        verified: true,
        createdAt: daysAgo(700),
        following: ['user-alice', 'user-grisha'],
      },
      {
        id: 'user-vera',
        username: 'vera',
        displayName: 'Вера',
        avatar: '🦉',
        bio: '@itd-api/cache. Живу тем, что запоминаю чужие ответы.',
        createdAt: daysAgo(280),
        following: ['user-alice', 'user-grisha'],
      },
      {
        id: 'user-grisha',
        username: 'grisha',
        displayName: 'Гриша',
        avatar: '🐢',
        bio: '@itd-api/proxy. Хожу окольными путями, зато прихожу.',
        createdAt: daysAgo(95),
        following: ['user-vera'],
      },
      {
        id: 'user-nika',
        username: 'nika',
        displayName: 'Ника',
        avatar: '🦝',
        bio: '@itd-api/crypto. Пишу так, что читают не все.',
        createdAt: daysAgo(160),
        following: ['user-alice', 'user-boris'],
      },
      {
        id: 'user-timur',
        username: 'timur',
        displayName: 'Тимур',
        avatar: '🐙',
        bio: '@itd-api/testing. Мой сервер живёт в памяти и не открывает портов.',
        verified: true,
        createdAt: daysAgo(210),
        following: ['user-vera', 'user-nika'],
      },
      {
        id: 'user-lada',
        username: 'lada',
        displayName: 'Лада',
        avatar: '🦆',
        bio: '@itd-api/captcha. Нажимаю галочку «я не робот» профессионально.',
        createdAt: daysAgo(60),
        following: ['user-timur'],
      },
    ],

    posts: [
      {
        id: 'post-1',
        authorId: 'user-boris',
        content: 'Собрал клиент к #itd на itd-api за вечер. Пагинация, реакции, уведомления — всё из коробки.',
        createdAt: hoursAgo(2),
        likedBy: ['user-vera', 'user-grisha', 'user-nika'],
      },
      {
        id: 'post-2',
        authorId: 'user-vera',
        content: 'Тридцать секунд кэша — и лента перестала долбить API на каждом переходе. Секрет успеха: ничего не делать.',
        createdAt: hoursAgo(5),
        likedBy: ['user-boris'],
      },
      {
        id: 'post-3',
        authorId: 'user-alice',
        content: 'Это песочница. Лайкайте и публикуйте что угодно — через полчаса всё исчезнет.',
        createdAt: hoursAgo(8),
      },
      {
        id: 'post-4',
        authorId: 'user-grisha',
        content: 'Полдня искал ошибку. Оказалось, курсор пагинации надо возвращать как есть, а не разбирать.',
        createdAt: hoursAgo(11),
        likedBy: ['user-alice', 'user-boris', 'user-vera'],
      },
      {
        id: 'post-5',
        authorId: 'user-nika',
        content: `Спрятала в посте фразу: ${invisibleFragment('невидимый текст уже здесь')}. Кто с #crypto — прочитает, остальные посмотрят на пустое место.`,
        createdAt: hoursAgo(14),
        likedBy: ['user-timur'],
      },
      {
        id: 'post-6',
        authorId: 'user-timur',
        content: 'Написал тест на ленту. Сервер поднялся в памяти, порт не открылся, сеть не пострадала.',
        createdAt: hoursAgo(19),
        likedBy: ['user-vera', 'user-lada'],
      },
      {
        id: 'post-7',
        authorId: 'user-vera',
        content: 'Инвалидация кэша — вторая сложнейшая задача. Первая — придумать шутку про инвалидацию кэша.',
        createdAt: hoursAgo(26),
        likedBy: ['user-grisha', 'user-nika'],
      },
      {
        id: 'post-8',
        authorId: 'user-lada',
        content: 'Капча спросила, робот ли я. Ответила честно — теперь жду решения апелляции.',
        createdAt: hoursAgo(30),
        likedBy: ['user-timur', 'user-boris'],
      },
      {
        id: 'post-9',
        authorId: 'user-grisha',
        content: 'Прокси — как объезд по грунтовке: дольше, зато шлагбаум позади.',
        createdAt: hoursAgo(38),
        likedBy: ['user-alice'],
      },
      {
        id: 'post-10',
        authorId: 'user-boris',
        content: 'Сервер отдал 429 без Retry-After. Библиотека сама выждала по лестнице пауз — я даже не заметил. #itd',
        createdAt: hoursAgo(44),
        likedBy: ['user-vera'],
      },
      {
        id: 'post-11',
        authorId: 'user-nika',
        content: encodeBeeCrypt('Зашифровала имя в профиле. Теперь меня зовут «Ника», и это по-своему честно.'),
        createdAt: hoursAgo(52),
      },
      {
        id: 'post-12',
        authorId: 'user-alice',
        content: 'Пост на стене друга — тоже пост. Просто с получателем.',
        wallRecipientId: 'user-grisha',
        createdAt: hoursAgo(55),
      },
      {
        id: 'post-13',
        authorId: 'user-timur',
        content: 'Сценарий: сервер отвечает 503, потом 200. Проверяю, что клиент не сдался с первого раза. Он не сдался.',
        createdAt: daysAgo(3),
        likedBy: ['user-boris'],
      },
      {
        id: 'post-14',
        authorId: 'user-lada',
        content: 'Пятая капча за утро. Кажется, светофоры на картинках знаю лучше, чем свой город.',
        createdAt: daysAgo(4),
      },
      {
        id: 'post-15',
        authorId: 'user-grisha',
        content: 'Раньше было лучше. Но и сейчас неплохо.',
        createdAt: daysAgo(5),
      },
    ],

    comments: [
      {
        id: 'comment-1',
        postId: 'post-1',
        authorId: 'user-vera',
        content: 'А события через SSE смотрел?',
        createdAt: hoursAgo(1),
        likedBy: ['user-boris'],
      },
      {
        id: 'comment-2',
        postId: 'post-1',
        authorId: 'user-boris',
        parentCommentId: 'comment-1',
        replyToUserId: 'user-vera',
        content: 'Смотрел. На serverless дороговато держать соединение, поэтому опрос.',
        createdAt: hoursAgo(1),
      },
      {
        id: 'comment-3',
        postId: 'post-4',
        authorId: 'user-alice',
        content: 'Классика. У каждой вкладки курсор свой.',
        createdAt: hoursAgo(10),
        likedBy: ['user-grisha'],
      },
      {
        id: 'comment-4',
        postId: 'post-10',
        authorId: 'user-grisha',
        content: 'Лестница пауз — это 1, 5, 30, 60 и 90 секунд. Проверено на себе.',
        createdAt: hoursAgo(40),
      },
      {
        id: 'comment-5',
        postId: 'post-6',
        authorId: 'user-vera',
        content: 'И кэш там же можно подключить — тесты про него получаются самые короткие.',
        createdAt: hoursAgo(17),
        likedBy: ['user-timur'],
      },
      {
        id: 'comment-6',
        postId: 'post-5',
        authorId: 'user-timur',
        content: 'Прочитал. Ничего не понял, но плагин отработал.',
        createdAt: hoursAgo(12),
      },
      {
        id: 'comment-7',
        postId: 'post-8',
        authorId: 'user-nika',
        content: 'Держись. Я на третьей попытке начинаю сомневаться в себе.',
        createdAt: hoursAgo(28),
      },
    ],

    notifications: [
      {
        id: 'notification-1',
        userId: 'user-alice',
        type: NotificationType.PostReaction,
        actorIds: ['user-boris'],
        entityId: 'post-3',
        preview: 'Это песочница. Лайкайте и публикуйте что угодно',
        createdAt: hoursAgo(1),
      },
      {
        id: 'notification-2',
        userId: 'user-alice',
        type: NotificationType.PostComment,
        actorIds: ['user-vera'],
        entityId: 'post-3',
        preview: 'А события через SSE смотрел?',
        createdAt: hoursAgo(3),
      },
      {
        id: 'notification-3',
        userId: 'user-alice',
        type: NotificationType.Follow,
        actorIds: ['user-nika'],
        createdAt: hoursAgo(9),
      },
      {
        id: 'notification-4',
        userId: 'user-alice',
        type: NotificationType.PostReaction,
        actorIds: ['user-timur', 'user-lada'],
        entityId: 'post-12',
        preview: 'Пост на стене друга — тоже пост',
        isRead: true,
        createdAt: daysAgo(2),
      },
      {
        id: 'notification-5',
        userId: 'user-alice',
        type: NotificationType.Follow,
        actorIds: ['user-grisha'],
        isRead: true,
        createdAt: daysAgo(3),
      },
    ],
  }
}
