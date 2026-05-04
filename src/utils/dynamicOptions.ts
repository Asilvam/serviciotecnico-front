export type DynamicOption = {
  id: string
  label: string
  isUnknown?: boolean
}

type BuildDynamicOptionsParams<T> = {
  items: T[]
  currentId?: string
  resolveId: (item: T) => string
  resolveLabel: (item: T) => string
  unknownLabel: (id: string) => string
}

export function buildDynamicOptions<T>({
  items,
  currentId,
  resolveId,
  resolveLabel,
  unknownLabel,
}: BuildDynamicOptionsParams<T>): DynamicOption[] {
  const options = items.reduce<DynamicOption[]>((acc, item) => {
    const id = resolveId(item)
    if (!id) {
      return acc
    }

    acc.push({ id, label: resolveLabel(item) })
    return acc
  }, [])

  if (!currentId || options.some((option) => option.id === currentId)) {
    return options
  }

  return [{ id: currentId, label: unknownLabel(currentId), isUnknown: true }, ...options]
}

