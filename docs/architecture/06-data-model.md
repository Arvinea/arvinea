# 06. Modelo de Datos (Data Model)

Este documento especifica de forma rigurosa la estructura de almacenamiento de **Arvinea Organic** basada en Google Sheets, sus campos, tipos de datos, restricciones e inconsistencias detectadas.

---

## 1. Estructura de Hojas (Tablas) y Diccionario de Datos

### Hoja: `Inventario`
Almacena el catálogo de productos y su stock disponible.
*   **Nombre** [Col A] | Tipo: `Texto` | Restricción: *Clave Primaria (PK), No Nulo, Único*.
*   **Sabor** [Col B] | Tipo: `Texto` | Restricción: *Opcional*.
*   **Stock** [Col C] | Tipo: `Numérico (Entero)` | Restricción: *Mínimo 0*. Representa el stock físico.
*   **Precio** [Col D] | Tipo: `Numérico (Entero)` | Restricción: *Mínimo 0, Pesos Chilenos*.
*   **Categoria** [Col E] | Tipo: `Texto` | Restricción: *No Nulo*.
*   **Imagen** [Col F] | Tipo: `Texto (Ruta de Archivo)` | Restricción: *No Nulo, ej: img/productos/nombre.jpg*.
*   **Descripcion** [Col G] | Tipo: `Texto (Largo)` | Restricción: *Soporta formato markdown personalizado*.
*   **Nutricion** [Col H] | Tipo: `Texto` | Restricción: *Separador por barras `|`*.
*   **PrecioAntes** [Col I] | Tipo: `Numérico (Entero)` | Restricción: *Mínimo 0, Opcional*.
*   **Orden** [Col J] | Tipo: `Numérico (Float/Integer)` | Restricción: *Orden de aparición en catálogo*.
*   **Promo** [Col K] | Tipo: `Texto` | Restricción: *Valores admitidos: `'2X1'`, `'3X2'` o vacío*.

### Hoja: `Pedidos`
Registra el historial de ventas procesadas desde la web o caja física.
*   **idPedido** [Col A] | Tipo: `Texto` | Restricción: *Clave Primaria (PK), Formato ARV-XXXXX-XX (antes ID)*.
*   **Fecha** [Col B] | Tipo: `Fecha / Float` | Restricción: *Automática*.
*   **Cliente** [Col C] | Tipo: `Texto` | Restricción: *No Nulo*.
*   **Email** [Col D] | Tipo: `Texto (Email)` | Restricción: *No Nulo*.
*   **Telefono** [Col E] | Tipo: `Texto / Numérico` | Restricción: *No Nulo, 9 dígitos*.
*   **RUT** [Col F] | Tipo: `Texto` | Restricción: *Formato 12345678-9*.
*   **Direccion** [Col G] | Tipo: `Texto` | Restricción: *Dirección de envío o punto de retiro (antes Ubicacion)*.
*   **Entrega** [Col H] | Tipo: `Texto` | Restricción: *Valores: `'delivery'` o `'pickup'`*.
*   **Pedido** [Col I] | Tipo: `Texto (Resumen Largo)` | Restricción: *Formato humano para emails*.
*   **Total** [Col J] | Tipo: `Numérico (Entero)` | Restricción: *Mínimo 0*.
*   **Estado** [Col K] | Tipo: `Texto` | Restricción: *Valores: `'Pendiente'`, `'Pagado'`, `'Alerta'*.
*   **Detalle JSON** [Col L] | Tipo: `Texto (JSON Stringified)` | Restricción: *Arreglo de ítems del carro (antes Items)*.
*   **Columna 1** [Col M] | Tipo: `Texto` | Restricción: *Control de envío de reseña (antes YaEnviadoResena)*.
*   **Cupon** [Col N] | Tipo: `Texto` | Restricción: *Código de cupón utilizado, FK -> Cupones*.

### Hoja: `Hoja de Ruta`
Logística de distribución de pedidos ya pagados.
*   **ID** [Col A] | Tipo: `Texto` | Restricción: *Clave Foránea (FK -> Pedidos), Único*.
*   **Fecha** [Col B] | Tipo: `Fecha / Float` | Restricción: *Automática*.
*   **Cliente** [Col C] | Tipo: `Texto` | Restricción: *No Nulo*.
*   **Telefono** [Col D] | Tipo: `Texto / Numérico` | Restricción: *No Nulo*.
*   **Tipo (Delivery/Retiro)** [Col E] | Tipo: `Texto` | Restricción: *Valores: `'delivery'` o `'pickup'`*.
*   **Direccion/Metro** [Col F] | Tipo: `Texto` | Restricción: *Lugar físico de entrega*.
*   **Pedido** [Col G] | Tipo: `Texto (Resumen)` | Restricción: *Detalle del despacho*.
*   **Estado Entrega** [Col H] | Tipo: `Texto` | Restricción: *Valores: `'Por Despachar'`, `'Listo'`, `'Enviado'`*.
*   **Email** [Col I] | Tipo: `Texto` | Restricción: *Email de contacto*.
*   **Tracking** [Col J] | Tipo: `Texto` | Restricción: *Código de courier, opcional (vacío para pickup)*.

### Hoja: `Reservas`
Existencias en proceso de pago temporal.
*   **Producto** [Col A] | Tipo: `Texto` | Restricción: *No Nulo, FK -> Inventario*.
*   **Cantidad** [Col B] | Tipo: `Numérico` | Restricción: *Mínimo 1*.
*   **Tiempo** [Col C] | Tipo: `Texto (ISO Timestamp)` | Restricción: *Hora de la reserva*.
*   **ID_Temporal** [Col D] | Tipo: `Texto` | Restricción: *ID de Sesión (SESSION_ID)*.

### Hoja: `Cupones`
Códigos de descuento de la tienda.
*   **Codigo** [Col A] | Tipo: `Texto` | Restricción: *Clave Primaria (PK), Único*.
*   **Tipo** [Col B] | Tipo: `Texto` | Restricción: *Valores: `'PORCENTAJE'` o `'MONTO'`*.
*   **Valor** [Col C] | Tipo: `Numérico` | Restricción: *Mínimo 0*.
*   **Activo** [Col D] | Tipo: `Texto` | Restricción: *Valores: `'SI'` o `'NO'`*.
*   **MaxUsos** [Col E] | Tipo: `Numérico` | Restricción: *Límite de usos*.
*   **Usados** [Col F] | Tipo: `Numérico` | Restricción: *Cantidad consumida*.

---

## 2. Diagrama Entidad-Relación Textual (ER Diagram)

El siguiente diagrama detalla cómo se asocian las hojas entre sí a través de sus campos lógicos:

```
  +------------------+
  |    Inventario    |
  +------------------+
  | PK  Nombre       |<---+
  |     Sabor        |    |
  |     Stock        |    | 1 : N (Producto)
  |     Precio       |    |
  |     ...          |    |
  +------------------+    |
                          |
  +------------------+    |
  |     Reservas     |    |
  +------------------+    |
  | FK1 Producto     |----+
  |     Cantidad     |
  |     Tiempo       |
  |     ID_Temporal  |
  +------------------+

  +------------------+                 +------------------+
  |     Cupones      |                 |     Pedidos      |
  +------------------+                 +------------------+
  | PK  Codigo       |<------------+   | PK  ID           |<---+
  |     Tipo         |             |   |     Fecha        |    |
  |     Valor        |             |   |     Cliente      |    |
  |     Activo       |             |   |     Email        |    | 1 : 1 (ID)
  |     ...          |             +---| FK1 Cupon        |    |
  +------------------+             N:1 |     ...          |    |
                                       +------------------+    |
                                                               |
                                       +------------------+    |
                                       |  Hoja de Ruta    |    |
                                       +------------------+    |
                                       | FK1 ID           |----+
                                       |     Fecha        |
                                       |     Cliente      |
                                       |     ...          |
                                       +------------------+
```

---

## 3. Inconsistencias de Diseño de Datos

Durante la auditoría del modelo de datos actual, se detectaron las siguientes anomalías estructurales:

1.  **Carencia de Claves Foráneas (FK) Nativas:** Al ser hojas de cálculo de Google Sheets, no hay restricciones físicas que impidan borrar registros padres. Un administrador puede borrar un registro en la hoja `Inventario` que tenga reservas activas o pedidos históricos asignados, lo que provocará fallos en los cálculos de stock o al renderizar reportes.
2.  **Inconsistencia en Serialización de Fechas:** 
    *   En `Reservas`, la fecha se inserta como cadena en formato ISO estándar (`new Date().toISOString()`).
    *   En `Pedidos` y `Hoja de Ruta`, se escribe un objeto `new Date()`. Al ser editados o leídos por scripts de Excel externos, estas fechas se transforman en números reales (ej: `46054.45`), dificultando la legibilidad directa de los datos en herramientas de análisis externas si no son transformadas previamente.
3.  **Truncamiento de Cadenas Numéricas:** Teléfonos y RUTs se almacenan a veces como valores numéricos puros. Google Sheets asume automáticamente notaciones científicas (ej: `9.99E8` para números telefónicos) si el valor ingresado no es forzado como texto plano (anteponiendo una comilla simple `'`).
