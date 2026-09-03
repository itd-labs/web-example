import type { CacheOperationId } from '@itd-api/cache'
import { BUILT_IN_CIPHERS } from '@itd-api/crypto'
import { morseCipher } from './morse'

/** Сколько миллисекунд кэш держит успешный ответ. */
export const CACHE_TTL = 30_000

/** Сколько ответов помещается в кэш одного посетителя. */
export const CACHE_MAX_ENTRIES = 100

/**
 * Встроенные шифры `@itd-api/crypto` и свой декодер русской азбуки Морзе.
 *
 * Набор расширяемый — `morseCipher` показывает, как добавить собственный шифр.
 */
export const CRYPTO_CIPHERS = [...BUILT_IN_CIPHERS, morseCipher]

/**
 * Читающие операции, ответы которых кэшируются.
 *
 * Ровно те, что вызывают GET-роуты этого сервера. Мутации плагин инвалидирует сам по
 * своей таблице зависимостей — перечислять их не нужно.
 *
 * Счётчика непрочитанных здесь нет намеренно. Инвалидация срабатывает на наши же мутации
 * (`markRead` сбрасывает и счётчик, и список), а новое уведомление появляется на стороне
 * сервера — кэш о нём не узнает и продержит старое значение весь TTL. При опросе это
 * означало бы, что счётчик обновляется раз в 30 секунд, как ни спрашивай. В потоковом
 * режиме такой проблемы нет: там инвалидацию цепляют к событиям через
 * `attachNotificationEvents()`.
 */
export const CACHED_OPERATIONS: readonly CacheOperationId[] = [
  'users.me',
  'users.get',
  'users.whoToFollow',
  'users.followers',
  'users.following',
  'users.pins',
  'users.getPrivacy',
  'posts.list',
  'posts.get',
  'posts.byUser',
  'posts.likedByUser',
  'posts.comments',
  'comments.replies',
  'notifications.list',
  'hashtags.posts',
]
