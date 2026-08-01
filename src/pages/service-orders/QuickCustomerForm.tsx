import { useEffect, useState, type FormEvent } from 'react'
import type { CustomerPayload } from '../../types/customers.ts'
import {
  formatChileanRut,
  isValidChileanRut,
  normalizeChileanRut,
} from '../../utils/chileanRut.ts'

type QuickCustomerFormProps = {
  onCreate: (payload: CustomerPayload) => Promise<void>
  onClose: () => void
}

const emptyCustomer: CustomerPayload = {
  name: '',
  rut: '',
  email: '',
  phone: '',
  address: '',
}

export default function QuickCustomerForm({
  onCreate,
  onClose,
}: QuickCustomerFormProps) {
  const [formState, setFormState] = useState<CustomerPayload>(emptyCustomer)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const rutIsInvalid = Boolean(formState.rut) && !isValidChileanRut(formState.rut ?? '')

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSaving, onClose])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')

    if (!formState.rut || !isValidChileanRut(formState.rut)) {
      setErrorMessage('Ingresa un RUT chileno válido con su dígito verificador.')
      return
    }

    setIsSaving(true)
    try {
      await onCreate({
        name: formState.name.trim(),
        rut: normalizeChileanRut(formState.rut),
        email: formState.email.trim(),
        phone: formState.phone?.trim() || undefined,
        address: formState.address?.trim() || undefined,
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No fue posible crear el cliente.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="modal-overlay modal-overlay-nested"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-customer-title"
      onClick={() => !isSaving && onClose()}
    >
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 id="quick-customer-title">Nuevo cliente</h2>
            <p>Se creará y quedará seleccionado en la orden.</p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={onClose} disabled={isSaving}>
            Cerrar
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Nombre completo</span>
            <input
              type="text"
              value={formState.name}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, name: event.target.value }))
              }
              required
              autoFocus
            />
          </label>
          <label className="field">
            <span>RUT</span>
            <input
              type="text"
              value={formState.rut ?? ''}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, rut: event.target.value }))
              }
              onBlur={() =>
                setFormState((previous) => ({
                  ...previous,
                  rut: previous.rut ? formatChileanRut(previous.rut) : '',
                }))
              }
              placeholder="12.345.678-5"
              required
              aria-invalid={rutIsInvalid}
            />
            {rutIsInvalid && (
              <small className="field-error">El RUT y su dígito verificador no son válidos.</small>
            )}
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={formState.email}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, email: event.target.value }))
              }
              required
            />
          </label>
          <label className="field">
            <span>Teléfono</span>
            <input
              type="tel"
              value={formState.phone ?? ''}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, phone: event.target.value }))
              }
            />
          </label>
          <label className="field field-full">
            <span>Dirección</span>
            <input
              type="text"
              value={formState.address ?? ''}
              onChange={(event) =>
                setFormState((previous) => ({ ...previous, address: event.target.value }))
              }
            />
          </label>

          {errorMessage && <p className="api-error field-full">{errorMessage}</p>}

          <div className="form-actions field-full">
            <button className="btn btn-primary" type="submit" disabled={isSaving}>
              {isSaving && <span className="btn-spinner" aria-hidden="true" />}
              {isSaving ? 'Creando...' : 'Crear y seleccionar'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
