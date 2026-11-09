const { test } = require('node:test')
const assert = require('node:assert/strict')
const policy = import('../src/utils/orderStatusOptions.ts')
test('reception can deliver completed orders but cannot advance pending work', async () => {
  const { orderStatusOptions } = await policy
  assert.deepEqual(orderStatusOptions('receptionist', 'pending'), ['pending'])
  assert.deepEqual(orderStatusOptions('receptionist', 'completed'), ['completed', 'delivered'])
  assert.deepEqual(orderStatusOptions('receptionist', 'delivered'), ['delivered'])
})
test('technician actions follow the existing workflow and lock terminal orders', async () => {
  const { orderStatusOptions } = await policy
  assert.deepEqual(orderStatusOptions('technician', 'pending'), ['pending', 'in_progress'])
  assert.deepEqual(orderStatusOptions('technician', 'in_progress'), ['in_progress', 'waiting_parts', 'completed'])
  for (const status of ['completed', 'delivered', 'cancelled']) assert.deepEqual(orderStatusOptions('technician', status), [status])
})
test('cancellation remains a separate audited action', async () => {
  const { orderStatusOptions } = await policy
  assert.equal(orderStatusOptions('admin', 'pending').includes('cancelled'), false)
  assert.equal(orderStatusOptions('admin', 'pending').includes('delivered'), true)
})
test('unrecognized roles cannot change status', async () => {
  const { orderStatusOptions } = await policy
  assert.deepEqual(orderStatusOptions(undefined, 'pending'), ['pending'])
})
