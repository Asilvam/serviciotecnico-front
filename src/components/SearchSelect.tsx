import { matchesSelectOption } from '../utils/selectSearch.ts'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

type Option = { id: string; name: string; searchText?: string }
type Props = {
  label: string
  labelAction?: ReactNode
  placeholder: string
  value: string
  selectedName?: string
  options: Option[]
  disabled?: boolean
  required?: boolean
  loading?: boolean
  error?: string
  emptyLabel?: string
  allowClear?: boolean
  numericNameOnly?: boolean
  searchable?: boolean
  onSelect: (option?: Option) => void
}

export default function SearchSelect(props: Props) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [menuLayout, setMenuLayout] = useState({ above: false, listHeight: 320, left: 0, top: 0, width: 0 })
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [invalid, setInvalid] = useState(false)
  const options = props.options.filter(option => matchesSelectOption(option, query, props.numericNameOnly))
  const current =
    props.options.find((option) => option.id === props.value)?.name ||
    props.selectedName
  const close = () => {
    setOpen(false)
    setQuery('')
    setActive(0)
  }
  const show = () => {
    if (root.current) {
      const rect = trigger.current!.getBoundingClientRect()
      const top = 8
      const bottom = window.innerHeight - 8
      const below = bottom - rect.bottom - 5
      const above = rect.top - top - 5
      const overhead = props.searchable === false ? 16 : 72
      const desired = Math.min(320, window.innerHeight * .35, props.options.length * 42) + overhead
      const opensAbove = below < desired && above > below
      setMenuLayout({ left: rect.left, top: opensAbove ? window.innerHeight - rect.top + 5 : rect.bottom + 5, width: rect.width, above: opensAbove, listHeight: Math.max(40, Math.min(320, window.innerHeight * .35, (opensAbove ? above : below) - overhead)) })
    }
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
    if (open) {
      popup.current?.showPopover()
      if (props.searchable === false) list.current?.focus()
      else search.current?.focus()
    }
  }, [open, props.searchable])
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
  const keyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
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
    if (event.key === 'Enter' || (props.searchable === false && event.key === ' ')) {
      event.preventDefault()
      event.stopPropagation()
      if (options[active]) choose(options[active])
    }
  }
  return (
    <div
      className={`field search-select${open ? ' is-open' : ''}`}
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close()
      }}
    >
      {props.labelAction ? (
        <div className="field-label-actions">
          <label id={`${id}-label`} htmlFor={`${id}-trigger`}>
            {props.label}
          </label>
          {props.labelAction}
        </div>
      ) : (
        <label id={`${id}-label`} htmlFor={`${id}-trigger`}>
          {props.label}
        </label>
      )}
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
      {props.required && (
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
      )}
      {invalid && <small role="alert">{props.placeholder}.</small>}
      {open && !props.disabled && (
        <div ref={popup} popover="manual" className="search-select-popup" style={{ left: menuLayout.left, width: menuLayout.width, top: menuLayout.above ? 'auto' : menuLayout.top, bottom: menuLayout.above ? menuLayout.top : 'auto', '--select-list-height': `${menuLayout.listHeight}px` } as React.CSSProperties}>
          {props.searchable !== false && (
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
          )}
          <div
            ref={list}
            tabIndex={props.searchable === false ? 0 : undefined}
            onKeyDown={props.searchable === false ? keyboard : undefined}
            aria-activedescendant={
              props.searchable === false && options[active]
                ? `${id}-option-${active}`
                : undefined
            }
            id={`${id}-list`}
            role="listbox"
            aria-labelledby={`${id}-label`}
            className="search-select-list"
          >
            {!props.required && props.allowClear !== false && !query && (
              <button
                type="button"
                role="option"
                aria-selected={!props.value}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose()}
              >
                {props.emptyLabel ?? 'Continuar sin modelo'}
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
