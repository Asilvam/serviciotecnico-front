export type AppRole = 'admin' | 'receptionist' | 'technician'

export type Capability =
  | 'view_customers'
  | 'manage_customers'
  | 'deactivate_customers'
  | 'view_products'
  | 'manage_products'
  | 'deactivate_products'
  | 'view_technicians'
  | 'manage_technicians'
  | 'view_orders'
  | 'create_orders'
  | 'manage_order_intake'
  | 'manage_order_work'
  | 'deliver_orders'
  | 'cancel_orders'
  | 'print_orders'
  | 'manage_users'

const roleCapabilities: Record<AppRole, ReadonlySet<Capability>> = {
  admin: new Set<Capability>([
    'view_customers',
    'manage_customers',
    'deactivate_customers',
    'view_products',
    'manage_products',
    'deactivate_products',
    'view_technicians',
    'manage_technicians',
    'view_orders',
    'create_orders',
    'manage_order_intake',
    'manage_order_work',
    'deliver_orders',
    'cancel_orders',
    'print_orders',
    'manage_users',
  ]),
  receptionist: new Set<Capability>([
    'view_customers',
    'manage_customers',
    'view_products',
    'view_technicians',
    'view_orders',
    'create_orders',
    'manage_order_intake',
    'deliver_orders',
    'print_orders',
  ]),
  technician: new Set<Capability>([
    'view_products',
    'view_orders',
    'manage_order_work',
    'print_orders',
  ]),
}

export function isAppRole(role?: string): role is AppRole {
  return role === 'admin' || role === 'receptionist' || role === 'technician'
}

export function hasCapability(role: string | undefined, capability: Capability): boolean {
  return isAppRole(role) && roleCapabilities[role].has(capability)
}
