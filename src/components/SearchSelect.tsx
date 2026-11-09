import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

type Option = { id: string; name: string; searchText?: string }
type Props = {
  label: string
  placeholder: string
  value: string
  selectedName?: string
  options: Option[]
  disabled?: boolean
  required?: boolean
  loading?: boolean
  error?: string
  onSelect: (option?: Option) => void
}
const normalize = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')

export default function SearchSelect(props: Props) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [invalid, setInvalid] = useState(false)
  const options = props.options.filter((option) =>
    normalize(
      /^\d+$/.test(query.trim())
        ? option.name
        : (option.searchText ?? option.name),
    ).includes(normalize(query.trim())),
  )
  const current =
    props.options.find((option) => option.id === props.value)?.name ||
    props.selectedName
  const close = () => {
    setOpen(false)
    setQuery('')
    setActive(0)
  }
  const show = () => {
    setOpen(true)
    setQuery('')
    setActive(0)
  }
  const choose = (option?: Option) => {
    props.onSelect(option)
    setInvalid(false)
    close()
    trigger.current?.focus()
  }
  useEffect(() => {
    if (open) search.current?.focus()
  }, [open])
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
        setActive(0)
      }
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  const keyboard = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      trigger.current?.focus()
    }
    if (event.key === 'Tab') close()
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const next = Math.max(
        0,
        Math.min(
          options.length - 1,
          active + (event.key === 'ArrowDown' ? 1 : -1),
        ),
      )
      setActive(next)
      document
        .getElementById(`${id}-option-${next}`)
        ?.scrollIntoView({ block: 'nearest' })
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (options[active]) choose(options[active])
    }
  }
  return (
    <div
      className="field search-select"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close()
      }}
    >
      <label id={`${id}-label`} htmlFor={`${id}-trigger`}>
        {props.label}
      </label>
      <button
        id={`${id}-trigger`}
        ref={trigger}
        type="button"
        className={`search-select-trigger${invalid ? ' is-invalid' : ''}`}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        disabled={props.disabled}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            show()
          }
        }}
      >
        <span
          id={`${id}-value`}
          className={current ? '' : 'search-select-placeholder'}
        >
          {current || props.placeholder}
        </span>
        <span aria-hidden="true">▾</span>
      </button>
      <select
        className="search-select-validation"
        aria-hidden="true"
        tabIndex={-1}
        required={props.required}
        disabled={props.disabled}
        value={props.value}
        onChange={() => undefined}
        onInvalid={(event) => {
          event.preventDefault()
          setInvalid(true)
          trigger.current?.focus()
        }}
      >
        <option value="" />
        {props.value && <option value={props.value}>{current}</option>}
      </select>
      {invalid && <small role="alert">Selecciona una marca.</small>}
      {open && !props.disabled && (
        <div className="search-select-popup">
          <input
            ref={search}
            role="combobox"
            aria-label={`Buscar ${props.label.toLocaleLowerCase('es')}`}
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            aria-activedescendant={
              options[active] ? `${id}-option-${active}` : undefined
            }
            type="search"
            placeholder="Escribe para buscar…"
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
            }}
            onKeyDown={keyboard}
          />
          <div
            id={`${id}-list`}
            role="listbox"
            aria-labelledby={`${id}-label`}
            className="search-select-list"
          >
            {!props.required && !query && (
              <button
                type="button"
                role="option"
                aria-selected={!props.value}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose()}
              >
                Dejar sin modelo
              </button>
            )}
            {options.map((option, index) => (
              <button
                key={option.id}
                id={`${id}-option-${index}`}
                type="button"
                role="option"
                aria-selected={option.id === props.value}
                tabIndex={-1}
                className={index === active ? 'is-active' : ''}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                {option.name}
              </button>
            ))}
            {props.loading && <p role="status">Cargando…</p>}
            {props.error && <p role="alert">{props.error}</p>}
            {!props.loading && !props.error && !options.length && (
              <p role="status">Sin coincidencias.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
