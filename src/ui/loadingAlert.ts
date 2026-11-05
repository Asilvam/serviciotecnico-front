import Swal from 'sweetalert2'

const pendingRequests = new Map<symbol, string>()
let timer: ReturnType<typeof setTimeout> | undefined
let loadingPopup: HTMLElement | null = null

/** Share one loading dialog across concurrent requests without closing other alerts. */
export function startLoadingAlert(title: string): () => void {
  const requestId = Symbol('loading-request')
  pendingRequests.set(requestId, title)

  if (!timer && !loadingPopup) {
    timer = setTimeout(() => {
      timer = undefined
      if (pendingRequests.size === 0 || Swal.isVisible()) return

      void Swal.fire({
        title: pendingRequests.values().next().value ?? title,
        text: 'Espera un momento…',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      })
      loadingPopup = Swal.getPopup()
    }, 180)
  }

  return () => {
    pendingRequests.delete(requestId)
    if (pendingRequests.size > 0) return

    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
    if (loadingPopup && Swal.getPopup() === loadingPopup) Swal.close()
    loadingPopup = null
  }
}

export function requestLoadingTitle(method: string, path: string): string | undefined {
  // Print job polling already has its own continuous SweetAlert2 dialog.
  if (path.startsWith('/print-jobs/')) return undefined
  if (path === '/auth/login') return 'Iniciando sesión…'
  if (path === '/auth/profile') return 'Validando permisos…'
  if (path.startsWith('/tracking/')) return 'Consultando estado…'
  if (/\/print(?:-80mm)?$/.test(path)) return 'Enviando impresión…'
  if (method === 'delete') return 'Eliminando…'
  if (method !== 'get') return 'Guardando…'

  const resources: Record<string, string> = {
    customers: 'clientes',
    technicians: 'técnicos',
    products: 'productos',
    users: 'usuarios',
    'service-orders': 'órdenes de servicio',
  }
  const resource = resources[path.split('/')[1]]
  return resource ? `Cargando ${resource}…` : 'Cargando…'
}
