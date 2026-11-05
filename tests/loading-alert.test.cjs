const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')
const ts = require('typescript')

function setup() {
  let popup = null
  let nextTimerId = 1
  const timers = new Map()
  const shown = []
  let closed = 0
  const swal = {
    isVisible: () => popup !== null,
    getPopup: () => popup,
    fire: (options) => {
      popup = { title: options.title }
      shown.push(options)
      options.didOpen()
      return Promise.resolve({})
    },
    close: () => { closed++; popup = null },
    showLoading: () => {},
  }
  const source = fs.readFileSync(path.join(__dirname, '../src/ui/loadingAlert.ts'), 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      assert.equal(name, 'sweetalert2')
      return swal
    },
    setTimeout: (callback) => { const id = nextTimerId++; timers.set(id, callback); return id },
    clearTimeout: (id) => timers.delete(id),
  })
  return {
    ...exports,
    shown,
    get closed() { return closed },
    replacePopup: () => { popup = { title: 'Confirmación ajena' } },
    flush: () => {
      const callbacks = [...timers.values()]
      timers.clear()
      callbacks.forEach((callback) => callback())
    },
  }
}

test('does not flash a dialog for fast requests', () => {
  const state = setup()
  state.startLoadingAlert('Cargando…')()
  state.flush()
  assert.equal(state.shown.length, 0)
})

test('concurrent requests share a dialog until the last request finishes', () => {
  const state = setup()
  const first = state.startLoadingAlert('Cargando clientes…')
  const second = state.startLoadingAlert('Cargando técnicos…')
  state.flush()
  assert.equal(state.shown.length, 1)
  assert.equal(state.shown[0].allowOutsideClick, false)
  assert.equal(state.shown[0].allowEscapeKey, false)
  first()
  assert.equal(state.closed, 0)
  second()
  assert.equal(state.closed, 1)
})

test('finishing a request does not close a replacement confirmation or error', () => {
  const state = setup()
  const finish = state.startLoadingAlert('Guardando…')
  state.flush()
  state.replacePopup()
  finish()
  assert.equal(state.closed, 0)
})

test('a pending request does not replace an existing alert', () => {
  const state = setup()
  state.replacePopup()
  const finish = state.startLoadingAlert('Cargando…')
  state.flush()
  finish()
  assert.equal(state.shown.length, 0)
  assert.equal(state.closed, 0)
})

test('cleanup also works after an error and permits a later loading dialog', () => {
  const state = setup()
  const finishFailedRequest = state.startLoadingAlert('Guardando…')
  state.flush()
  finishFailedRequest()
  const finishNextRequest = state.startLoadingAlert('Cargando…')
  state.flush()
  assert.equal(state.shown.length, 2)
  finishNextRequest()
  assert.equal(state.closed, 2)
})

test('all list, session, tracking and mutation requests have titles; polling stays quiet', () => {
  const state = setup()
  for (const resource of ['customers', 'technicians', 'products', 'users', 'service-orders']) {
    assert.match(state.requestLoadingTitle('get', '/' + resource), /^Cargando /)
  }
  assert.equal(state.requestLoadingTitle('post', '/auth/login'), 'Iniciando sesión…')
  assert.equal(state.requestLoadingTitle('get', '/auth/profile'), 'Validando permisos…')
  assert.equal(state.requestLoadingTitle('get', '/tracking/token'), 'Consultando estado…')
  assert.equal(state.requestLoadingTitle('post', '/service-orders/id/print'), 'Enviando impresión…')
  assert.equal(state.requestLoadingTitle('patch', '/customers/id'), 'Guardando…')
  assert.equal(state.requestLoadingTitle('delete', '/customers/id'), 'Eliminando…')
  assert.equal(state.requestLoadingTitle('get', '/print-jobs/id'), undefined)
})
