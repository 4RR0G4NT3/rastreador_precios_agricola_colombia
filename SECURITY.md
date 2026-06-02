# Política y Controles de Seguridad (SECURITY.md)

Este documento detalla todas las medidas, validaciones y controles de seguridad implementados en el **Rastreador de Precios Agrícolas**. El proyecto fue diseñado con un enfoque educativo avanzado, utilizando **Node.js puro (Vanilla)** para demostrar cómo se mitigan vulnerabilidades a nivel de protocolo HTTP y sistema sin depender de frameworks externos.

## 1. Arquitectura Base (Vanilla Node.js)
El uso exclusivo del módulo `http` nativo, sin frameworks como Express o NestJS, proporciona ventajas inherentes de seguridad:
- **Reducción de Superficie de Ataque:** Menos dependencias de terceros significa menos riesgo de vulnerabilidades de la cadena de suministro (Supply Chain Attacks).
- **Control Total del Flujo:** Cada byte de la petición y respuesta es gestionado explícitamente, evitando comportamientos "mágicos" o decodificaciones peligrosas por defecto.

## 2. Pruebas Automatizadas de Seguridad (CI/CD Ready)
El proyecto cuenta con una suite centralizada en `tests/security/` ejecutable mediante `npm run test:security`:
- **SCA (Análisis de Composición de Software):** Uso de `npm audit --audit-level=high` para bloquear dependencias con CVEs conocidos.
- **SAST (Análisis Estático):** Uso de `eslint-plugin-security` para detectar patrones inseguros en tiempo de escritura (ej. Path Traversal, Object Injection).
- **Secret Scanning:** Script personalizado (`scan-secrets.js`) que previene el *commit* de llaves de MongoDB, contraseñas o tokens expuestos.
- **DAST / Negative Testing:** Pruebas E2E con Playwright diseñadas específicamente para enviar datos maliciosos y verificar la resiliencia de la API.

## 3. Controles de Seguridad Implementados

### 3.1. Mitigación de Denegación de Servicio (DoS) y Rate Limiting
- **Límites de Paginación Rígidos:** Los endpoints `/api/prices` limitan las consultas a un máximo de 2000 registros por petición. Valores no numéricos o excesivos son bloqueados con HTTP 400.
- **Rate Limiting en Memoria:** Se implementó un algoritmo manual de "Token Bucket" basado en Mapas de Node.js. Protege contra fuerza bruta y sobrecarga limitando a **100 peticiones por minuto por IP** (HTTP 429 Too Many Requests).

### 3.2. Prevención de Inyecciones (NoSQL y SQL)
- **Validación Estricta de Tipos (Anti-NoSQL Injection):** Se validan explícitamente parámetros de la URL (`product`, `market`, etc.) para asegurar que sean cadenas de texto (`typeof === 'string'`). Esto evita que un atacante envíe arreglos u objetos (`?product[$ne]=null`) engañando a `url.parse()` y manipulando la consulta de MongoDB.
- **Expresiones Regulares para Números:** Parámetros como `limit` y `page` son validados con `/^\d+$/` para garantizar que no contengan fragmentos de código, esquivando las vulnerabilidades de conversiones parciales con `parseInt`.

### 3.3. Encabezados HTTP de Seguridad (Manual Helmet)
Se inyectan manualmente en cada respuesta los escudos estándar de la industria:
- `X-Content-Type-Options: nosniff`: Previene el MIME-sniffing.
- `X-Frame-Options: DENY`: Previene ataques de Clickjacking.
- `X-XSS-Protection: 1; mode=block`: Filtro anti-XSS nativo de navegadores legacy.
- `Referrer-Policy: no-referrer`: Protege la privacidad evitando fugas en la cabecera Referer.
- `Content-Security-Policy (CSP)`: Restringe estrictamente desde dónde se pueden cargar scripts y estilos, permitiendo solo código local, Chart.js desde CDN y fuentes de Google.

### 3.4. Path Traversal y LFI (Local File Inclusion)
- El servidor estático usa `path.join(PUBLIC_DIR, req.url)` pero se apoya en validaciones para evitar el escape de directorios. 
- Pruebas automatizadas validan activamente que el intento de leer `http://localhost:3000/../.env` devuelva un HTTP 404, asegurando que las credenciales del sistema nunca se expongan mediante la manipulación de URLs.

### 3.5. Configuración CORS Distribuida
- **Desarrollo:** Permite `*` para facilitar pruebas locales.
- **Producción:** Se restringe a la variable de entorno `ALLOWED_ORIGIN` (ej. el dominio real), evitando que sitios web de terceros puedan abusar de la API a través de los navegadores de los usuarios.

---
**Auditoría y Mantenimiento:**
Para auditar la aplicación con herramientas profesionales dinámicas, consultar la guía local de OWASP ZAP disponible en `tests/security/dast/ZAP_GUIDE.md`.
