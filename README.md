# Servicio Tecnico Front

Frontend en React + Vite para Servicio Tecnico.

## Requisitos

- Node.js 20+
- Backend disponible en `VITE_SERVER_URL`

## Variables de entorno

Copia `.env.example` a `.env` y ajusta la URL del backend:

```dotenv
VITE_SERVER_URL=http://localhost:3500
```

## Ejecutar en desarrollo

```bash
npm install
npm run dev
```

El servidor de desarrollo queda expuesto en la red local por el puerto `5173`.

Si vas a entrar desde un iPad u otro equipo de la red, usa la IP local de tu Mac, por ejemplo:

```text
http://192.168.3.160:5173
```

Si tambien vas a usar login desde otro dispositivo, `VITE_SERVER_URL` no debe apuntar a `localhost`; debe apuntar a una IP o hostname accesible desde la red, por ejemplo `http://192.168.3.160:3500`.

## Rutas principales

- `/` Home
- `/login` Login con validacion cliente (`email`, `password >= 6`) y redireccion inmediata a `/dashboard` si ya hay sesion activa
- `/dashboard` Ruta protegida

## Flujo de autenticacion

1. `POST ${VITE_SERVER_URL}/auth/login` con `{ email, password }`.
2. Se extrae token con fallback en: `accessToken`, `token`, `data.accessToken`.
3. Se guarda sesion en `localStorage` por 8 horas (`auth_token`, `auth_user_email`, `expires_at`).
4. Si la sesion no es valida, `/dashboard` redirige a `/`.
5. Si la sesion expira, se muestra una alerta con SweetAlert2 antes de volver al Home.
6. El dashboard permite cerrar sesion y volver al Home.
7. Al estar autenticado, el email del usuario se muestra en la barra superior y el cierre de sesion pide confirmacion.

## Build

```bash
npm run build
```
