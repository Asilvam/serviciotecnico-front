# Estados de OT y legibilidad del listado

9 de noviembre de 2026.

El número completo de OT se muestra en una sola línea; el cliente queda debajo. Se ajustan el ancho de columna y el espaciado de la tabla. En pantallas estrechas, el desplazamiento horizontal queda dentro de la tabla.

Cada estado tiene texto, punto y color propios: Pendiente, En proceso, Espera repuestos, Completada, Entregada y Cancelada. Si el rol permite cambiar el estado, la etiqueta incluye una flecha y abre una confirmación SweetAlert2 con el folio, estado actual y destinos permitidos. No se guarda nada al abrir el diálogo; requiere pulsar Guardar estado. Durante la petición se muestra la carga y, si hay un error, el diálogo permite corregirlo o volver.

Se reutilizan las reglas del formulario de edición: recepción puede pasar una orden Completada a Entregada; técnicos siguen las transiciones existentes; administración mantiene sus permisos. Cancelar sigue siendo una acción separada con su manejo de stock. El backend conserva la validación final y auditoría. No se agregan estados ni se modifican reglas de negocio.

El filtro Estado de la OT incluye los conteos del listado cargado y se combina con la búsqueda. Cuando no hay coincidencias se ofrece Limpiar filtros.

Validación: TypeScript, ESLint, compilación productiva y cuatro pruebas de permisos/transiciones. En navegador se verificaron el folio sin corte, la confirmación, Volver sin guardar y el filtro vacío/restablecimiento. No se cambiaron estados de órdenes reales durante la prueba.

Sin commit ni despliegue para esta mejora.
