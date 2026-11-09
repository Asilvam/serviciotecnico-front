const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
function fixture() {
  let calls = 0, now = 0, token = 'session-a'
  const http = { interceptors: { request: { use() {} }, response: { use() {} } }, get: async () => { calls++; return { data: { items: [calls] } } }, post: async () => ({ data: {} }), patch: async () => ({ data: {} }) }
  const axios = { create: () => http, isAxiosError: () => false }
  const source = fs.readFileSync('src/api/apiClient.ts', 'utf8').replace('import.meta.env.VITE_SERVER_URL', "'http://test.invalid'")
  const module = { exports: {} }
  const dependencies = name => name === 'axios' ? { __esModule: true, default: axios } : name.includes('session') ? { getSession: () => ({ token }) } : { requestLoadingTitle: () => 'Cargando…', startLoadingAlert: () => () => {} }
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, { exports: module.exports, module, require: dependencies, Date: { now: () => now }, Map, WeakMap, Error })
  return { api: module.exports.apiClient, calls: () => calls, advance: n => { now += n }, session: value => { token = value } }
}
test('catalog entries stay cached for an hour, then refresh', async () => {
  const f = fixture(), options = { cacheTtlMs: 3600000 }
  await f.api.get('/device-catalog/models?brandId=apple', options)
  f.advance(60000)
  await f.api.get('/device-catalog/models?brandId=apple', options)
  assert.equal(f.calls(), 1)
  f.advance(3600000)
  await f.api.get('/device-catalog/models?brandId=apple', options)
  assert.equal(f.calls(), 2)
})
test('invalidation after manual entry refreshes brands and models', async () => {
  const f = fixture()
  await f.api.get('/device-catalog/brands')
  await f.api.get('/device-catalog/models?brandId=apple')
  f.api.invalidateCache('/device-catalog')
  await f.api.get('/device-catalog/brands')
  await f.api.get('/device-catalog/models?brandId=apple')
  assert.equal(f.calls(), 4)
})
test('catalog cache is isolated by signed-in session', async () => {
  const f = fixture()
  await f.api.get('/device-catalog/brands')
  f.session('session-b')
  await f.api.get('/device-catalog/brands')
  assert.equal(f.calls(), 2)
})
