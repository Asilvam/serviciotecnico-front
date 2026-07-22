import type { Customer } from '../../types/customers.ts'
import ActionIcon from '../../components/ActionIcon.tsx'

/**
 * Propiedades requeridas para el componente {@link CustomerTable}.
 */
type CustomerTableProps = {
  /** Listado de clientes visibles para el rol actual. */
  customers: Customer[]
  /**
   * Callback invocado cuando el usuario hace clic en el botón de edición de un cliente.
   * @param customer Objeto de datos del cliente seleccionado para editar.
   */
  onEdit: (customer: Customer) => void
  /** Elimina físicamente un cliente sin órdenes asociadas. */
  onPermanentDelete: (customer: Customer) => void
  canDeletePermanently: boolean
  /**
   * Función de utilidad para resolver de forma segura el identificador único del cliente.
   * Resuelve diferencias de esquema (ej. `id` vs `_id`).
   * @param customer Objeto del cliente.
   * @returns Identificador único en formato de cadena de texto.
   */
  resolveCustomerId: (customer: Customer) => string
}

/**
 * Componente de presentación que renderiza una tabla con la lista de clientes.
 * 
 * Representa de forma estructurada los datos principales de los clientes (Nombre, Email, Teléfono, Dirección)
 * y expone las acciones de edición y desactivación mediante botones dedicados para cada registro.
 * 
 * @component
 * @param {CustomerTableProps} props Propiedades del componente.
 * 
 * @example
 * ```tsx
 * <CustomerTable
 *   customers={filteredCustomers}
 *   onEdit={openEditPanel}
 *   onPermanentDelete={handlePermanentDelete}
 *   canDeletePermanently={canDeletePermanently}
 *   resolveCustomerId={resolveCustomerId}
 * />
 * ```
 */
export default function CustomerTable({
  customers,
  onEdit,
  onPermanentDelete,
  canDeletePermanently,
  resolveCustomerId,
}: CustomerTableProps) {
  return (
    <div className="table-card">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Contacto</th>
            <th>Direccion</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={resolveCustomerId(customer) || customer.email}>
              <td>
                <div className="cell-title">{customer.name}</div>
                <span className="cell-subtitle">{customer.email}</span>
              </td>
              <td>{customer.phone || 'Sin telefono'}</td>
              <td>{customer.address || 'Sin direccion'}</td>
              <td>
                <span
                  className={`status-badge ${customer.isActive === false ? 'is-inactive' : 'is-active'}`}
                >
                  {customer.isActive === false ? 'No disponible' : 'Disponible'}
                </span>
              </td>
              <td>
                <div className="row-actions">
                  <button
                    className="btn btn-ghost btn-small btn-icon"
                    type="button"
                    onClick={() => onEdit(customer)}
                    aria-label="Editar cliente"
                    title="Editar"
                  >
                    <ActionIcon name="edit" />
                  </button>
                  {canDeletePermanently && (
                    <button
                      className="btn btn-danger btn-small btn-icon"
                      type="button"
                      onClick={() => onPermanentDelete(customer)}
                      aria-label="Borrar cliente definitivamente"
                      title="Borrar definitivamente"
                    >
                      <ActionIcon name="delete" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
