import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import Swal from 'sweetalert2'
import AdminLayout from '../components/AdminLayout.tsx'
import { productsApi } from '../api/productsApi.ts'
import type { Product, ProductPayload } from '../types/products.ts'

const emptyProduct: ProductPayload = {
  name: '',
  description: '',
  sku: '',
  price: 0,
  stock: 0,
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [query, setQuery] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [formState, setFormState] = useState<ProductPayload>(emptyProduct)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const isEditing = Boolean(selectedProduct)
  const [isSaving, setIsSaving] = useState(false)

  const resolveProductId = (product: Product) => product.id ?? product._id ?? ''

  const normalizePayload = useCallback(
    (state: ProductPayload) => ({
      name: state.name.trim(),
      description: state.description?.trim() || undefined,
      sku: state.sku.trim(),
      price: Number(state.price),
      stock: state.stock !== undefined ? Number(state.stock) : undefined,
    }),
    [],
  )

  const initialPayload = useMemo(() => {
    if (!selectedProduct) {
      return null
    }
    return {
      name: selectedProduct.name,
      description: selectedProduct.description ?? undefined,
      sku: selectedProduct.sku,
      price: selectedProduct.price,
      stock: selectedProduct.stock ?? undefined,
    }
  }, [selectedProduct])

  const isDirty = useMemo(() => {
    if (!selectedProduct || !initialPayload) {
      return false
    }
    const current = normalizePayload(formState)
    return JSON.stringify(current) !== JSON.stringify(initialPayload)
  }, [selectedProduct, initialPayload, formState, normalizePayload])

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return products
    }
    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(normalized) ||
        product.sku.toLowerCase().includes(normalized) ||
        (product.description ?? '').toLowerCase().includes(normalized)
      )
    })
  }, [products, query])

  const loadProducts = useCallback(async () => {
    setStatus('loading')
    setErrorMessage('')
    try {
      const data = await productsApi.list()
      setProducts(data)
      setStatus('idle')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible cargar los productos.'
      setErrorMessage(message)
      setStatus('error')
    }
  }, [])

  const openCreatePanel = () => {
    setSelectedProduct(null)
    setFormState(emptyProduct)
    setPanelOpen(true)
  }

  const openEditPanel = (product: Product) => {
    setSelectedProduct(product)
    setFormState({
      name: product.name,
      description: product.description ?? '',
      sku: product.sku,
      price: product.price,
      stock: product.stock ?? 0,
    })
    setPanelOpen(true)
  }

  const closePanel = useCallback(() => {
    setPanelOpen(false)
    setSelectedProduct(null)
    setFormState(emptyProduct)
  }, [])

  useEffect(() => {
    if (!panelOpen) {
      return
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePanel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [panelOpen, closePanel])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    const payload: ProductPayload = normalizePayload(formState)

    try {
      if (selectedProduct) {
        const productId = resolveProductId(selectedProduct)
        if (!productId) {
          throw new Error('No fue posible identificar el producto seleccionado.')
        }
        const updated = await productsApi.update(productId, payload)
        setProducts((prev) =>
          prev.map((item) => (resolveProductId(item) === resolveProductId(updated) ? updated : item)),
        )
        await Swal.fire({
          icon: 'success',
          title: 'Producto actualizado',
          text: 'Los datos fueron guardados correctamente.',
          confirmButtonColor: '#2c5f7c',
        })
      } else {
        const created = await productsApi.create(payload)
        setProducts((prev) => [created, ...prev])
        await Swal.fire({
          icon: 'success',
          title: 'Producto creado',
          text: 'El nuevo producto fue registrado.',
          confirmButtonColor: '#2c5f7c',
        })
      }
      closePanel()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible guardar el producto.'
      void Swal.fire({
        icon: 'error',
        title: 'Operacion fallida',
        text: message,
        confirmButtonColor: '#2c5f7c',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (product: Product) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Desactivar producto',
      text: `Se desactivara ${product.name}.`,
      showCancelButton: true,
      confirmButtonText: 'Si, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e67e22',
      cancelButtonColor: '#7f8c8d',
    })

    if (!result.isConfirmed) {
      return
    }

    const productId = resolveProductId(product)
    if (!productId) {
      void Swal.fire({
        icon: 'error',
        title: 'Operacion fallida',
        text: 'No fue posible identificar el producto.',
        confirmButtonColor: '#2c5f7c',
      })
      return
    }

    try {
      await productsApi.remove(productId)
      setProducts((prev) => prev.filter((item) => resolveProductId(item) !== productId))
      void Swal.fire({
        icon: 'success',
        title: 'Producto desactivado',
        text: 'El producto ya no aparece en la lista activa.',
        confirmButtonColor: '#2c5f7c',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible desactivar el producto.'
      void Swal.fire({
        icon: 'error',
        title: 'Operacion fallida',
        text: message,
        confirmButtonColor: '#2c5f7c',
      })
    }
  }

  useEffect(() => {
    let cancelled = false

    const loadInitialProducts = async () => {
      try {
        const data = await productsApi.list()
        if (cancelled) {
          return
        }
        setProducts(data)
        setStatus('idle')
      } catch (error) {
        if (cancelled) {
          return
        }
        const message = error instanceof Error ? error.message : 'No fue posible cargar los productos.'
        setErrorMessage(message)
        setStatus('error')
      }
    }

    void loadInitialProducts()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AdminLayout
      title="Productos"
      subtitle="Productos (incluye servicios) disponibles para ordenes y ventas."
      actionLabel="Nuevo producto"
      onAction={openCreatePanel}
    >
      <div className="admin-toolbar">
        <label className="search-field">
          <span>Buscar</span>
          <input
            type="search"
            placeholder="Nombre, SKU o descripcion"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button className="btn btn-ghost" type="button" onClick={loadProducts}>
          Actualizar lista
        </button>
      </div>

      {status === 'loading' && (
        <div className="state-card">
          <p>Cargando productos...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="state-card state-error">
          <p>{errorMessage}</p>
          <button className="btn btn-secondary" type="button" onClick={loadProducts}>
            Reintentar
          </button>
        </div>
      )}

      {status === 'idle' && filteredProducts.length === 0 && (
        <div className="state-card">
          <p>No hay productos activos registrados.</p>
          <button className="btn btn-secondary" type="button" onClick={openCreatePanel}>
            Crear primer producto
          </button>
        </div>
      )}

      {status === 'idle' && filteredProducts.length > 0 && (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={resolveProductId(product) || product.sku}>
                  <td>
                    <div className="cell-title">{product.name}</div>
                    <span className="cell-subtitle">{product.description || 'Sin descripcion'}</span>
                  </td>
                  <td>{product.sku}</td>
                  <td>${product.price.toLocaleString('es-CL')}</td>
                  <td>{product.stock ?? 0}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-ghost btn-small"
                        type="button"
                        onClick={() => openEditPanel(product)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-secondary btn-small"
                        type="button"
                        onClick={() => handleDelete(product)}
                      >
                        Desactivar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {panelOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closePanel}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedProduct ? 'Editar producto' : 'Nuevo producto'}</h2>
                <p>Completa la informacion requerida para guardar.</p>
              </div>
              <button className="btn btn-ghost" type="button" onClick={closePanel}>
                Cerrar
              </button>
            </div>
            <form className="form-grid" onSubmit={handleSubmit}>
              <label className="field">
                <span>Nombre</span>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span>SKU</span>
                <input
                  type="text"
                  value={formState.sku}
                  onChange={(event) => setFormState((prev) => ({ ...prev, sku: event.target.value }))}
                  required
                />
              </label>
              <label className="field field-full">
                <span>Descripcion</span>
                <input
                  type="text"
                  value={formState.description ?? ''}
                  onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Precio</span>
                <input
                  type="number"
                  min="0"
                  value={formState.price}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, price: Number(event.target.value) }))
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Stock</span>
                <input
                  type="number"
                  min="0"
                  value={formState.stock ?? 0}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, stock: Number(event.target.value) }))
                  }
                />
              </label>
              <div className="form-actions field-full">
                <button
                  className="btn btn-primary"
                  type="submit"
                  aria-disabled={isEditing && !isDirty}
                  disabled={isSaving}
                  onClick={(event) => {
                    if (isEditing && !isDirty) {
                      event.preventDefault()
                      void Swal.fire({
                        toast: true,
                        position: 'center',
                        icon: 'info',
                        title: 'No hay cambios para guardar.',
                        showConfirmButton: false,
                        timer: 2000,
                        timerProgressBar: true,
                      })
                    }
                  }}
                >
                  {isSaving && <span className="btn-spinner" aria-hidden="true" />}
                  {isSaving
                    ? 'Guardando...'
                    : selectedProduct
                      ? 'Guardar cambios'
                      : 'Crear producto'}
                </button>
                <button className="btn btn-ghost" type="button" onClick={closePanel}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
