type Page<T> = { items: T[]; nextCursor: string | null }

export async function loadCatalogPages<T extends { id: string }>(
  fetchPage: (after?: string) => Promise<Page<T>>,
  after?: string,
  signal?: AbortSignal,
): Promise<Page<T>> {
  const items: T[] = []
  const ids = new Set<string>()
  const cursors = new Set<string>()
  let cursor = after
  while (true) {
    if (signal?.aborted)
      throw new DOMException('Consulta cancelada', 'AbortError')
    if (cursor) {
      if (cursors.has(cursor))
        throw new Error('No se pudo completar la lista de marcas. Reintenta.')
      cursors.add(cursor)
    }
    const page = await fetchPage(cursor)
    if (signal?.aborted)
      throw new DOMException('Consulta cancelada', 'AbortError')
    for (const item of page.items) {
      if (!ids.has(item.id)) {
        ids.add(item.id)
        items.push(item)
      }
    }
    if (!page.nextCursor) return { items, nextCursor: null }
    cursor = page.nextCursor
  }
}
