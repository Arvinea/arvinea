# 03. Reglas de Negocio (Business Rules)

Este documento detalla el catálogo de reglas de negocio identificadas en **Arvinea Organic**, explicando el contexto operativo, el porqué de su existencia, su ubicación en el código y su criticidad.

---

## 1. Reserva de Stock de 10 Minutos (Anti-Secuestro)
*   **Problema que resuelve:** En tiendas electrónicas con bajo inventario (ej. frascos artesanales limitados), un usuario malintencionado o distraído podría añadir un producto al carro e iniciar el checkout, impidiendo que otros lo compren. Si no completa la compra, el stock queda congelado y el negocio pierde ventas reales.
*   **Regla:** El stock de los productos añadidos al checkout se descuenta temporalmente de la visualización del catálogo durante 10 minutos. Transcurrido ese tiempo, si la orden no se ha concretado, el stock reservado vuelve a considerarse disponible.
*   **Por qué existe:** Para maximizar las ventas efectivas de stock escaso sin obligar a una recarga manual del inventario.
*   **Implementación:** [googlegs/script.js:L578-619 (reservarStock)](file:///home/tcsalinas/Arvinea/arvinea/googlegs/script.js#L578-619).
*   **Criticidad:** **Alta**.

---

## 2. Stock de Seguridad (-1)
*   **Problema que resuelve:** Sincronizar un frontend estático con una base de datos basada en Google Sheets introduce una latencia o retraso temporal. Si dos clientes compran el último producto simultáneamente antes de que el stock real se actualice, se produciría una sobreventa.
*   **Regla:** El sistema oculta siempre 1 unidad de stock físico al cliente. Si en Excel el stock es `1`, la web muestra `"Agotado"`. Si es `10`, el cliente puede comprar un máximo de `9` unidades.
*   **Por qué existe:** Funciona como un buffer preventivo contra sobreventas simultáneas causadas por demoras de sincronización entre el cliente y el backend.
*   **Implementación:** [app.js:L12](file:///home/tcsalinas/Arvinea/arvinea/app.js#L12) (Frontend) y [googlegs/script.js:L7](file:///home/tcsalinas/Arvinea/arvinea/googlegs/script.js#L7) (Backend).
*   **Criticidad:** **Media**.

---

## 3. Envío Gratis Automático
*   **Problema que resuelve:** El costo de envío reduce la tasa de conversión en compras pequeñas, pero el negocio no puede asumir el costo de envío de productos de bajo valor sin pérdidas.
*   **Regla:** Si el monto acumulado del pedido (calculado tras aplicar descuentos automáticos y cupones de descuento) es igual o superior a la clave de configuración `EnvioGratis` (actualmente `$40.000`), el despacho a domicilio (BlueExpress) se tarifica automáticamente a `$0` (marcado como `"GRATIS"`).
*   **Por qué existe:** Es una estrategia de mercadotecnia para incentivar el aumento del ticket promedio de compra del usuario.
*   **Implementación:** [app.js:L680-691](file:///home/tcsalinas/Arvinea/arvinea/app.js#L680-691) y [googlegs/script.js:L812-817](file:///home/tcsalinas/Arvinea/arvinea/googlegs/script.js#L812-817).
*   **Criticidad:** **Media**.

---

## 4. Descuentos por Categoría
*   **Problema que resuelve:** Habilitar rebajas masivas de catálogo (ej: Black Week o cambio de temporada) modificando celda por celda los precios de decenas de productos en Excel es ineficiente y propenso a errores.
*   **Regla:** Si en la hoja `Configuracion` existe una clave activa que comience con `Dscto_` seguido del nombre de una categoría (ej: `Dscto_Mermeladas`) con un valor numérico superior a `0`, el frontend calcula automáticamente un precio de oferta restando ese porcentaje al `precioAntes` de los productos vinculados a esa categoría.
*   **Por qué existe:** Proporciona un mecanismo centralizado para activar rebajas masivas y estacionales por categorías en un solo paso.
*   **Implementación:** [app.js:L105-121](file:///home/tcsalinas/Arvinea/arvinea/app.js#L105-121).
*   **Criticidad:** **Alta**.

---

## 5. Combos Promocionales por Volumen (2x1 / 3x2)
*   **Problema que resuelve:** Fomentar la venta por volumen requiere incentivos claros (BOGO - Buy One Get One) que se auto-calculen en el momento del pago sin requerir la intervención de un administrador.
*   **Regla:** Si un producto posee configurado en la columna `Promo` el texto `"2X1"` o `"3X2"`, el sistema descuenta automáticamente del total el valor de 1 unidad por cada múltiplo de 2 o 3 productos agregados al carro respectivamente.
*   **Por qué existe:** Estrategia comercial para liquidar stocks masivos aumentando el volumen físico por compra.
*   **Implementación:** [app.js:L652-675](file:///home/tcsalinas/Arvinea/arvinea/app.js#L652-675) y [app.js:L798-808](file:///home/tcsalinas/Arvinea/arvinea/app.js#L798-808) (Frontend) / [googlegs/script.js:L801-808](file:///home/tcsalinas/Arvinea/arvinea/googlegs/script.js#L801-808) (Backend).
*   **Criticidad:** **Alta**.

---

## 6. Venta Presencial (Modo Caja)
*   **Problema que resuelve:** En ferias o puntos de venta físicos, el negocio realiza ventas presenciales y necesita registrar la salida inmediata de productos del inventario sin forzar al cajero a simular transferencias o correos de pago.
*   **Regla:** Si la página web se carga con el parámetro `?modo=caja`, los datos de cliente se autocompletan con valores por defecto ("Venta Presencial", "caja@arvinea.cl"). Al confirmar el pedido, el backend lo registra inmediatamente en estado `"Pagado"`, descuenta el stock real y pinta la celda de verde en Sheets.
*   **Por qué existe:** Permite unificar el control de stock de la tienda física (caja presencial) y la tienda online en un solo repositorio de datos (Google Sheets).
*   **Implementación:** [app.js:L499-514](file:///home/tcsalinas/Arvinea/arvinea/app.js#L499-514) (Frontend) y [googlegs/script.js:L103](file:///home/tcsalinas/Arvinea/arvinea/googlegs/script.js#L103) (Backend).
*   **Criticidad:** **Media**.

---

## 7. Solicitud de Reseña de 7 Días (Fidelización)
*   **Problema que resuelve:** La acumulación de opiniones de clientes en la página web fomenta la confianza de nuevos compradores, pero pedir valoraciones manualmente a cada comprador es costoso operativamente.
*   **Regla:** Un proceso automático diario barre la hoja `Pedidos`. Busca órdenes en estado `"Pagado"` con fecha de creación de hace exactamente 7 días y que no tengan enviado el correo de reseña (`YaEnviadoResena !== "SI"`). Envía un correo con el enlace a Google Forms y marca la columna para evitar repeticiones.
*   **Por qué existe:** Automatiza el flujo de retroalimentación de clientes para construir prueba social (social proof) y mejorar la conversión de ventas.
*   **Implementación:** [googlegs/script.js:L697-735](file:///home/tcsalinas/Arvinea/arvinea/googlegs/script.js#L697-735).
*   **Criticidad:** **Baja**.
