const { test } = require('node:test')
const assert = require('node:assert/strict')
const loader = import('../src/api/catalogPagination.ts')
test('includes Samsung from a later page and keeps API order', async () => {
  const { loadCatalogPages } = await loader
  const calls = []
  const result = await loadCatalogPages(async (after) => {
    calls.push(after)
    return after === undefined
      ? { items: [{ id: '1', name: 'ALCATEL' }], nextCursor: '1' }
      : { items: [{ id: '2', name: 'SAMSUNG' }], nextCursor: null }
  })
  assert.deepEqual(result.items.map(item => item.name), ['ALCATEL', 'SAMSUNG'])
  assert.equal(result.nextCursor, null)
  assert.equal(calls.length, 2)
})
test('deduplicates page overlap and rejects a cyclic cursor', async () => {
  const { loadCatalogPages } = await loader
  const result = await loadCatalogPages(async after => after
    ? { items: [{ id: '1' }, { id: '2' }], nextCursor: null }
    : { items: [{ id: '1' }], nextCursor: 'a' })
  assert.equal(result.items.length, 2)
  await assert.rejects(loadCatalogPages(async after => ({ items: [], nextCursor: after === 'a' ? 'b' : 'a' })), /No se pudo completar/)
})
test('aborted searches stop without returning an incomplete list', async () => {
  const { loadCatalogPages } = await loader
  const abort = new AbortController()
  let calls = 0
  await assert.rejects(loadCatalogPages(async () => {
    calls++
    abort.abort()
    return { items: [{ id: '1' }], nextCursor: 'a' }
  }, undefined, abort.signal), { name: 'AbortError' })
  assert.equal(calls, 1)
})
