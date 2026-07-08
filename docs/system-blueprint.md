# Blueprint del Sistema (System Blueprint)

Este documento es la fuente única de verdad operativa y técnica de **Arvinea Organic**. Describe cómo interactúan los componentes de principio a fin, quién toma cada decisión y dónde residen las reglas del negocio.

---

## 1. El Flujo de Compra de Extremo a Extremo (End-to-End Trace)

A continuación, se describe cronológicamente qué ocurre en el sistema desde que el usuario digita la URL de la tienda hasta que recibe físicamente su pedido:

```
[1. Carga inicial] ──> [2. Selección y Carro] ──> [3. Datos y Despacho] ──> [4. Solicitud Reserva]
                                                                                   │
[8. Despacho/Retiro] <── [7. Aprobación/Stock] <── [6. Conciliación Pago] <── [5. Confirmación Pedido]
```

### Paso 1: Carga Inicial de la Tienda
*   **Acción:** El usuario ingresa a la URL en GitHub Pages.
*   **Componentes:** Navegador (Cliente), Servidor GitHub Pages, API Google Apps Script.
*   **Intercambio de Datos:**
    *   El navegador descarga `index.html`, `app.js` y `styles.css`.
    *   `app.js` ejecuta un fetch GET a `SHEET_API?action=obtenerTodo`.
    *   La API responde un JSON con la configuración global, cupones, tarifas, carrusel, reseñas y el catálogo de productos con stock neto disponible ya calculado.

### Paso 2: Selección de Productos y Carga del Carrito
*   **Acción:** El usuario explora y añade ítems al carrito.
*   **Componentes:** Interfaz (DOM), `LocalStorage`.
*   **Intercambio de Datos:**
    *   Al presionar "Agregar", se abre el modal de detalles y recupera las cantidades deseadas.
    *   Los ítems agregados se guardan localmente en la variable en memoria `carrito` y se escriben en el `localStorage` (`carritoArvinea`). No hay comunicación con el servidor en este punto.

### Paso 3: Datos de Despacho e Información Personal
*   **Acción:** El usuario ingresa su Nombre, RUT, Correo, Teléfono y escoge tipo de envío.
*   **Componentes:** Formulario de Checkout (Sidebar Pestaña 2).
*   **Intercambio de Datos:**
    *   Si selecciona Domicilio, el selector carga las regiones consultadas en el Paso 1 y suma la tarifa correspondiente al total.
    *   Si selecciona Retiro, se escoge el punto de Metro y se asigna costo de despacho `$0`.

### Paso 4: Solicitud de Reserva de Stock
*   **Acción:** El usuario hace clic en "Continuar al Pago".
*   **Componentes:** `app.js`, API Apps Script, Hoja `Reservas`.
*   **Intercambio de Datos:**
    *   `app.js` envía un POST al servidor con `accion: "reservar"`, los nombres de productos, cantidades y el `SESSION_ID`.
    *   *El Servidor:* Bloquea la base de datos, lee el stock físico en `Inventario` y le resta las reservas vigentes de la hoja `Reservas` (< 10 min).
    *   Si hay stock suficiente, graba las líneas en `Reservas` y devuelve `{result: "success"}`.
    *   Si no, responde con error y el usuario no puede avanzar a pagar.

### Paso 5: Confirmación del Pedido y Datos de Cuenta
*   **Acción:** El usuario visualiza la cuenta corriente de Mercado Pago, digita opcionalmente un cupón de descuento y presiona "Confirmar Pedido".
*   **Componentes:** `app.js`, API Apps Script, Hoja `Pedidos`, Servidor SMTP (Gmail).
*   **Intercambio de Datos:**
    *   `app.js` envía un POST con todos los datos personales del comprador, desglose del carro, cupón y total consolidado.
    *   El servidor realiza una doble validación de stock físico en caliente.
    *   Si es correcto, genera el ID de pedido (ej. `ARV-12345-99`), escribe la orden en estado `"Pendiente"` en la hoja `Pedidos` y devuelve el ID.
    *   El servidor envía un correo automático al comprador con las instrucciones de transferencia indicando incluir el ID del pedido (sin guiones) en el comentario del banco.
    *   El servidor envía un correo de alerta a Felipe con un link rápido de aprobación.
    *   El cliente es redirigido a `gracias.html` donde ve los datos bancarios y un botón para avisar el pago directamente al WhatsApp de Felipe.

### Paso 6: Conciliación del Pago
*   **Acción:** El cliente transfiere y el sistema valida.
*   **Componentes:** Banco del Cliente, Cuenta de Mercado Pago / Banco de Arvinea, Gmail, Script Robot.
*   **Intercambio de Datos:**
    *   Al transferir, el banco emite un correo de confirmación de transferencia a `arvinea.organic@gmail.com`.
    *   Cada 10 minutos, el trigger automático en Apps Script llama a `verificarPagosBancarios()`.
    *   El robot lee los correos unread buscando el código del pedido y el monto exacto esperado en el cuerpo o asunto.

### Paso 7: Aprobación y Descuento Físico de Inventario
*   **Acción:** El pedido se marca como pagado de forma automatizada o manual.
*   **Componentes:** Hoja `Pedidos`, Hoja `Inventario`, Hoja `Hoja de Ruta`, Servidor SMTP.
*   **Intercambio de Datos:**
    *   El robot (o el admin escribiendo manualmente `"Pagado"`) activa el método `validarYAprobar()`.
    *   El backend abre la hoja `Inventario` y resta de forma definitiva las cantidades vendidas del stock real.
    *   Si el stock del producto cae a 3 o menos, envía un email de advertencia de stock crítico. Si cae bajo 0, envía un correo de quiebre urgente.
    *   Copia la orden de compra a la hoja `Hoja de Ruta` en estado `"Por Despachar"`.
    *   Envía un correo de "Pago Confirmado" con el diseño formal al cliente.

### Paso 8: Despacho e Información de Seguimiento
*   **Acción:** El administrador realiza la logística de entrega física.
*   **Componentes:** Hoja de Ruta, Courier (BlueExpress / Starken), Servidor SMTP.
*   **Intercambio de Datos:**
    *   El administrador despacha el paquete y escribe el número de tracking en la hoja `Hoja de Ruta` y cambia el estado a `"Enviado"`.
    *   El backend Apps Script detecta el evento mediante `onEditHojaRuta`, lee los datos del cliente y le envía un correo formal adjuntando el código de tracking con un botón interactivo de seguimiento de BlueExpress.
    *   A los 7 días de la compra, el trigger diario de fidelización envía una encuesta al correo del cliente y marca la columna `YaEnviadoResena = "SI"`.

---

## 2. Matriz de Responsabilidades y Decisiones

| Decisión / Acción | Componente Responsable | Justificación y Regla Asociada |
| :--- | :--- | :--- |
| **Cálculo de Descuentos por Categoría** | Frontend (`app.js`) | Carga del lado del cliente para agilidad visual; aplica sobre precio de lista. |
| **Cálculo de Promociones (2x1 y 3x2)** | Frontend & Backend | El frontend calcula y expone el descuento. El backend lo recalcula en caliente al procesar el POST final para evitar manipulaciones del DOM por parte del usuario. |
| **Reserva de Stock (10 min)** | Backend (`script.js`) | Exclusivo del servidor. Se requiere bloqueo de tabla para evitar condiciones de carrera. |
| **Generación de ID del Pedido** | Backend (`script.js`) | Garantiza unicidad secuencial y previene colisiones de ID temporales del cliente. |
| **Conciliación de Pagos** | Backend o Admin | El Robot lee el buzón de correo. Si falla, el Administrador tiene control absoluto editando directamente la celda en Sheets. |
| **Envío de Correos** | Backend (`script.js`) | Utiliza la cuota de email asignada a la cuenta de Google Workspace conectada al script. |

---

## 3. Límites de Aislamiento y Mantenimiento

Para facilitar el desarrollo y evitar que cambios en un módulo descompongan a otros, se definen las siguientes fronteras de aislamiento:

1.  **Frontera Frontend - Backend (API JSON):** El frontend no conoce cómo funciona Google Sheets ni cómo se guardan los datos. Solo conoce la estructura de datos JSON del payload que devuelve la API. Si en el futuro se reemplaza Google Sheets por PostgreSQL o Firebase, el frontend no sufrirá ningún cambio siempre que el nuevo backend retorne el mismo esquema JSON en `obtenerTodo` y acepte los mismos formatos POST.
2.  **Frontera Base de Datos - Código (Sheets Nombres):** Las funciones del backend leen las hojas usando nombres de pestañas (`"Inventario"`, `"Pedidos"`) e índices de columnas. Las columnas del Sheets no deben ser reordenadas, renombradas o eliminadas sin actualizar la constante de índice correspondiente en `script.js` para evitar fallos de lectura/escritura catastróficos.
3.  **Frontera de Pasarela de Pagos (Futuro):** Si se añade un sistema de pagos digitales (Webpay, Mercado Pago API), este debe interactuar exclusivamente con un endpoint serverless intermedio que procese el webhook. Al recibir la confirmación de pago, este endpoint emula el comportamiento de la función `validarYAprobar()`, actualizando el estado de la hoja `Pedidos` y gatillando el flujo logístico sin alterar el catálogo ni los modales del frontend.
