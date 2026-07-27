# Listas 7ma Compañía CBS

Este proyecto es una aplicación web (PWA) desarrollada con Next.js y Firebase para el enrolamiento de voluntarios en llamados de bomberos.

## 🚀 Cómo subir este proyecto a GitHub desde Firebase Studio

Como estás trabajando en **Firebase Studio**, sigue estos pasos para llevar tu código a GitHub:

### 1. Descarga el Proyecto
- En la interfaz de Firebase Studio (donde ves este código), busca en la parte superior derecha un icono de **Download** (una flecha apuntando hacia abajo).
- Esto descargará un archivo llamado `project.zip` o similar en tu computadora.
- Descomprime ese archivo en una carpeta que puedas encontrar fácilmente (por ejemplo, en tu Escritorio).

### 2. Prepara GitHub
- Ve a [GitHub.com](https://github.com) e inicia sesión.
- Haz clic en el botón **"+"** (arriba a la derecha) y selecciona **New repository**.
- Dale un nombre (ej: `listas-7ma`) y haz clic en **Create repository**.
- Verás una pantalla con varias líneas de código. Déjala abierta, la usaremos en el paso 4.

### 3. Abre la Terminal en tu PC
- Abre la carpeta que descomprimiste.
- **En Windows:** Haz clic derecho en un espacio vacío de la carpeta y elige "Abrir en Terminal" o "Abrir PowerShell aquí".
- **En Mac:** Haz clic derecho en la carpeta -> Servicios -> Nuevo terminal en la carpeta.
- **En VS Code:** Si usas Visual Studio Code, simplemente abre la carpeta y ve al menú superior: **Terminal -> New Terminal**.

### 4. Ejecuta estos comandos (Copia y Pega)
Escribe estos comandos uno por uno y presiona Enter después de cada uno:

1. **Inicializa el repositorio:**
   ```bash
   git init
   ```

2. **Prepara los archivos:**
   ```bash
   git add .
   ```

3. **Guarda los cambios localmente:**
   ```bash
   git commit -m "Carga inicial de la aplicación"
   ```

4. **Conecta con GitHub:**
   *Copia la línea que aparece en tu GitHub que empieza con `git remote add origin...` y pégala aquí.*
   Ejemplo:
   ```bash
   git remote add origin https://github.com/tu-usuario/listas-7ma.git
   ```

5. **Sube los archivos finales:**
   ```bash
   git branch -M main
   git push -u origin main
   ```

## 🛠 Características Principales
- **Enrolamiento:** Por tarjeta (NFC) y manual.
- **Seguridad:** Borrado de llamados protegido por palabra secreta.
- **Asistencia:** Lista ordenada por jerarquía y apellidos (Apellidos Nombres).
- **Exportación:** Reportes en Excel para información general y E-Lector.
- **Búsqueda Inteligente:** Búsqueda que ignora tildes y mayúsculas.
- **Reordenamiento:** Capacidad de mover voluntarios en la lista de asistencia y añadir descripciones.
