# Listas — Séptima Compañía CBS

Aplicación web (PWA, también empaquetable con Capacitor para Android/iOS) para registrar la
asistencia de voluntarios en llamados y reuniones. Hecha con Next.js (exportación estática),
Firebase Firestore y Tailwind/Radix.

## Pantallas

| Ruta | Para qué sirve |
| --- | --- |
| `/` | Inicio: nuevo llamado, ver llamados, ver voluntarios |
| `/new-call` | Define fecha, clave, máquina y dirección del llamado |
| `/enroll` | Enrola y retira voluntarios del llamado (tarjeta, búsqueda manual, orden por categoría, exportación a Excel) |
| `/calls` | Lista de llamados registrados; permite eliminar con confirmación |
| `/volunteer` | Búsqueda, edición e importación (Excel) de voluntarios y tarjetas |

Colecciones de Firestore: `llamados`, `voluntarios`, `tarjetas`.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completa con los datos de tu proyecto Firebase
npm run dev                  # http://localhost:9002
```

Otros comandos: `npm run typecheck`, `npm run lint`, `npm run build` (genera `out/`).

## Despliegue

```bash
npm run build                # exportación estática en out/
firebase deploy --only hosting,firestore:rules
```

Para las apps móviles: `npm run build && npx cap sync`. Esto regenera las carpetas `public/`
dentro de `android/` e `ios/`, que **no** se versionan.

## Qué no se sube al repositorio

`out/`, `.env.local`, y las copias de la web dentro de `android/` e `ios/` se generan al compilar
y están en `.gitignore`. Las claves de Firebase del navegador no son secretas, pero lo que
protege los datos son las **reglas de Firestore** (`firestore.rules`); revisa `docs/PROPUESTAS.md`.
