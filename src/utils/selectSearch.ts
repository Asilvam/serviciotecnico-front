type SearchOption = { name: string; searchText?: string }
const normalize = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')

export function matchesSelectOption(option: SearchOption, query: string, modelSearch = false): boolean {
  const term = normalize(query.trim())
  // Names remain predictable; hidden variant codes only participate in specific code queries.
  const codeQuery = term.length >= 3 && /[a-z]/.test(term) && /\d/.test(term)
  const text = modelSearch && !codeQuery ? option.name : (option.searchText ?? option.name)
  return normalize(text).includes(term)
}
