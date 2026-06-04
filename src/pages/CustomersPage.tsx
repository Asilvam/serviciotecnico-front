import AdminLayout from '../components/AdminLayout.tsx'
import { useCustomers } from './customers/useCustomers.ts'
import CustomerTable from './customers/CustomerTable.tsx'
import CustomerForm from './customers/CustomerForm.tsx'

export default function CustomersPage() {
  const {
    status,
    errorMessage,
    query,
    setQuery,
    panelOpen,
    formState,
    setFormState,
    selectedCustomer,
    isSaving,
    isEditing,
    isDirty,
    filteredCustomers,
    resolveCustomerId,
    loadCustomers,
    openCreatePanel,
    openEditPanel,
    closePanel,
    handleSubmit,
    handleDelete,
  } = useCustomers()

  return (
    <AdminLayout
      title="Clientes"
      subtitle="Registra y mantiene actualizada la informacion de tus clientes."
      actionLabel="Nuevo cliente"
      onAction={openCreatePanel}
    >
      <div className="admin-toolbar">
        <label className="search-field">
          <span>Buscar</span>
          <input
            type="search"
            placeholder="Nombre, email o telefono"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button className="btn btn-ghost" type="button" onClick={loadCustomers}>
          Actualizar lista
        </button>
      </div>

      {status === 'loading' && (
        <div className="state-card">
          <p>Cargando clientes...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="state-card state-error">
          <p>{errorMessage}</p>
          <button className="btn btn-secondary" type="button" onClick={loadCustomers}>
            Reintentar
          </button>
        </div>
      )}

      {status === 'idle' && filteredCustomers.length === 0 && (
        <div className="state-card">
          <p>No hay clientes activos registrados.</p>
          <button className="btn btn-secondary" type="button" onClick={openCreatePanel}>
            Crear primer cliente
          </button>
        </div>
      )}

      {status === 'idle' && filteredCustomers.length > 0 && (
        <CustomerTable
          customers={filteredCustomers}
          onEdit={openEditPanel}
          onDelete={handleDelete}
          resolveCustomerId={resolveCustomerId}
        />
      )}

      {panelOpen && (
        <CustomerForm
          selectedCustomer={selectedCustomer}
          formState={formState}
          setFormState={setFormState}
          isSaving={isSaving}
          isEditing={isEditing}
          isDirty={isDirty}
          onSubmit={handleSubmit}
          onClose={closePanel}
        />
      )}
    </AdminLayout>
  )
}
