import type { Customer } from '../../types/customers.ts'

/**
 * Propiedades requeridas para el componente {@link CustomerTable}.
 */
type CustomerTableProps = {
  /** Listado de clientes activos a renderizar en la tabla. */
  customers: Customer[]
  /**
   * Callback invocado cuando el usuario hace clic en el botón de edición de un cliente.
   * @param customer Objeto de datos del cliente seleccionado para editar.
   */
  onEdit: (customer: Customer) => void
  /**
   * Callback invocado cuando el usuario hace clic en el botón de desactivación de un cliente.
   * @param customer Objeto de datos del cliente seleccionado para desactivar.
   */
  onDelete: (customer: Customer) => void
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
 *   onDelete={handleDelete}
 *   resolveCustomerId={resolveCustomerId}
 * />
 * ```
 */
export default function CustomerTable({
  customers,
  onEdit,
  onDelete,
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
                <div className="row-actions">
                  <button
                    className="btn btn-ghost btn-small"
                    type="button"
                    onClick={() => onEdit(customer)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-secondary btn-small"
                    type="button"
                    onClick={() => onDelete(customer)}
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
  )
}
