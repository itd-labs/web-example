import type { Cipher } from '@itd-api/crypto'

/** Русская азбука Морзе. Цифры совпадают с международным вариантом. */
const MORSE_ALPHABET: Readonly<Record<string, string>> = {
  '.-': 'А',
  '-...': 'Б',
  '.--': 'В',
  '--.': 'Г',
  '-..': 'Д',
  '.': 'Е',
  '...-': 'Ж',
  '--..': 'З',
  '..': 'И',
  '.---': 'Й',
  '-.-': 'К',
  '.-..': 'Л',
  '--': 'М',
  '-.': 'Н',
  '---': 'О',
  '.--.': 'П',
  '.-.': 'Р',
  '...': 'С',
  '-': 'Т',
  '..-': 'У',
  '..-.': 'Ф',
  '....': 'Х',
  '-.-.': 'Ц',
  '---.': 'Ч',
  '----': 'Ш',
  '--.-': 'Щ',
  '--.--': 'Ъ',
  '-.--': 'Ы',
  '-..-': 'Ь',
  '..-..': 'Э',
  '..--': 'Ю',
  '.-.-': 'Я',
  '-----': '0',
  '.----': '1',
  '..---': '2',
  '...--': '3',
  '....-': '4',
  '.....': '5',
  '-....': '6',
  '--...': '7',
  '---..': '8',
  '----.': '9',
}

/**
 * Распознаёт целое поле с русской азбукой Морзе.
 *
 * Один пробел разделяет буквы и исчезает. Слэши отбрасываются, поэтому обычная запись
 * `буква / буква` оставляет между кодами два пробела; два и более пробела превращаются
 * в один пробел между словами.
 */
export function decodeMorse(text: string): string | null {
  if (!/^[.\- /]+$/.test(text) || !/[.-]/.test(text)) return null

  const chunks = text.replaceAll('/', '').split(/( +)/)
  let decoded = ''

  for (const chunk of chunks) {
    if (!chunk) continue

    if (chunk.startsWith(' ')) {
      if (chunk.length >= 2 && decoded && !decoded.endsWith(' ')) decoded += ' '
      continue
    }

    const letter = MORSE_ALPHABET[chunk]
    if (!letter) return null
    decoded += letter
  }

  return decoded.trimEnd() || null
}

/** Read-only cipher: Морзе распознаётся при чтении, но не предлагается для отправки. */
export const morseCipher: Cipher = {
  name: 'morse',
  id: 2,
  decode: decodeMorse,
}
