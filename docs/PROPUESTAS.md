# Propuestas (no aplicadas)

Cambios que conviene hacer pero que **modifican el comportamiento de la app**, así que se dejan
para decidirlos con calma. Ordenados por importancia.

## 1. Proteger los datos en Firestore (importante)

Hoy `firestore.rules` permite `read, write: if true` en `llamados`, `voluntarios` y `tarjetas`, y la
app no pide login. Cualquiera que conozca el ID del proyecto puede leer RUT, registros, grupo
sanguíneo y condición de donante de los voluntarios, y también editar o borrar asistencias.
La API key de Firebase en el navegador no es secreta; lo que protege los datos son estas reglas.

Propuesta:

1. Agregar **Firebase Authentication** con correo y contraseña (una cuenta por oficial, o una
   compartida de la compañía) y una pantalla de ingreso.
2. Cambiar las reglas a:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{coleccion}/{docId} {
         allow read, write: if request.auth != null
           && coleccion in ['llamados', 'voluntarios', 'tarjetas'];
       }
     }
   }
   ```
3. Activar **App Check** para que solo la app oficial pueda hablar con la base de datos.

Nota: el inicio de sesión *anónimo* no sirve como protección, porque cualquiera puede iniciar sesión
de forma anónima. Hay que usar un ingreso real.

No se aplicó porque, sin la pantalla de ingreso, la app dejaría de funcionar.

## 2. Reducir datos sensibles

`voluntarios` guarda RUT, grupo sanguíneo y donante. Revisar si la app realmente los necesita; si no,
dejar de guardarlos y borrar los ya existentes.

## 3. Dependencias

No se tocaron porque requieren `npm install` y actualizar `package-lock.json`:

- Quitar lo que no se usa: `genkit`, `@genkit-ai/google-genai`, `@genkit-ai/next`, `genkit-cli`,
  `dotenv`, la carpeta `src/ai/` y los scripts `genkit:*` (no hay ningún flujo definido).
- Alinear versiones de Capacitor: `@capacitor/core` está en ^8 y `@capacitor/cli` en ^7.
- `xlsx` 0.18.5 está sin mantenimiento y tiene avisos de seguridad conocidos; ejecutar `npm audit`
  y evaluar `exceljs` u otra alternativa.
- `sonner` no se usa en ningún archivo y `recharts` solo aparece en `components/ui/chart.tsx`; quitar ambos si no se necesitan.
- Renombrar el paquete (`"name": "nextn"`) a algo como `listas-cbs`.

## 4. Código

- `src/app/enroll/EnrollPage.tsx` tiene ~740 líneas y mucho estado en un solo componente. Separar en
  componentes (lista de asistencia, buscador manual, diálogos) y en un hook de datos.
- Botones sin acción: **"Consultar datos"** en `/new-call` y **"Salir"** en `/`. Definir qué deben
  hacer o quitarlos.
- Reemplazar los `any` por tipos de Firestore (`Volunteer`, `Llamado`) compartidos en `src/lib/types.ts`.
- Agregar pruebas (por ejemplo con Vitest) para la agrupación de llamados y la normalización de
  búsqueda (`removeDiacritics`).
- Agregar un chequeo de CI (`typecheck` y `lint`) en GitHub Actions.

## 5. Historial

El repositorio tiene un solo commit. Se recomienda trabajar siempre con ramas y pull requests.
