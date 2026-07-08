# 10. Bitácora de Decisiones Arquitectónicas (Architectural Decision Log - ADR)

Este documento registra las decisiones arquitectónicas históricas adoptadas en el diseño de **Arvinea Organic**, sus motivaciones, contextos y consecuencias.

---

## ADR-01: Uso de Google Sheets como Base de Datos y Consola de Control
*   **Estado:** Aceptado (Legacy).
*   **Contexto:** El cliente requería una herramienta para gestionar de forma autónoma productos, precios, cupones y ver sus despachos diarios, pero no poseía conocimientos técnicos sobre bases de datos relacionales ni paneles de administración tradicionales (CMS).
*   **Decisión:** Utilizar un libro de Google Sheets como repositorio de datos único. El backend en Google Apps Script actúa como middleware leyendo y escribiendo directamente en la planilla.
*   **Consecuencias:**
    *   *Positivas:* Costo de almacenamiento de datos de $0 USD. Curva de aprendizaje cero para el cliente, que ya domina el uso de planillas de cálculo. Sincronización instantánea en vivo.
    *   *Negativas:* Latencia de lectura/escritura alta (1-2 segundos por consulta). Falta de restricciones nativas de integridad referencial. Riesgo de degradación de velocidad conforme aumenta el histórico.

---

## ADR-02: Persistencia del Carrito en LocalStorage del Cliente
*   **Estado:** Aceptado.
*   **Contexto:** El sistema de compra no cuenta con inicio de sesión o registro de usuarios. Se necesitaba persistir la selección del carro de compras si el usuario cerraba accidentalmente la ventana o recargaba la página.
*   **Decisión:** Almacenar el arreglo `carrito` en el almacenamiento local del navegador (`localStorage`) serializado como string JSON.
*   **Consecuencias:**
    *   *Positivas:* Implementación sencilla, 100% del lado del cliente, sin consumo de ancho de banda ni solicitudes HTTP recurrentes para mantener el estado del carro.
    *   *Negativas:* Riesgo de desactualización de stock (el carro guarda productos añadidos que podrían haberse quedado sin stock real posteriormente). El carro es exclusivo del dispositivo donde se navega.

---

## ADR-03: Conciliación de Pagos mediante Escaneo de Correos (Robot)
*   **Estado:** Aceptado.
*   **Contexto:** Implementar pasarelas de pago digitales (como Webpay) requiere un inicio de actividades formal ante el Servicio de Impuestos Internos (SII), además de implicar costos de comisiones del 2% al 4% por venta. El comercio opera inicialmente solo con transferencias electrónicas manuales.
*   **Decisión:** Automatizar la conciliación de transferencias bancarias programando un script (Multibank Robot) que escanea las notificaciones de transferencia recibidas en Gmail de forma periódica.
*   **Consecuencias:**
    *   *Positivas:* Comisión transaccional del 0% en transferencias. Evita la verificación manual visual del banco para el 90% de las ventas legítimas.
    *   *Negativas:* Fragilidad ante cambios en el formato HTML de los correos que envían los bancos. Alta vulnerabilidad de seguridad a spoofing de correos (clientes enviando correos falsos con formato similar).

---

## ADR-04: Alojamiento del Frontend en GitHub Pages
*   **Estado:** Aceptado.
*   **Contexto:** Para asegurar la sostenibilidad económica a largo plazo del microemprendimiento, el costo fijo de hosting del frontend web debía ser nulo ($0 USD).
*   **Decisión:** Desplegar el frontend como archivos HTML, CSS y JS estáticos hospedados de forma gratuita en GitHub Pages.
*   **Consecuencias:**
    *   *Positivas:* Costo mensual recurrente cero. Excelente velocidad de carga gracias al CDN integrado de GitHub. Despliegue directo mediante control de versiones (`git push`).
    *   *Negativas:* Imposibilidad de ocultar claves de API o la dirección del endpoint del backend (`SHEET_API`), ya que todo el código JavaScript es público y visible para el navegador.
