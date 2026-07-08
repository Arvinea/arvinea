# 02. Dominio de Negocio (Business Domain)

Este documento reconstruye el dominio del negocio de **Arvinea Organic** utilizando conceptos de **Domain-Driven Design (DDD)** para mapear claramente las entidades, agregados y la relación entre ellos.

---

## 1. Contextos Acotados (Bounded Contexts)

El dominio de Arvinea Organic se divide en los siguientes contextos acotados:

1.  **Catálogo (CatalogoContext):** Gestión del listado de productos orgánicos, sus detalles nutricionales, precios, imágenes y promociones por categoría o volumen.
2.  **Venta y Reserva (VentaContext):** Ciclo de vida del carrito del cliente, la reserva de stock temporal en el checkout, aplicación de cupones y registro de órdenes pendientes.
3.  **Conciliación y Pagos (ConciliacionContext):** Recepción de correos bancarios, extracción automática del ID de pedido y el monto depositado, y aprobación final del pedido.
4.  **Despacho y Logística (LogisticaContext):** Control de entregas de productos pagados bajo dos modalidades: envío por courier (Delivery) y retiro presencial (Pickup).
5.  **Fidelización (FidelizacionContext):** Automatización del envío de solicitudes de opinión y recolección de valoraciones de clientes después de la compra.

---

## 2. Entidades y Estructuras del Dominio

### Producto (CatalogoContext - Agregado Raíz)
Representa un artículo disponible para su comercialización.
*   `id` / `nombre`: Texto [Identificador único]
*   `sku`: Texto [Identificador único de stock en catálogo]
*   `sabor`: Texto [Sabor del producto, opcional]
*   `stock`: Numérico [Existencia física actual]
*   `precio`: Numérico [Monto de venta en CLP]
*   `categoria`: Texto [Clasificación para visualización]
*   `imagen`: Texto [Nombre de archivo o URL de la foto]
*   `descripcion`: Texto [Detalle del producto, soporta marcas de formato]
*   `nutricion`: Texto [Valores de información nutricional, formato `Caloría:Valor|Sodio:Valor`]
*   `precioAntes`: Numérico [Precio de lista previo para cálculo de ofertas, opcional]
*   `promo`: Texto [Estrategia de descuento por volumen: `'2X1'`, `'3X2'` o vacío]

### Reserva (VentaContext)
Representa un bloqueo de inventario asignado temporalmente a una sesión de usuario durante el checkout.
*   `id`: Texto [Generado por el sistema]
*   `producto`: Texto [Nombre del producto reservado, FK -> Producto]
*   `cantidad`: Numérico [Unidades reservadas]
*   `expiraEn`: Timestamp [Tiempo límite de retención, 10 minutos de validez]
*   `estado`: Texto [Activa, Expirada, Consumida]
*   `idSesion`: Texto [Identificador del carrito, FK -> Cliente]

### Pedido (VentaContext - Agregado Raíz)
Representa una transacción de compra iniciada en la web.
*   `idPedido`: Texto [Identificador único en formato `ARV-{timestamp}-{random}`]
*   `fecha`: Date [Instante de registro del pedido]
*   `cliente`: Cliente [Objeto de valor con datos del comprador]
*   `total`: Numérico [Monto total a pagar en CLP]
*   `estado`: Texto [Estados: `'Pendiente'`, `'Pagado'`, `'Alerta'`]
*   `tipoEntrega`: Texto [Modalidades: `'delivery'`, `'pickup'`]
*   `ubicacion`: Texto [Dirección de envío o punto de retiro]
*   `items`: Array of LineaPedido [Detalle de los productos comprados]
*   `cupon`: Texto [Código de cupón aplicado, opcional]

### Pago (ConciliacionContext)
Representa un depósito de dinero procesado y asociado a una orden.
*   `idTrx`: Texto [Identificador de la transacción extraído del correo o banco]
*   `monto`: Numérico [Monto depositado verificado]
*   `banco`: Texto [Entidad de origen: `'BancoEstado'`, `'MercadoPago'`, `'BancoChile'`]
*   `estado`: Texto [Estados: `'Verificado'`, `'Rechazado'`, `'Diferido'`]
*   `fecha`: Date [Instante del depósito]

### Cupón (VentaContext)
Código de descuento aplicable en el checkout.
*   `codigo`: Texto [Nombre del código en mayúsculas, PK]
*   `tipo`: Texto [Formato del descuento: `'PORCENTAJE'` o `'MONTO'`]
*   `valor`: Numérico [Porcentaje a restar o valor fijo en pesos]
*   `activo`: Booleano [Indica si es utilizable]
*   `maxUsos`: Numérico [Límite máximo de usos permitidos]
*   `usados`: Numérico [Cantidad de veces aplicados con éxito]

### Cliente (VentaContext - Objeto de Valor)
Datos del comprador asociados al pedido.
*   `nombre`: Texto
*   `email`: Texto
*   `rut`: Texto
*   `telefono`: Texto

### Despacho (LogisticaContext)
Representa la asignación y logística física del pedido.
*   `idPedido`: Texto [Identificador único, FK -> Pedido]
*   `tipo`: Texto [Modalidad: `'delivery'`, `'pickup'`]
*   `direccionMetro`: Texto [Dirección física o Nombre de la estación de Metro]
*   `tracking`: Texto [Código de courier provisto por BlueExpress, opcional]
*   `estadoEntrega`: Texto [Estados: `'Por Despachar'`, `'Listo'`, `'Enviado'`]

---

## 3. Relaciones del Dominio

El flujo de dependencia de dominio sigue una jerarquía lineal que representa la progresión de una compra:

```
+--------------+
|   Producto   |
+------+-------+
       |
       | Posee
       v
+--------------+
|   Reserva    |
+------+-------+
       |
       | Se consolida en
       v
+--------------+
|    Pedido    |
+------+-------+
       |
       | Se valida mediante
       v
+--------------+
|     Pago     |
+------+-------+
       |
       | Gatilla el
       v
+--------------+
|   Despacho   |
+--------------+
```
