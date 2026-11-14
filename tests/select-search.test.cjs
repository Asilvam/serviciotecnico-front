const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const moduleFixture = { exports: {} }
const code = ts.transpileModule(fs.readFileSync('src/utils/selectSearch.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
vm.runInNewContext(code, { exports: moduleFixture.exports, module: moduleFixture })
const { matchesSelectOption: matches } = moduleFixture.exports

test('a letter filters visible model names rather than hidden variant codes', () => {
  assert.equal(matches({ name: 'IQOO 10', searchText: 'IQOO 10 V2218A' }, 'V', true), false)
  assert.equal(matches({ name: 'V40', searchText: 'V40 V2348' }, 'v', true), true)
})
test('specific alphanumeric codes remain searchable; numeric queries use names', () => {
  const model = { name: 'GALAXY S21', searchText: 'GALAXY S21 SM-G991B A1379' }
  assert.equal(matches(model, 'sm-g991', true), true)
  assert.equal(matches(model, '13', true), false)
  assert.equal(matches({ name: 'IPHONE 13' }, '13', true), true)
})
test('search preserves accents, trimming and generic hidden search values', () => {
  assert.equal(matches({ name: 'Edición Pro' }, ' EDICION ', true), true)
  assert.equal(matches({ name: 'Alejandro Silva', searchText: 'Alejandro Silva 12345678' }, '1234'), true)
})
