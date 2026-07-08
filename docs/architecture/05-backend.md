# 05. Arquitectura del Backend (Backend Architecture)

Este documento describe la arquitectura del backend de **Arvinea Organic**, alojado en **Google Apps Script**, sus puntos de entrada (endpoints), procesos programados y la deuda técnica estructural asociada a la sobrecarga de responsabilidades de su archivo maestro.

---

## 1. Infraestructura Operativa

El backend corre en un entorno Serverless de Google Apps Script integrado al ecosistema de Google Workspace. No posee servidores físicos ni virtuales dedicados, delegando la infraestructura y el motor de ejecución JS a la infraestructura pública de Google.

*   **Persistencia:** La API manipula directamente el archivo `Base de Datos Arvinea` en Google Sheets mediante el SDK nativo de `SpreadsheetApp`.
*   **Seguridad / Autenticación:** Actualmente no existe ningún mecanismo de autenticación (API Keys, OAuth o JWT). La Web App está publicada con permisos de acceso para **"Anyone, even anonymous"** para permitir la comunicación directa desde GitHub Pages.

---

## 2. Mapa de Responsabilidades de `script.js`

El archivo [googlegs/script.js](file:///home/tcsalinas/Arvinea/arvinea/googlegs/script.js) es el núcleo lógico del servidor. Sin embargo, sufre del anti-patrón de diseño **Objeto Todopoderoso (God Object)**, centralizando múltiples responsabilidades que deberían estar distribuidas:

### Responsabilidades del Archivo (Lo que hace actualmente)
1.  **Controlador de API (HTTP Router):** Enruta y responde solicitudes GET (`doGet`) y POST (`doPost`).
2.  **Manejo de Base de Datos:** Realiza la lectura, formateo e inserción de datos en Sheets (`obtenerInventarioJSON`, `obtenerTodoJSON`).
3.  **Lógica del Negocio Transaccional:** Administra la creación de órdenes de compra, cálculos de totales y verificación de stock físico.
4.  **Sistema de Reservas:** Gestiona la retención temporal de existencias durante el checkout (`reservarStock`).
5.  **Conciliación Bancaria Automática:** Escanea bandejas de entrada de correo electrónico y parsea cuerpos/asuntos de transferencias (`verificarPagosBancarios`).
6.  **Disparador Logístico:** Reacciona a cambios manuales en Sheets para generar la hoja de ruta (`onEditInstallable`, `onEditHojaRuta`).
7.  **Mensajería Transaccional:** Genera el diseño HTML de correos electrónicos y despacha notificaciones a través de la cuenta personal del dueño (`crearPlantillaEmail`, `MailApp.sendEmail`).
8.  **Fidelización de Clientes:** Monitorea y envía encuestas automáticas post-venta a los 7 días de la compra (`verificarPedidosParaResena`).

### Consecuencia del Diseño "God Object"
*   **Fragilidad:** Modificar una regla de visualización en la API (ej. agregar un campo a los productos) requiere alterar el mismo archivo que maneja la lógica de despachos o el escaneo de transferencias bancarias, incrementando el riesgo de introducir regresiones de software (bugs) en flujos críticos.
*   **Problemas de Escalabilidad:** Los límites de tiempo de ejecución de Google Apps Script (máximo 6 minutos continuos por trigger) se ven amenazados debido a que un solo script realiza múltiples tareas complejas de forma secuencial y sin soporte de concurrencia.

---

## 3. Procesos Batch y Jobs Programados

El backend delega en los **Triggers de Apps Script** la ejecución diferida de tareas automáticas:

```
[ Gmail Inbox ]
       |
       | Escaneo cada 10-15 minutos
       v
+-----------------------------+
| verificarPagosBancarios()   | --> Concilia transferencias entrantes
+-----------------------------+

[ Hojas de Pedidos / Ruta ]
       |
       | Disparador Diario
       v
+-----------------------------+
| verificarPedidosParaResena()| --> Envía encuestas automáticas a clientes (7 días)
+-----------------------------+
```

*   **Robot Multibanco (`verificarPagosBancarios`):** Programado para ejecutarse mediante un disparador de tiempo continuo. Se encarga de procesar las transacciones bancarias informadas en correos no leídos y compararlas con las órdenes vigentes.
*   **Daemon de Fidelización (`verificarPedidosParaResena`):** Programado diariamente para buscar clientes con pagos completados hace una semana para gatillar la solicitud de feedback.
