import { useEffect, type FormEvent } from 'react'
import Swal from 'sweetalert2'
import type { Customer, CustomerPayload } from '../../types/customers.ts'

/**
 * Propiedades requeridas para el componente {@link CustomerForm}.
 */
type CustomerFormProps = {
  /** Objeto de datos del cliente seleccionado en caso de estar editando; `null` si se está creando un cliente nuevo. */
  selectedCustomer: Customer | null
  /** Estado reactivo local con los datos actuales del formulario. */
  formState: CustomerPayload
  /** Función dispatch para actualizar el estado de los datos del formulario. */
  setFormState: React.Dispatch<React.SetStateAction<CustomerPayload>>
  /** Bandera booleana que indica si hay una petición asíncrona de guardado en curso. */
  isSaving: boolean
  /** Bandera booleana que indica si el formulario está en modo edición. */
  isEditing: boolean
  /** Bandera booleana que determina si el formulario ha sufrido modificaciones respecto a los valores iniciales. */
  isDirty: boolean
  /**
   * Callback invocado al enviar el formulario válido.
   * @param event Evento del envío del formulario.
   */
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
  /** Callback invocado para cerrar el modal o cancelar la operación. */
  onClose: () => void
}

/**
 * Componente de presentación que renderiza el formulario para crear o editar un cliente.
 * 
 * Se muestra dentro de una capa superpuesta (`modal-overlay`) simulando una ventana modal.
 * Maneja internamente el evento de la tecla `Escape` para un cierre accesible y cómodo de la interfaz,
 * y valida si existen cambios pendientes antes de proceder a la llamada de persistencia.
 * 
 * @component
 * @param {CustomerFormProps} props Propiedades del componente.
 * 
 * @example
 * ```tsx
 * <CustomerForm
 *   selectedCustomer={selectedCustomer}
 *   formState={formState}
 *   setFormState={setFormState}
 *   isSaving={isSaving}
 *   isEditing={isEditing}
 *   isDirty={isDirty}
 *   onSubmit={handleSubmit}
 *   onClose={closePanel}
 * />
 * ```
 */
export default function CustomerForm({
  selectedCustomer,
  formState,
  setFormState,
  isSaving,
  isEditing,
  isDirty,
  onSubmit,
  onClose,
}: CustomerFormProps) {
  // Manejo de la tecla Escape para cerrar el diálogo de forma natural
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  /**
   * Valida si hay cambios pendientes antes de procesar el submit.
   * Si está en modo edición y no hay cambios detectados, interrumpe el evento y muestra una alerta.
   */
  const handleValidationAndSubmit = (event: FormEvent<HTMLFormElement>) => {
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
      return
    }
    void onSubmit(event)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{selectedCustomer ? 'Editar cliente' : 'Nuevo cliente'}</h2>
            <p>Completa la informacion requerida para guardar.</p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <form className="form-grid" onSubmit={handleValidationAndSubmit}>
          <label className="field">
            <span>Nombre completo</span>
            <input
              type="text"
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={formState.email}
              onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span>Telefono</span>
            <input
              type="text"
              value={formState.phone ?? ''}
              onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Direccion</span>
            <input
              type="text"
              value={formState.address ?? ''}
              onChange={(event) => setFormState((prev) => ({ ...prev, address: event.target.value }))}
            />
          </label>
          <div className="form-actions field-full">
            <button
              className="btn btn-primary"
              type="submit"
              aria-disabled={isEditing && !isDirty}
              disabled={isSaving}
            >
              {isSaving && <span className="btn-spinner" aria-hidden="true" />}
              {isSaving
                ? 'Guardando...'
                : selectedCustomer
                  ? 'Guardar cambios'
                  : 'Crear cliente'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
