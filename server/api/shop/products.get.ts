/** Витрина магазина. Только чтение: заказы в примере не оформляются. */
export default defineItdHandler(async (event) => {
  const itd = await requireItd(event)

  return await itd.shop.products.list()
})
