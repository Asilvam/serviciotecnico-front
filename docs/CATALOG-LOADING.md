# Una sola carga para el catálogo

9 de noviembre de 2026.

Las marcas y modelos se consultan en páginas de hasta 50 registros. Anteriormente cada página abría y cerraba su propio SweetAlert2; las marcas con muchos modelos producían múltiples ciclos de carga.

Ahora la consulta completa comparte un solo loading: se inicia ante la primera petición HTTP real y termina después de la última página, o al fallar o cancelarse. Las peticiones individuales son silenciosas. Se conserva la caché de una hora por sesión; si todas las páginas están en caché no se muestra loading. La búsqueda dentro del listado sigue siendo local.

La paginación continúa siendo secuencial porque cada respuesta entrega el cursor siguiente. Este cambio elimina las aperturas repetidas; no elimina el tiempo necesario para consultar las páginas en la primera carga.

Validación: 19 pruebas del frontend, compilación y ESLint correctos. Pruebas específicas de tres páginas con un único inicio/cierre, caché sin loading y error en página intermedia con liberación del loading. Sin commit ni despliegue.
