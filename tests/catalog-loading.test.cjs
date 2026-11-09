const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function fixture({ cached = false, failAt = 0 } = {}) {
  let pages = 0, starts = 0, finishes = 0, active = false
  const module = { exports: {} }
  const dependencies = name => {
    if (name.includes('loadingAlert')) return { startLoadingAlert: () => {
      starts++; active = true
      return () => { finishes++; active = false }
    } }
    if (name.includes('apiClient')) return { apiClient: { get: async (_path, options) => {
      pages++
      assert.equal(options.loading, 'silent')
      if (!cached) options.onNetworkStart()
      if (failAt === pages) throw new Error('network failure')
      if (!cached) assert.equal(active, true)
      return { items: [{ id: String(pages), name: 'Model' }], nextCursor: pages < 3 ? String(pages) : null }
    } } }
    if (name.includes('catalogPagination')) {
      const pagination = { exports: {} }
      vm.runInNewContext(compile('src/api/catalogPagination.ts'), { exports: pagination.exports, module: pagination, Set, DOMException })
      return pagination.exports
    }
    throw new Error(name)
  }
  function compile(path) {
    return ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  }
  vm.runInNewContext(compile('src/api/deviceCatalogApi.ts'), { exports: module.exports, module, require: dependencies, URLSearchParams })
  return { api: module.exports.deviceCatalogApi, state: () => ({ pages, starts, finishes, active }) }
}

test('all sequential model pages share one continuous loading scope', async () => {
  const f = fixture()
  const result = await f.api.models('samsung')
  assert.equal(result.items.length, 3)
  assert.deepEqual(f.state(), { pages: 3, starts: 1, finishes: 1, active: false })
})
test('cached catalog pages do not start a loading alert', async () => {
  const f = fixture({ cached: true })
  await f.api.brands()
  assert.deepEqual(f.state(), { pages: 3, starts: 0, finishes: 0, active: false })
})
test('a later page failure releases the single loading scope', async () => {
  const f = fixture({ failAt: 2 })
  await assert.rejects(f.api.models('samsung'), /network failure/)
  assert.deepEqual(f.state(), { pages: 2, starts: 1, finishes: 1, active: false })
})
