# 04. Arquitectura del Frontend (Frontend Architecture)

Este documento describe la arquitectura técnica, la distribución de componentes, el flujo de navegación y el mapa de responsabilidades del cliente web de **Arvinea Organic**.

---

## 1. Organización del Código

El frontend está implementado como una aplicación estática de una sola página (SPA) sin empaquetadores ni transpiladores. Se aloja en **GitHub Pages** y se compone de:

*   [index.html](file:///home/tcsalinas/Arvinea/arvinea/index.html): Estructura DOM de la aplicación, layouts de secciones (Catálogo, Reseñas, Footer) y modales integrados.
*   [app.js](file:///home/tcsalinas/Arvinea/arvinea/app.js): Script centralizador que maneja la lógica de renderizado estático interactivo, cálculos de precios, cupones, manipulación de carrito y llamadas HTTP al backend.
*   [styles.css](file:///home/tcsalinas/Arvinea/arvinea/styles.css): Hoja de estilos Vanilla CSS. Centraliza la paleta de colores corporativos mediante variables de CSS (`--primary: #2d4f1e`, `--accent: #d4a373`), animaciones de carga y layouts adaptables (responsive grids).

---

## 2. Componentes e Interfaz de Pantalla

La aplicación funciona mediante vistas condicionales y superpuestas (Modales y Sidebars) gestionadas mediante modificación del estilo `display`:

1.  **Vitrina / Catálogo de Productos:** Renderiza las tarjetas de productos dinámicamente agrupados en pestañas por categoría. Cada tarjeta posee botones para abrir la ficha detallada o añadir directamente al carro.
2.  **Carrusel Principal:** Slider rotativo automático de imágenes y llamadas a la acción (CTA) renderizado a partir de la hoja de cálculo `Carrusel`.
3.  **Modal Detalle de Producto (`#modal-detalle`):** Tarjeta con imagen ampliada, descripción con formato, selector de cantidades limitado al stock disponible y cuadro de texto para observaciones opcionales del cliente.
4.  **Modal Información Nutricional (`#modal-info-producto`):** Despliega la tabla nutricional parseada a partir de la columna `Nutricion` (ej: `Calorías: 36 kcal | Fibra: 0.3 g`).
5.  **Barra Lateral de Carrito (`#sidebar-carrito`):** Panel deslizable derecho que guía al usuario por el flujo transaccional.

---

## 3. Mapa de Responsabilidades de `app.js`

Para garantizar un diseño mantenible y evitar el acoplamiento excesivo, definimos los límites funcionales del archivo de script del frontend:

### Responsabilidades Autorizadas (Lo que DEBE hacer)
*   **Renderizar la Interfaz:** Generar y pintar las tarjetas HTML de productos, testimoniales, carrusel y tarifas en el DOM al iniciar.
*   **Manejar el Estado Local:** Almacenar e interactuar con la lista de productos en el carrito de compras en memoria y persistirlos en `localStorage`.
*   **Validaciones Visuales en Cliente:** Verificar formatos correctos en el formulario de datos (formato del RUT, correo estructurado con `@`, teléfono móvil chileno de 9 dígitos).
*   **Controlar la Navegación:** Gestionar las pestañas activas del sidebar (`Pedido` -> `Datos` -> `Pago`) y transiciones visuales (spinners de carga).
*   **Aplicar Formato Estético:** Parsear caracteres comodines en descripciones (ej: transformar `*texto*` en negritas `<strong>`).

### Responsabilidades Prohibidas (Lo que NO DEBE hacer)
*   **Validación Autoritativa de Precios:** No debe definir ni validar de forma exclusiva el monto final a pagar. Aunque muestra los subtotales calculados por volumen (BOGO) o cupones, el backend debe recalcular y validar de forma obligatoria el total antes de procesar el pedido.
*   **Aprobación de Transacciones:** No debe tener control sobre el cambio de estado de un pedido a `"Pagado"`. Esta confirmación es competencia exclusiva del backend o de la intervención manual del administrador.
*   **Control del Inventario Físico:** No puede autogestionar el inventario real. Debe regirse estrictamente por el stock consultado a la API.

---

## 4. Gestión del Flujo de Navegación del Usuario

El cliente avanza a través del embudo de conversión de la siguiente forma:

```
[ Catálogo / Landing ]
       |
       v (Usuario hace clic en "Agregar")
[ Modal de Detalle (Cantidad / Notas) ]
       |
       v (Confirma cantidad y agrega al carrito)
[ Sidebar: Pestaña Pedido ]
       |
       v (Hace clic en "Continuar")
[ Sidebar: Pestaña Datos ]
       |
       v (Selecciona envío, completa datos y presiona "Continuar al Pago")
[ Solicitud POST reservar stock a API ] --(Si falla: Alerta stock)
       |
       v (Si es exitoso)
[ Sidebar: Pestaña Pago ]
       |
       v (Revisa resumen de cuenta y presiona "Confirmar Pedido")
[ Solicitud POST confirmar a API ]
       |
       v (Si es exitoso)
[ Redirección a gracias.html ]
```
