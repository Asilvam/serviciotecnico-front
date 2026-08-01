import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { trackingApi } from '../api/trackingApi.ts'
import { ApiError } from '../api/apiClient.ts'
import AppFooter from '../components/AppFooter.tsx'
import type { PublicTrackingResult } from '../types/serviceOrders.ts'
import {
  formatChileCalendarDate,
  formatChileDateTime,
} from '../utils/chileDateTime.ts'

export default function TrackingPage() {
  const { token = '' } = useParams()
  const [tracking, setTracking] = useState<PublicTrackingResult>()
  const [error, setError] = useState<{ message: string; expired: boolean }>()

  useEffect(() => {
    let active = true

    if (!token) {
      return () => {
        active = false
      }
    }

    void trackingApi
      .find(token)
      .then((result) => {
        if (active) setTracking(result)
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setError({
          message:
            requestError instanceof Error
              ? requestError.message
              : 'No fue posible consultar la orden.',
          expired: requestError instanceof ApiError && requestError.status === 410,
        })
      })

    return () => {
      active = false
    }
  }, [token])

  const displayError = token
    ? error
    : {
        message: 'El enlace de seguimiento no es valido.',
        expired: false,
      }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/" className="brand">
            Servicio Tecnico
          </Link>
        </div>
      </header>

      <main className="container main-content tracking-main">
        <section className="panel tracking-card" aria-live="polite">
          <p className="tracking-eyebrow">Seguimiento de reparación</p>
          {!tracking && !displayError && <p>Consultando estado...</p>}

          {displayError && (
            <>
              <h1>
                {displayError.expired
                  ? 'Seguimiento expirado'
                  : 'No encontramos la orden'}
              </h1>
              <p className="api-error">{displayError.message}</p>
              <Link to="/" className="btn btn-secondary">
                Volver al inicio
              </Link>
            </>
          )}

          {tracking && (
            <>
              <div className="tracking-heading">
                <div>
                  <h1>{tracking.orderNumber}</h1>
                  <p>
                    {tracking.device.type} · {tracking.device.brand}
                    {tracking.device.model ? ` · ${tracking.device.model}` : ''}
                  </p>
                </div>
                <span className={`tracking-status status-${tracking.status}`}>
                  {tracking.statusLabelEs}
                </span>
              </div>

              <dl className="tracking-details">
                <div>
                  <dt>Entrega estimada</dt>
                  <dd>{formatChileCalendarDate(tracking.estimatedDelivery)}</dd>
                </div>
                <div>
                  <dt>Última actualización</dt>
                  <dd>{formatChileDateTime(tracking.updatedAt)}</dd>
                </div>
                {tracking.trackingExpiresAt && (
                  <div>
                    <dt>Seguimiento disponible hasta</dt>
                    <dd>{formatChileDateTime(tracking.trackingExpiresAt)}</dd>
                  </div>
                )}
              </dl>

              <p className="tracking-note">
                Conserva este enlace para volver a consultar el avance de tu reparación.
              </p>
            </>
          )}
        </section>
      </main>

      <AppFooter />
    </div>
  )
}
