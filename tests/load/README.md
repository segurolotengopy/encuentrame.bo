# Suite de pruebas de carga (k6)

Ejecutar contra STAGING (jamás producción) con datos sintéticos.

```bash
BASE_URL=https://encuentramebo-1.web.app k6 run load.js
k6 run stress.js   # rodilla de la curva
k6 run spike.js    # feria abre 8:00 am
k6 run soak.js     # 4 horas: leaks y degradación
```

Los endpoints de IA se prueban con `MOCK_AI=true` (la API respeta el flag solo
en staging) para no facturar Vertex durante las pruebas.
