# 01. Visión General del Sistema (System Overview)

Este documento define el panorama actual de la plataforma de e-commerce **Arvinea Organic**, separando de forma estricta los hechos empíricos (código y datos reales) de las inferencias (supuestos operativos y recomendaciones de reingeniería).

---

## 1. Hechos Comprobados (Facts)
Los siguientes elementos corresponden a código fuente, archivos y configuraciones físicas validadas en el repositorio:

*   **Arquitectura de Despliegue:** 
    *   El frontend es completamente estático y está alojado en **GitHub Pages** (evidenciado por el repositorio de GitHub y el archivo [index.html](file:///home/tcsalinas/Arvinea/arvinea/index.html)).
    *   No hay servidores dedicados para el frontend.
*   **Modelo de Backend:**
    *   El backend corre sobre una aplicación de **Google Apps Script** expuesta como Web App (URL: `https://script.google.com/macros/s/AKfycbzbFpuIp8Aj3zMBlr1xP3fN3ib2UFikKOEWMgpihiZhU8tRGM9H3RqlKmr6zYJO6nKGxQ/exec`).
    *   El script actúa como API REST procesando peticiones GET y POST y escribiendo de forma síncrona en un archivo de Google Sheets.
*   **Base de Datos:**
    *   El almacenamiento del sistema es una planilla de **Google Sheets** que posee 9 hojas: `Inventario`, `Configuracion`, `Cupones`, `Reservas`, `Pedidos`, `Hoja de Ruta`, `Valoraciones`, `Carrusel`, y `Tarifas`.
*   **Flujo de Conciliación Bancaria:**
    *   Hay un robot automatizado en Apps Script (`verificarPagosBancarios`) que barre la bandeja de Gmail del correo corporativo buscando correos no leídos de BancoEstado, Mercado Pago y Banco de Chile.
    *   Busca coincidencias del ID del pedido (`ARV-XXXXX`) y del monto para auto-aprobar las órdenes cambiándolas a estado `"Pagado"`.
*   **Manejo de Stock:**
    *   Existe un archivo `Reservas` que almacena temporalmente las reservas de stock con una vigencia de 10 minutos para evitar compras simultáneas sin pagar.
    *   Se aplica un **Stock de Seguridad** de 1 unidad que resta del stock real visible al cliente en el catálogo.

---

## 2. Inferencias y Supuestos Operativos (Inferences)
Los siguientes puntos no se encuentran codificados pero se deducen a partir de la lógica del negocio y del código analizado:

*   **Gestión Operativa (Felipe):** Se infiere que el operador principal de la tienda física y logística es Felipe, debido a que el código del backend define la constante `EMAIL_FELIPE = "arvinea.organic@gmail.com"` y cuenta con métodos como `enviarAlertaFelipe` para reportar inconsistencias en montos transferidos.
*   **Bajo Volumen Transaccional:** Se asume un volumen de pedidos bajo a moderado (menos de 100 transacciones diarias). Esto se infiere debido a la elección de Google Sheets como base de datos (que tiene límites estrictos de velocidad de escritura y lectura simultánea) y al uso del servicio gratuito de correos de Gmail (`MailApp`), que tiene un límite de 100 correos al día para cuentas estándar.
*   **Acuerdos de Despacho:** Se infiere que Arvinea cuenta con un convenio comercial o utiliza los servicios estándar de BlueExpress para el despacho a domicilio, y que el administrador genera las etiquetas manualmente ingresando los datos que el sistema copia a la `Hoja de Ruta`.
*   **Ubicación Geográfica:** Se asume que el negocio opera físicamente en Santiago de Chile y alrededores, ya que los puntos de retiro gratuito disponibles en el frontend corresponden a estaciones de la red de Metro de Santiago (Vicente Valdés, Bellavista de La Florida, Baquedano, Los Héroes).

---

## 3. Componentes Físicos Actuales

```
                                  +-------------------+
                                  |    Cliente Web    |
                                  | (Github Pages JS) |
                                  +---------+---------+
                                            |
                                            | HTTPS Fetch
                                            v
                                 +--------------------+
                                 | Google Apps Script |
                                 |  (Cerebro/API REST)|
                                 +----+--------+------+
                                      |        |
                         Lectura/Escr |        | Lectura/Escritura
                                      v        v
                               +------+--+  +--+------+
                               | Google  |  |  Gmail  |
                               | Sheets  |  | Inbox   |
                               | (DB)    |  | (Bancos)|
                               +---------+  +---------+
```
