# Commit de compilación en el footer

El footer muestra la versión de package.json y, a su lado, Build seguido de los primeros siete caracteres del commit. El tooltip muestra el hash completo.

Vite utiliza CF_PAGES_COMMIT_SHA o GITHUB_SHA cuando están disponibles y contienen un hash válido; en el entorno local consulta git rev-parse HEAD desde la carpeta del proyecto. Sin información de Git muestra Build local. El valor queda fijado al compilar; en desarrollo se actualiza al reiniciar Vite. El hash identifica el commit base y no incluye modificaciones locales sin commit.

No requiere dependencias nuevas. La distribución permite saltos de línea en pantallas estrechas. Compilación y ESLint correctos.
