# Servicio Tecnico Front

Frontend en React + Vite para Servicio Tecnico.

## Requisitos

- Node.js 20+
- Backend disponible y accesible desde `VITE_SERVER_URL`

## Variables de entorno

1. Copia `.env.example` a `.env`.
2. Ajusta `VITE_SERVER_URL` segun tu entorno.

```dotenv
VITE_SERVER_URL=http://localhost:3500
```

Si accedes desde otro equipo de la red (iPad, notebook, etc.), usa una URL alcanzable por ese equipo:

```dotenv
VITE_SERVER_URL=http://:3500
```

## Scripts

```bash
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

- `dev`: inicia Vite en `0.0.0.0:5173` (`strictPort: true`).
- `lint`: ejecuta ESLint sobre todo el proyecto.
- `build`: ejecuta `tsc -b` y luego `vite build`.
- `preview`: sirve el build de produccion localmente.

## Rutas

- `/`: Home publico.
- `/login`: solo publico (`PublicOnlyRoute`). Si ya hay sesion valida, redirige a `/dashboard`.
- `/dashboard`: protegido (`ProtectedRoute`).
- `/customers`: protegido.
- `/technicians`: protegido.
- `/products`: protegido.
- `/users`: protegido; ademas valida permisos admin en la pagina.

## Flujo de autenticacion y sesion

1. Login via `POST ${VITE_SERVER_URL}/auth/login` con `{ email, password }`.
2. El token se extrae con fallback: `accessToken`, `token`, `data.accessToken`, `data.token`.
3. Se guarda sesion en `localStorage` por 8 horas:
   - `auth_token`
   - `auth_user_email`
   - `auth_user_role` (cuando esta disponible)
   - `expires_at`
4. Despues del login se intenta consultar `GET ${VITE_SERVER_URL}/auth/profile` para guardar el rol.
5. `ProtectedRoute` redirige a `/` si no hay sesion valida.
6. Si la sesion expiro, la redireccion a `/` incluye estado para mostrar alerta de "Sesion expirada" en Home.
7. `PublicOnlyRoute` evita entrar a `/login` cuando la sesion ya es valida.

## Notas de uso

- El Home y el Dashboard muestran el email de la sesion activa.
- El cierre de sesion pide confirmacion con SweetAlert2 a traves de un hook unificado y limpia `localStorage`.
- El footer muestra la version de `package.json` via `__APP_VERSION__`.

## Arquitectura y Buenas Prácticas

El codigo del frontend sigue principios modernos de modularizacion y desacoplamiento de componentes para asegurar un mantenimiento escalable y limpio:

### 1. Cliente API flexible (`src/api/apiClient.ts`)
Centraliza todas las peticiones HTTP utilizando fetch. Soporta configuracion flexible por llamada:
- `requiresAuth` (por defecto `true`): Añade de forma automatica la cabecera `Authorization: Bearer <token>`.
- Para endpoints publicos (como login), se puede desactivar pasando la bandera `{ requiresAuth: false }` en las opciones.

### 2. Cierre de sesion centralizado (`src/auth/useLogout.ts`)
- Se centraliza el flujo interactivo de cierre de sesion en el custom hook `useLogout`. Este maneja el dialogo SweetAlert2, la limpieza del almacenamiento local y la redireccion de forma homogenea en toda la aplicacion.

### 3. Modularizacion de vistas administrativas (`src/pages/<modulo>/`)
Para evitar paginas masivas y de dificil mantenimiento, las vistas principales de administracion de datos se estructuran siguiendo una separacion estricta de responsabilidades:
- **`use<Modulo>.ts`**: Custom hook que encapsula toda la logica de negocio, estado de React, llamadas de red y filtros de busqueda.
- **`<Modulo>Table.tsx`**: Componente de presentacion dedicado exclusivamente a la maquetacion y visualizacion de la tabla de datos.
- **`<Modulo>Form.tsx`**: Componente de presentacion para la visualizacion del modal overlay, los campos del formulario, las validaciones locales y los accesos de teclado nativos (como cerrar con Escape).
- **`<Modulo>Page.tsx`**: Vista de entrada de la ruta que actua puramente como orquestador declarativo combinando el custom hook con los subcomponentes.


