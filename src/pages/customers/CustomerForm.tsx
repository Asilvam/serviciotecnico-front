import { useEffect, type FormEvent } from 'react'
import Swal from 'sweetalert2'
import type { Customer, CustomerPayload } from '../../types/customers.ts'
import {
  formatChileanRut,
  isValidChileanRut,
} from '../../utils/chileanRut.ts'
import {
  formatChileanMobile,
  isValidChileanMobile,
  isValidCustomerEmail,
  isValidCustomerName,
  normalizeCustomerEmail,
  normalizeCustomerName,
} from '../../utils/customerValidation.ts'

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
  /** Permite cambiar disponibilidad; reservado para administración. */
  canChangeStatus: boolean
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
  canChangeStatus,
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
    const name = formState.name.trim()
    const email = formState.email.trim()
    const phone = formState.phone?.trim() ?? ''
    const rut = formState.rut?.trim() ?? ''
    let validationMessage = ''

    if (!isValidCustomerName(name)) {
      validationMessage = 'Ingresa un nombre válido usando letras, espacios, puntos, apóstrofes o guiones.'
    } else if (!isValidCustomerEmail(email)) {
      validationMessage = 'Ingresa un correo válido, por ejemplo nombre@correo.cl.'
    } else if ((!isEditing && !phone) || (phone && !isValidChileanMobile(phone))) {
      validationMessage = 'Ingresa un celular  válido, por ejemplo +56 9 1234 5678.'
    } else if ((!isEditing && !rut) || (rut && !isValidChileanRut(rut))) {
      validationMessage = 'Ingresa un RUT  válido con su dígito verificador.'
    }

    if (validationMessage) {
      event.preventDefault()
      void Swal.fire({
        icon: 'warning',
        title: 'Datos inválidos',
        text: validationMessage,
        confirmButtonColor: '#2c5f7c',
      })
      return
    }
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
        <form className="form-grid" onSubmit={handleValidationAndSubmit} noValidate>
          <label className="field">
            <span>Nombre completo</span>
            <input
              type="text"
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              onBlur={() =>
                setFormState((prev) => ({
                  ...prev,
                  name: normalizeCustomerName(prev.name),
                }))
              }
              autoComplete="name"
              maxLength={120}
              required
              aria-invalid={Boolean(formState.name) && !isValidCustomerName(formState.name)}
            />
            {formState.name && !isValidCustomerName(formState.name) && (
              <small className="field-error">Usa al menos dos letras; se guardará en mayúsculas.</small>
            )}
          </label>
          <label className="field">
            <span>RUT</span>
            <input
              type="text"
              inputMode="text"
              autoComplete="off"
              value={formState.rut ?? ''}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, rut: event.target.value }))
              }
              onBlur={() =>
                setFormState((prev) => ({
                  ...prev,
                  rut: prev.rut ? formatChileanRut(prev.rut) : '',
                }))
              }
              placeholder="12.345.678-5"
              required={!isEditing}
              aria-invalid={Boolean(formState.rut) && !isValidChileanRut(formState.rut ?? '')}
            />
            {formState.rut && !isValidChileanRut(formState.rut) && (
              <small className="field-error">El RUT y su dígito verificador no son válidos.</small>
            )}
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={formState.email}
              onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
              onBlur={() =>
                setFormState((prev) => ({
                  ...prev,
                  email: normalizeCustomerEmail(prev.email),
                }))
              }
              autoComplete="email"
              maxLength={254}
              required
              aria-invalid={Boolean(formState.email) && !isValidCustomerEmail(formState.email)}
            />
            {formState.email && !isValidCustomerEmail(formState.email) && (
              <small className="field-error">Ingresa un correo válido, por ejemplo nombre@correo.cl.</small>
            )}
          </label>
          <label className="field">
            <span>Celular </span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={formState.phone ?? ''}
              onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
              onBlur={() =>
                setFormState((prev) => ({
                  ...prev,
                  phone: prev.phone ? formatChileanMobile(prev.phone) : '',
                }))
              }
              placeholder="+56 9 1234 5678"
              required={!isEditing}
              aria-invalid={Boolean(formState.phone) && !isValidChileanMobile(formState.phone ?? '')}
            />
            {formState.phone && !isValidChileanMobile(formState.phone) && (
              <small className="field-error">Debe ser un móvil : +56 9 y ocho dígitos.</small>
            )}
          </label>
          <label className="field">
            <span>Direccion</span>
            <input
              type="text"
              value={formState.address ?? ''}
              onChange={(event) => setFormState((prev) => ({ ...prev, address: event.target.value }))}
            />
          </label>
          {isEditing && canChangeStatus && (
            <label className="field">
              <span>Estado</span>
              <select
                value={formState.isActive === false ? 'inactive' : 'active'}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    isActive: event.target.value === 'active',
                  }))
                }
              >
                <option value="active">Disponible</option>
                <option value="inactive">No disponible</option>
              </select>
            </label>
          )}
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
