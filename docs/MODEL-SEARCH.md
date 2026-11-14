# Búsqueda predecible de modelos

Se corrigieron coincidencias inesperadas con letras en códigos internos de variantes. Las consultas de letras o solo números filtran el nombre visible del modelo. Las consultas de al menos tres caracteres con letras y números también buscan en códigos internos, por ejemplo SM-G991. Se conserva la búsqueda sin distinción de mayúsculas o tildes y el filtrado local sin peticiones HTTP. Otros selectores mantienen su búsqueda habitual, incluido el RUT de cliente.

Validación: 22 pruebas, compilación y ESLint correctos. Casos: V excluye IQOO 10 cuyo código es V2218A; V encuentra V40; SM-G991 encuentra GALAXY S21; 13 no coincide con un código interno de otro modelo. Sin commit.
