import SearchSelect from './SearchSelect.tsx'
import Swal from 'sweetalert2'
import { useEffect, useState } from 'react'
import { deviceCatalogApi } from '../api/deviceCatalogApi.ts'
import type {
  CatalogBrand,
  CatalogModel,
  CatalogPage,
} from '../types/deviceCatalog.ts'

type Values = {
  deviceBrand: string
  deviceModel?: string | null
  deviceBrandId?: string | null
  deviceModelId?: string | null
}
type Props = Values & {
  deviceType: string
  disabled: boolean
  onChange: (values: Values) => void
}

function useOptions(
  kind: 'brand' | 'model',
  brandId: string,
  q: string,
  enabled: boolean,
  revision: number,
) {
  const [state, setState] = useState<{
    items: (CatalogBrand | CatalogModel)[]
    cursor: string | null
    loading: boolean
    error: string
  }>({ items: [], cursor: null, loading: true, error: '' })
  useEffect(() => {
    if (!enabled) return
    const abort = new AbortController()
    const timer = window.setTimeout(() => {
      setState({ items: [], cursor: null, loading: true, error: '' })
      const request =
        kind === 'brand'
          ? deviceCatalogApi.brands(q, undefined, abort.signal)
          : deviceCatalogApi.models(brandId, q, undefined, abort.signal)
      void request
        .then((data: CatalogPage<CatalogBrand | CatalogModel>) => {
          if (!abort.signal.aborted)
            setState({
              items: data.items,
              cursor: data.nextCursor,
              loading: false,
              error: '',
            })
        })
        .catch((error: unknown) => {
          if (!abort.signal.aborted)
            setState({
              items: [],
              cursor: null,
              loading: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'No se pudo cargar el catálogo.',
            })
        })
    }, 250)
    return () => {
      window.clearTimeout(timer)
      abort.abort()
    }
  }, [kind, brandId, q, enabled, revision])
  return state
}

export default function DeviceSelector(props: Props) {
  const [mode, setMode] = useState<'catalog' | 'manual'>(
    props.deviceBrandId || !props.deviceBrand ? 'catalog' : 'manual',
  )
  const [revision, setRevision] = useState(0)
  const phone = props.deviceType.trim().toUpperCase() === 'CELULAR'
  const catalogMode = phone && mode === 'catalog' && !props.disabled
  const brandId = props.deviceBrandId ?? ''
  const brands = useOptions('brand', '', '', catalogMode, revision)
  const models = useOptions(
    'model',
    brandId,
    '',
    catalogMode && Boolean(brandId),
    revision,
  )
  const manual = () => {
    setMode('manual')
    props.onChange({
      deviceBrand: props.deviceBrand,
      deviceModel: props.deviceModel,
      deviceBrandId: null,
      deviceModelId: null,
    })
  }

  if (!catalogMode)
    return (
      <>
        <label className="field">
          <span>Marca</span>
          <input
            value={props.deviceBrand.toLocaleUpperCase('es')}
            required
            disabled={props.disabled}
            onChange={(e) =>
              props.onChange({
                deviceBrand: e.target.value.toLocaleUpperCase('es'),
                deviceModel: props.deviceModel,
                deviceBrandId: null,
                deviceModelId: null,
              })
            }
          />
        </label>
        <label className="field">
          <span>Modelo</span>
          <input
            value={(props.deviceModel ?? '').toLocaleUpperCase('es')}
            disabled={props.disabled}
            onChange={(e) =>
              props.onChange({
                deviceBrand: props.deviceBrand,
                deviceModel: e.target.value.toLocaleUpperCase('es'),
                deviceBrandId: null,
                deviceModelId: null,
              })
            }
          />
        </label>
        {phone && !props.disabled && (
          <div className="field-full device-selector-actions">
            <button
              type="button"
              className="device-selector-link"
              onClick={() => {
                setMode('catalog')
              }}
            >
              Buscar en catálogo
            </button>
          </div>
        )}
      </>
    )

  return (
    <>
      <SearchSelect
        label="Marca"
        placeholder="Selecciona una marca"
        value={brandId}
        selectedName={brandId ? props.deviceBrand : ''}
        options={brands.items}
        required
        loading={brands.loading}
        error={brands.error}
        onSelect={async (brand) => {
          if (!brand || brand.id === brandId) return
          if (props.deviceModel) {
            const result = await Swal.fire({
              icon: 'question',
              title: 'Cambiar marca',
              text: 'Se quitará el modelo anterior.',
              showCancelButton: true,
              confirmButtonText: 'Cambiar',
              cancelButtonText: 'Cancelar',
            })
            if (!result.isConfirmed) return
          }
          props.onChange({
            deviceBrand: brand.name,
            deviceBrandId: brand.id,
            deviceModel: '',
            deviceModelId: null,
          })
        }}
      />
      <SearchSelect
        key={brandId}
        numericNameOnly
        label="Modelo"
        placeholder={
          brandId ? 'Selecciona un modelo' : 'Primero elige una marca'
        }
        value={props.deviceModelId ?? ''}
        selectedName={props.deviceModel ?? ''}
        disabled={!brandId}
        loading={models.loading}
        error={models.error}
        options={models.items
          .filter(
            (item): item is CatalogModel =>
              'brandId' in item && item.brandId === brandId,
          )
          .map((model) => ({
            ...model,
            searchText: [
              model.name,
              ...model.variants.flatMap((variant) => [
                variant.deviceCode,
                variant.modelCode,
              ]),
            ].join(' '),
          }))}
        onSelect={(model) =>
          props.onChange({
            deviceBrand: props.deviceBrand,
            deviceBrandId: brandId,
            deviceModel: model?.name ?? '',
            deviceModelId: model?.id ?? null,
          })
        }
      />
      <div className="field-full device-selector-actions">
        <button type="button" className="device-selector-link" onClick={manual}>
          ¿No encuentras el equipo? Ingresar manualmente
        </button>
        {(brands.error || models.error) && (
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => setRevision((r) => r + 1)}
          >
            Reintentar catálogo
          </button>
        )}
      </div>
    </>
  )
}
