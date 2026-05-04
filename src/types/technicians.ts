export type TechnicianSpecialty = 'electronics' | 'computing' | 'appliances' | 'general'

export type Technician = {
  id?: string
  _id?: string
  name: string
  email: string
  phone?: string
  specialty?: TechnicianSpecialty
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export type TechnicianPayload = {
  name: string
  email: string
  phone?: string
  specialty?: TechnicianSpecialty
}
