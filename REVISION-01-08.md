# Revisión del frontend — 01-08-2026

## Resumen

El proyecto compila correctamente y no presenta errores de ESLint. La revisión detectó dos problemas funcionales de prioridad alta, tres riesgos de prioridad media y una brecha de cobertura automatizada.

## Hallazgos

### 1. Prioridad alta: no se puede cambiar únicamente la contraseña de un usuario

En `src/pages/UsersPage.tsx`, la detección de cambios elimina siempre el campo `password` antes de comparar el formulario con el estado inicial. Si un administrador modifica solamente la contraseña, `isDirty` continúa siendo `false` y el botón evita el envío mostrando “No hay cambios para guardar”.

Referencias:

- `src/pages/UsersPage.tsx:67`
- `src/pages/UsersPage.tsx:504`
- `src/pages/UsersPage.tsx:538`

Recomendación: considerar una contraseña no vacía como un cambio válido durante la edición y conservar la exclusión solamente cuando el campo esté vacío.

### 2. Prioridad alta: algunas órdenes existentes pueden quedar imposibles de actualizar

El envío del formulario valida siempre que `deviceType` sea una sola palabra alfanumérica, incluso cuando el usuario está editando únicamente información técnica y no tiene permiso para modificar ese campo. Una orden histórica con categorías como `SMART TV`, `PC-ESCRITORIO` o valores equivalentes aceptados por la API bloqueará actualizaciones de diagnóstico, trabajo realizado, repuestos o estado.

Referencia:

- `src/pages/ServiceOrdersPage.tsx:735`

Recomendación: ejecutar esta validación solamente al crear una orden o cuando el usuario realmente pueda editar el dato de recepción. También conviene definir una regla compartida con la API para evitar diferencias entre frontend y backend.

### 3. Prioridad media: manejo inconsistente de fechas estimadas

El valor de `estimatedDelivery` recibido desde la API se asigna directamente a un `input` de tipo `date`. Este control requiere el formato `YYYY-MM-DD`, mientras que la API puede entregar una fecha ISO completa. En ese caso, el campo puede mostrarse vacío.

Además, las fechas se convierten mediante `new Date()` y se muestran en la zona horaria local. Una fecha almacenada a medianoche UTC puede aparecer como el día anterior en Chile.

Referencias:

- `src/pages/ServiceOrdersPage.tsx:693`
- `src/pages/ServiceOrdersPage.tsx:1353`
- `src/pages/TrackingPage.tsx:8`

Recomendación: normalizar explícitamente las fechas de calendario a `YYYY-MM-DD` y mostrarlas sin aplicar una conversión de zona horaria. Mantener un tratamiento diferente para fechas que sí representan un instante con hora, como `updatedAt`.

### 4. Prioridad media: la portada descarga imágenes excesivamente pesadas

Las tres imágenes de la portada tienen una resolución de 1600 × 912 píxeles y suman aproximadamente 7,2 MB. Todas se renderizan al cargar la página, incluidas las miniaturas.

El build generó los siguientes archivos aproximados:

- 1,8 MB
- 2,4 MB
- 3,2 MB

Referencia:

- `src/App.tsx:7`
- `src/App.tsx:106`

Recomendación: convertir las imágenes a WebP o AVIF, generar miniaturas reales, definir dimensiones y aplicar carga diferida a las imágenes que no sean la principal.

### 5. Prioridad media: las tablas pueden quedar recortadas en pantallas angostas

El contenedor `.table-card` utiliza `overflow: hidden`. Las tablas administrativas contienen hasta siete columnas y no disponen de desplazamiento horizontal, por lo que parte del contenido o las acciones puede quedar inaccesible en tablet o móvil.

Referencia:

- `src/App.css:200`

Recomendación: usar `overflow-x: auto`, establecer un ancho mínimo razonable para las tablas y verificar las acciones en resoluciones de tablet.

### 6. Prioridad baja: no existen pruebas automatizadas del frontend

No se encontraron archivos de pruebas para los componentes o flujos del frontend. Los permisos por rol, la edición de órdenes, las fechas, la impresión y la administración de usuarios dependen actualmente de validación manual.

Recomendación: comenzar con pruebas para los dos defectos de prioridad alta y después cubrir autenticación, permisos, transiciones de órdenes y estados de impresión.

## Comprobaciones realizadas

- `npm run lint`: correcto.
- `npm run build`: correcto.
- Contratos principales contrastados con el proyecto `serviciotecnico-api`.
- Tamaño y dimensiones de las imágenes revisados localmente.

## Estado del repositorio durante la revisión

Antes de crear este documento existía un cambio local en `.env.example`. Ese cambio fue preservado y no forma parte de esta revisión.

## Actualización implementada — 01-08-2026

- Se agregó creación rápida de clientes durante el ingreso de una orden; el cliente nuevo queda seleccionado automáticamente.
- Se agregó RUT chileno al modelo de cliente, con normalización, validación de dígito verificador y control de duplicados en la API.
- Los clientes históricos sin RUT se mantienen compatibles.
- Se corrigió el hallazgo de fechas estimadas: el formulario usa valores `YYYY-MM-DD` y las fechas con hora se muestran en `America/Santiago`.
- Se aplicó la zona chilena a la página pública de seguimiento, al ticket térmico y al resumen PDF del agente de impresión.
