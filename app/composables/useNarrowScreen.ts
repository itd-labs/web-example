/**
 * Узкий экран — телефон. Граница совпадает с `sm` темы @nuxt/ui: с неё всплывающее
 * уведомление перестаёт растягиваться во всю ширину.
 */
export function useNarrowScreen() {
  const narrow = useState<boolean>('itd:narrow-screen', () => false)

  let media: MediaQueryList | undefined

  function sync() {
    narrow.value = media?.matches ?? false
  }

  onMounted(() => {
    media = window.matchMedia('(max-width: 639px)')
    sync()
    media.addEventListener('change', sync)
  })

  onBeforeUnmount(() => media?.removeEventListener('change', sync))

  return narrow
}
