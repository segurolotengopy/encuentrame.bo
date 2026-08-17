# Guía de configuración en consolas — encuentrame.bo

**Para:** alberdi.andres@gmail.com · **Proyecto:** `encuentramebo-1` · **Repo:** `segurolotengopy/encuentrame.bo`

Cuatro bloques. Tiempo estimado total: 20 minutos. Al terminar, cada push a `main`
despliega la aplicación automáticamente.

---

## Bloque 1 — GitHub: las 3 variables del despliegue

**Solo se cargan tres variables.** (La configuración de Firebase ya no va aquí:
ahora vive versionada en `apps/web/.env.production`, ver Bloque 3 — son valores
públicos que viajan en el bundle JavaScript de todos modos.)

### Ruta exacta en la interfaz

1. Abra `https://github.com/segurolotengopy/encuentrame.bo`
2. Barra superior del repositorio → pestaña **`⚙ Settings`**
   *(es la última pestaña, a la derecha de "Insights". Si no la ve, su cuenta no
   tiene rol Admin en el repo: pídalo desde la cuenta segurolotengopy.)*
3. Menú lateral izquierdo → baje hasta la sección **Security** → clic en
   **`Secrets and variables`** → se despliega un submenú → clic en **`Actions`**
4. En la página aparecen dos pestañas: **`Secrets`** y **`Variables`**.
   👉 Clic en **`Variables`** (la de la derecha).
5. Botón verde **`New repository variable`**, una vez por cada fila:

| Name | Value |
|---|---|
| `GCP_PROJECT_ID` | `encuentramebo-1` |
| `GCP_SERVICE_ACCOUNT` | `deployer@encuentramebo-1.iam.gserviceaccount.com` |
| `GCP_WIF_PROVIDER` | `projects/964804402951/locations/global/workloadIdentityPools/github/providers/github-oidc` |

> Los tres valores son exactamente los que imprimió `bootstrap-gcp.sh` al final.
> El número `964804402951` es el *project number* de encuentramebo-1 (no el ID).
> **Variables**, no *Secrets*: no son credenciales y así quedan legibles en los logs
> de CI para diagnóstico.

### Verificación
La lista debe mostrar las tres entradas bajo "Repository variables".

---

## Bloque 2 — Firebase: habilitar los servicios

Consola: `https://console.firebase.google.com/project/encuentramebo-1`

### 2.1 Authentication
Menú izquierdo → **Compilación → Authentication** → botón **Comenzar**
→ pestaña **Sign-in method** → habilitar dos proveedores:

- **Google** → activar el interruptor → elegir un correo de asistencia → Guardar
- **Correo electrónico/contraseña** → activar el primer interruptor → Guardar

### 2.2 Storage
Menú izquierdo → **Compilación → Storage** → **Comenzar** →
elegir **Iniciar en modo de producción** → ubicación **`us-central1`** (debe
coincidir con Firestore) → Listo.

> Las reglas que suba el CI (`infra/storage.rules`) reemplazarán las iniciales.

### 2.3 Plan de facturación (requisito técnico)
Menú inferior izquierdo → **Actualizar** → plan **Blaze (pago por uso)**.

Cloud Functions y Vertex AI no operan en el plan gratuito. El consumo real
estimado del MVP es de 10–25 USD/mes, y la capa gratuita cubre buena parte.

**Inmediatamente después, ponga un tope de alerta:**
`https://console.cloud.google.com/billing` → **Presupuestos y alertas** →
**Crear presupuesto** → importe **25 USD** → alertas al 50 %, 90 % y 100 %.

### 2.4 Registrar la app web (de aquí salen los valores del Bloque 3)
**⚙️ (junto a "Descripción general del proyecto")** → **Configuración del proyecto**
→ pestaña **General** → baje hasta **Tus apps** → icono **`</>`** (Web):

- Sobrenombre de la app: `encuentrame-web`
- ✅ Marcar **"También configura Firebase Hosting para esta app"**
- **Registrar app**

La pantalla siguiente muestra un bloque de código con `const firebaseConfig = {...}`.
**Ese objeto es lo que necesita para el Bloque 3.** Si ya cerró la pantalla:
misma ruta → Tus apps → seleccione la app → **Configuración del SDK** → opción **Config**.

---

## Bloque 3 — Pegar la configuración de Firebase en el repositorio

Abra el archivo `apps/web/.env.production` en su clon local y reemplace los tres
marcadores `PEGAR_AQUI_*` con los valores del objeto `firebaseConfig`:

| Línea del archivo | Campo de firebaseConfig | Ejemplo de forma |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` | `AIzaSy...` (39 caracteres) |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` | `encuentramebo-1.firebasestorage.app` |
| `VITE_FIREBASE_APP_ID` | `appId` | `1:964804402951:web:abc123...` |

Las otras tres líneas (`authDomain`, `projectId`, `messagingSenderId`) ya vienen
rellenadas y debería confirmarlas contra el objeto.

Deje `VITE_APPCHECK_SITE_KEY` vacío por ahora (Bloque 4).

```bash
cd ~/Encuentrame.BO/encuentrame.bo
# editar apps/web/.env.production con su editor
pnpm --filter @encuentrame/web build   # la guarda avisa si algo quedó incompleto
git add apps/web/.env.production
git commit -m "chore: configuración pública del SDK de Firebase"
git push
```

Ese push dispara el primer despliegue real. Sígalo en la pestaña **Actions** del
repositorio. Al terminar, la aplicación estará en:

**https://encuentramebo-1.web.app**

### Verificación de humo
```bash
curl -s https://encuentramebo-1.web.app/v1/health
# esperado: {"ok":true,"service":"encuentrame.bo","version":"v1"}
```

---

## Bloque 4 — App Check (hacer DESPUÉS del primer despliegue exitoso)

App Check es el primer anillo del modelo Zero-Trust: impide que scripts ajenos
consuman la API y la base de datos. Está **desactivado por diseño** hasta este
punto, para que un despliegue inicial no quede bloqueado en 401.

1. Consola Firebase → menú izquierdo → **Compilación → App Check**
2. Pestaña **Apps** → seleccione `encuentrame-web` → **Registrar**
3. Proveedor: **reCAPTCHA Enterprise** → copie la **clave de sitio** que genera
4. Péguela en `apps/web/.env.production` → `VITE_APPCHECK_SITE_KEY=...` → commit + push
5. Espere 24 h observando las métricas de App Check (verá tráfico "verificado" vs
   "no verificado"). Cuando el verificado domine, active la aplicación forzosa:
   - En App Check → pestaña **APIs** → **Cloud Firestore** y **Cloud Storage** → *Aplicar*
   - Para la API REST, redespliegue las funciones con la variable de entorno:
     ```bash
     firebase functions:config:set  # (o en la consola de Cloud Run: APP_CHECK_ENFORCE=true)
     ```

> ⚠️ No active la aplicación forzosa el mismo día: si algo queda mal configurado,
> deja fuera a los usuarios reales. La ventana de 24 h de observación es la
> práctica recomendada por Google y la que seguimos aquí.

---

## Diagnóstico rápido

| Síntoma | Causa probable | Solución |
|---|---|---|
| Deploy falla en "Autenticación federada" | Variable `GCP_WIF_PROVIDER` mal copiada, o el provider quedó atado al nombre viejo del repo | Verifique el valor; si el repo se renombró después de crear el pool, recree el provider con la condición correcta |
| Deploy falla en "Deploy functions" con error de permisos | Falta habilitar alguna API o el plan Blaze | Revise el paso 2.3 y reejecute `bootstrap-gcp.sh` |
| Build falla con "Configuración de Firebase incompleta" | Quedaron marcadores `PEGAR_AQUI` | Complete `apps/web/.env.production` (Bloque 3) |
| La web carga pero el login falla | Proveedores de Authentication no habilitados | Paso 2.1 |
| `/v1/health` devuelve 401 | App Check quedó forzado prematuramente | Ponga `APP_CHECK_ENFORCE=false` en la función |
| `/v1/health` devuelve 404 | Las funciones aún no desplegaron | Revise el log del job "Deploy functions" |
