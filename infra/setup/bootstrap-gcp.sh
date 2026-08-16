#!/usr/bin/env bash
# =============================================================
# encuentrame.bo — Bootstrap del proyecto GCP encuentramebo-1
# EJECUTAR UNA SOLA VEZ por el Owner en Cloud Shell.
# Crea: APIs, Firestore, service account de CI (mínimo privilegio)
# y Workload Identity Federation para GitHub Actions (sin llaves).
# =============================================================
set -euo pipefail

PROJECT_ID="encuentramebo-1"
REPO="segurolotengopy/encuentrame.bo"
REGION="us-central1"

gcloud config set project "$PROJECT_ID"

echo "▶ Habilitando APIs…"
gcloud services enable \
  firestore.googleapis.com cloudfunctions.googleapis.com run.googleapis.com \
  cloudbuild.googleapis.com artifactregistry.googleapis.com eventarc.googleapis.com \
  aiplatform.googleapis.com secretmanager.googleapis.com cloudtasks.googleapis.com \
  firebaseappcheck.googleapis.com identitytoolkit.googleapis.com \
  firebaserules.googleapis.com firebasehosting.googleapis.com \
  geocoding-backend.googleapis.com iamcredentials.googleapis.com

echo "▶ Creando base de datos Firestore (Native, $REGION)…"
gcloud firestore databases create --location="$REGION" || echo "  (ya existe)"

echo "▶ Política TTL para rate_limits y geocode_cache…"
gcloud firestore fields ttls update expireAt --collection-group=rate_limits --enable-ttl || true
gcloud firestore fields ttls update expireAt --collection-group=geocode_cache --enable-ttl || true

echo "▶ Service account de despliegue (CI)…"
SA="deployer@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud iam service-accounts create deployer --display-name="CI Deployer" || echo "  (ya existe)"
for R in roles/firebasehosting.admin roles/cloudfunctions.developer roles/firebaserules.admin \
         roles/datastore.indexAdmin roles/iam.serviceAccountUser \
         roles/serviceusage.serviceUsageConsumer roles/run.viewer \
         roles/eventarc.admin roles/cloudtasks.admin; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$SA" --role="$R" --condition=None -q >/dev/null
done

echo "▶ Workload Identity Federation para $REPO…"
gcloud iam workload-identity-pools create github --location=global || echo "  (pool ya existe)"
gcloud iam workload-identity-pools providers create-oidc github-oidc \
  --location=global --workload-identity-pool=github \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${REPO}'" || echo "  (provider ya existe)"

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
gcloud iam service-accounts add-iam-policy-binding "$SA" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository/${REPO}" -q

echo "▶ Permisos de runtime para Vertex AI (SA por defecto de Functions)…"
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$COMPUTE_SA" --role="roles/aiplatform.user" --condition=None -q >/dev/null

echo ""
echo "============================================================"
echo "✅ Bootstrap completo. Valores para GitHub → Settings → Secrets and variables → Actions → Variables:"
echo "   GCP_PROJECT_ID        = ${PROJECT_ID}"
echo "   GCP_SERVICE_ACCOUNT   = ${SA}"
echo "   GCP_WIF_PROVIDER      = projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/providers/github-oidc"
echo ""
echo "Pasos manuales en consola Firebase (https://console.firebase.google.com/project/${PROJECT_ID}):"
echo " 1. Authentication → habilitar Google y Correo/contraseña"
echo " 2. Storage → comenzar (región ${REGION})"
echo " 3. App Check → registrar la web app con reCAPTCHA Enterprise"
echo " 4. Facturación → plan Blaze + presupuesto con alertas (sugerido 25 USD)"
echo " 5. Secret Manager: echo -n 'LA_LLAVE' | gcloud secrets create GEOCODING_API_KEY --data-file=-"
echo "============================================================"
