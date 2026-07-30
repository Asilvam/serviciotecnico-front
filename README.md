# Servicio Técnico Front

Frontend en React + Vite para administrar trabajos de un servicio técnico de electrónica. El sistema contempla celulares, notebooks, computadores, equipos Apple, pantallas y otros dispositivos electrónicos.

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
VITE_SERVER_URL=http://IP_DEL_SERVIDOR:3500
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
- `/service-orders`: protegido.
- `/users`: protegido; ademas valida permisos admin en la pagina.

## Roles y alcances

| Función | Admin | Recepción | Técnico |
|---|:---:|:---:|:---:|
| Ver y crear clientes | Sí | Sí | No |
| Editar datos de clientes | Sí | Sí | No |
| Cambiar disponibilidad de clientes | Sí | No | No |
| Ver técnicos | Sí, todos | Sí, disponibles | No |
| Crear, editar estado o eliminar técnicos | Sí | No | No |
| Ver productos | Sí | Sí | Sí |
| Administrar productos | Sí | No | No |
| Crear órdenes | Sí | Sí | No |
| Editar recepción y asignación | Sí | Sí, según estado | No |
| Registrar diagnóstico, trabajo y repuestos | Sí | No | Sí, en sus órdenes |
| Marcar una orden completada como entregada | Sí | Sí | No |
| Cancelar o eliminar físicamente órdenes | Sí | No | No |
| Administrar usuarios | Sí | No | No |

### Disponibilidad de clientes y técnicos

- El administrador ve registros disponibles y no disponibles; recepción solo recibe los disponibles desde la API.
- La disponibilidad se cambia dentro del formulario **Editar**, no mediante una acción separada en la tabla.
- Un cliente no disponible no puede utilizarse para crear o reasignar una orden.
- Un técnico no disponible no aparece al crear una orden y la API rechaza cualquier asignación nueva hacia ese técnico.
- Si una orden histórica ya tiene asignado un técnico no disponible, el formulario conserva y muestra esa referencia como `No disponible`.
- El borrado físico de clientes y técnicos es exclusivo del administrador y solo se permite cuando no existen órdenes asociadas.

## Flujo de órdenes de servicio

Estados soportados:

```text
Pendiente -> En proceso -> Espera repuestos -> En proceso -> Completada -> Entregada
```

- El técnico solo ve sus órdenes asignadas y puede actualizar diagnóstico, trabajo realizado, repuestos y transiciones técnicas válidas.
- Recepción administra los datos de ingreso mientras la orden está pendiente, asigna técnico/prioridad/fecha en estados operativos y entrega órdenes completadas.
- El administrador puede ver y modificar toda la orden. La cancelación usa una acción específica para devolver correctamente los repuestos al stock.
- Una orden cancelada se identifica con una etiqueta roja.
- El administrador puede eliminar físicamente cualquier orden; la acción queda en auditoría y restaura inventario cuando corresponde.
- Los formularios `PATCH` envían y conservan únicamente los cambios permitidos para cada rol.

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

## Flujo de impresion de ordenes

- Al crear una orden de servicio, el frontend muestra una confirmacion para imprimir el ticket.
- Solo si el usuario confirma, el frontend llama `POST /service-orders/:id/print-80mm`.
- Desde el listado de ordenes tambien se puede disparar impresion manual por fila.
- El backend no imprime automaticamente al crear la orden; la impresion es un paso manual y explicito.

## Acciones de tabla

Las acciones usan iconos SVG minimalistas y accesibles, con texto descriptivo mediante `title` y `aria-label`. Según el módulo y los permisos pueden aparecer acciones para ver, editar, imprimir, cancelar o eliminar definitivamente.

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
