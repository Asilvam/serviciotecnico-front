# Listados compactos sin búsqueda

9 de noviembre de 2026.

La especialidad de técnico y el rol de usuario usan el mismo listado compacto del selector de Marca, pero sin cuadro de búsqueda. Se conservan sus valores, opciones, permisos, conteos y validaciones. No se modifican registros al abrir un listado.

El componente admite flechas, Enter, Espacio y Escape. Escape cierra solo el listado. La selección de un producto con Enter no confirma automáticamente el diálogo: hay que pulsar Agregar. Cantidad, precio y validación de duplicados mantienen su comportamiento.

El producto se monta como componente React dentro de SweetAlert2 y se desmonta al cerrar, sin instalar dependencias. Los textos largos pueden ocupar más de una línea dentro del menú, sin desbordar el diálogo.

Validación: TypeScript, ESLint, compilación productiva, pruebas existentes de carga/caché/paginación/permisos y revisión de las cuatro pantallas sin guardar cambios de prueba en la base de negocio. Sin despliegue de estas mejoras.

## Filtro visible de estados de OT

El filtro de estados usa botones visibles con conteos (Todas, Pendiente, En proceso, Espera repuestos, Completada, Entregada y Cancelada), sin desplegable ni búsqueda. Solo uno está activo, marcado por color y aria-pressed; Todas restablece el listado completo. Se combina con la búsqueda general y conserva el mensaje de ausencia de coincidencias y Limpiar filtros. En pantallas estrechas los botones pasan a otra fila. No se asignan estados al filtrar ni se envían mutaciones a la API.

## Ajuste del selector de productos

El listado muestra únicamente el nombre del producto, sin SKU, stock ni precio. Al abrirse flota sobre el diálogo sin modificar su altura, igual que Marca. Su capa queda por encima de los campos y botones. La lista tiene altura limitada y scroll interno. Precio, identificador y validaciones conservan su lógica. Verificado visualmente sin guardar la orden; build y ESLint correctos.

El selector de productos sí incluye buscador integrado, igual que Marca. Filtra por nombre localmente, sin nuevas peticiones ni cargas. Conserva únicamente nombres visibles y la distribución sin superposiciones.

El menú de productos es flotante con altura máxima y scroll interno; no expande la tarjeta.

Se corrigió también la capa del contenedor de SweetAlert2 para que sus botones no queden por encima del menú. Selección y cierre comprobados visualmente.
