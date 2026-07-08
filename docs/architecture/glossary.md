# Glosario del Lenguaje Ubicuo (Ubiquitous Language)

Este documento define el vocabulario común acordado entre el equipo de desarrollo y el equipo operativo de **Arvinea Organic** para alinear la terminología del código con los procesos reales de negocio.

---

*   **Felipe:** Dueño y administrador general de Arvinea Organic. En el código, es el destinatario de las notificaciones críticas de stock y discrepancias financieras (`EMAIL_FELIPE`).
*   **La Vitrina:** Interfaz web visual orientada al cliente (desplegada en GitHub Pages) encargada de renderizar el catálogo y recopilar datos del pedido.
*   **El Cerebro:** Planilla de Google Sheets que actúa como base de datos única y panel de control operativo.
*   **Secuestro de Stock:** Acción en la que un cliente agrega productos con inventario limitado al carro e inicia el checkout, bloqueando el stock de forma indefinida sin la intención real de comprar.
*   **Reserva Temporal:** Bloqueo en base de datos (`Reservas`) que retiene stock físico por exactamente 10 minutos para evitar el *Secuestro de Stock* durante el flujo de pago.
*   **Robot Multibanco:** Daemon periódico programado en Apps Script que escanea correos electrónicos para conciliar depósitos bancarios de forma automática.
*   **Hoja de Ruta:** Pestaña de logística del Google Sheet donde se registran exclusivamente los pedidos pagados para preparar su envío o entrega física.
*   **Venta Presencial (Modo Caja):** Compra efectuada directamente en ferias o puntos de venta físicos. Descuenta stock al instante en Sheets sin verificar transferencias.
*   **Stock de Seguridad:** Buffer preventivo de 1 unidad que se le resta al stock físico real mostrado al cliente en el catálogo para evitar sobreventas concurrentes.
*   **Punto de Retiro (Pickup):** Estaciones de Metro seleccionadas donde el cliente puede retirar su pedido sin costo adicional.
*   **Despacho a Domicilio (Delivery):** Envío certificado de productos a la dirección postal del usuario a través del courier BlueExpress.
*   **Tracking:** Número de seguimiento único provisto por BlueExpress, ingresado en la Hoja de Ruta para permitir al cliente rastrear su entrega.
