<script setup lang="ts">
import type { ShopProduct } from 'itd-api'

const itdFetch = useItdFetch()

useHead({ title: 'Магазин' })

const products = ref<ShopProduct[]>([])
const pending = ref(true)
const error = ref('')

const categoryNames: Record<string, string> = {
  apparel: 'Одежда',
  accessories: 'Аксессуары',
  print: 'Печатная продукция',
}

const statusNames: Record<string, string> = {
  available: 'В наличии',
  preorder: 'Предзаказ',
  soldout: 'Нет в наличии',
}

function price(value: number) {
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
}

async function load() {
  pending.value = true

  try {
    products.value = await itdFetch<ShopProduct[]>('/api/shop/products')
    error.value = ''
  } catch (cause) {
    error.value = apiErrorMessage(cause)
  } finally {
    pending.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col">
    <header
      class="itd-safe-top sticky top-0 z-3 px-4 pb-4 backdrop-blur-md bg-[var(--itd-glass)] min-[1174px]:rounded-3xl"
    >
      <h1 class="text-lg font-semibold text-itd-text">Магазин</h1>
    </header>

    <div class="mt-3 grid grid-cols-1 gap-3 px-2 min-[600px]:grid-cols-2 min-[1174px]:px-0">
      <template v-if="pending">
        <div v-for="index in 4" :key="index" class="itd-card flex flex-col gap-3">
          <span class="itd-skeleton aspect-square w-full rounded-2xl" />
          <span class="itd-skeleton h-5 w-2/3" />
          <span class="itd-skeleton h-4 w-1/3" />
        </div>
      </template>

      <div v-else-if="error" class="itd-card col-span-full flex flex-col items-center gap-3 text-center">
        <UIcon name="i-lucide-triangle-alert" class="size-6 text-itd-muted" />
        <p class="text-itd-text">{{ error }}</p>
        <UButton color="neutral" variant="subtle" label="Повторить" @click="load()" />
      </div>

      <ItdEmpty
        v-else-if="!products.length"
        class="col-span-full"
        icon="i-lucide-shopping-bag"
        title="В магазине пока пусто"
        description="Товары появятся здесь позже."
      />

      <article v-for="product in products" v-else :key="product.id" class="itd-card flex flex-col gap-3">
        <img
          v-if="product.images[0]"
          :src="product.images[0]"
          :alt="product.title"
          class="aspect-square w-full rounded-2xl bg-itd-block-2 object-cover"
        >
        <div
          v-else
          class="flex aspect-square w-full items-center justify-center rounded-2xl bg-itd-block-2"
        >
          <UIcon name="i-lucide-image-off" class="size-8 text-itd-muted" />
        </div>

        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="text-xs text-itd-muted">{{ categoryNames[product.category] ?? product.category }}</p>
            <h2 class="font-semibold text-itd-text">{{ product.title }}</h2>
          </div>
          <span class="shrink-0 font-semibold text-itd-text">{{ price(product.price) }}</span>
        </div>

        <p v-if="product.description" class="text-sm text-itd-muted">{{ product.description }}</p>

        <div v-if="product.colors.length" class="flex flex-wrap items-center gap-1.5">
          <span class="mr-1 text-xs text-itd-muted">Цвета:</span>
          <span
            v-for="color in product.colors"
            :key="color.id"
            class="size-5 rounded-full border border-itd-border"
            :style="{ backgroundColor: color.hex }"
            :title="color.label"
          />
        </div>

        <p v-if="product.sizes.length" class="text-xs text-itd-muted">
          Размеры: {{ product.sizes.join(', ') }}
        </p>

        <p class="mt-auto text-xs" :class="product.status === 'soldout' ? 'text-itd-muted' : 'text-itd-accent'">
          {{ statusNames[product.status] ?? product.status }}<template v-if="product.stockLeft !== null"> · {{ product.stockLeft }} шт.</template>
        </p>
      </article>
    </div>
  </div>
</template>
