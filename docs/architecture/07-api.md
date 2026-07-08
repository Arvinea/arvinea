# 07. Referencia de la API (API Reference)

Este documento detalla la especificación de la interfaz REST provista por la Web App de **Google Apps Script** que actúa como el backend de la tienda.

---

## 1. Peticiones HTTP GET (`doGet`)

Dirección base: `https://script.google.com/macros/s/AKfycbzbFpuIp8Aj3zMBlr1xP3fN3ib2UFikKOEWMgpihiZhU8tRGM9H3RqlKmr6zYJO6nKGxQ/exec`

### Acción: `obtenerTodo`
Descarga en una sola consulta de alta velocidad la totalidad de los datos estáticos y dinámicos necesarios para renderizar la tienda web.
*   **Parámetros URL:** `?action=obtenerTodo`
*   **Respuesta Exitosa (JSON):**
    ```json
    {
      "config": {
        "EnvioGratis": "40000.0",
        "MensajeBarra": "¡Envío GRATIS por compras sobre $40.000! 🚚",
        "TiendaAbierta": "SI"
      },
      "cupones": [
        { "codigo": "ARVINEA", "tipo": "PORCENTAJE", "valor": 10, "maxUsos": 999999, "usados": 0 }
      ],
      "tarifas": [
        { "region": "Región Metropolitana", "precio": 3000 }
      ],
      "carrusel": [
        { "imagen": "img/carrusel/hero1.jpg", "titulo": "Sabor Natural", "texto": "...", "btnTexto": "Ver", "btnLink": "..." }
      ],
      "resenas": [
        { "nombre": "Tomas", "producto": "Mermelada", "estrellas": 5, "comentario": "Excelente" }
      ],
      "productos": [
        {
          "nombre": "Sol del Valle 250g",
          "sabor": "Damasco",
          "stock": 5,
          "precio": 3500,
          "categoria": "Valle Escondido",
          "imagen": "img/productos/solvalle250g.jpg",
          "descripcion": "...",
          "nutricion": "...",
          "precioAntes": 3800,
          "promo": ""
        }
      ]
    }
    ```

### Acción: `aprobar`
Ejecuta la validación manual de pago y marca un pedido pendiente como completado.
*   **Parámetros URL:** `?action=aprobar&id={ID_PEDIDO}`
*   **Ejemplo:** `?action=aprobar&id=ARV-68844-88`
*   **Respuesta (HTML):**
    *   *Éxito:* `<h1 style='color:green;'>✅ Aprobado</h1>`
    *   *Fallo:* `<h1 style='color:red;'>❌ Error</h1>`

---

## 2. Peticiones HTTP POST (`doPost`)

Las peticiones envían un payload en formato JSON en el cuerpo del mensaje.

### Acción: Reservar Stock (`accion=reservar`)
Reserva de forma temporal stock de productos durante el proceso de checkout.
*   **Cuerpo de la Petición (JSON):**
    ```json
    {
      "accion": "reservar",
      "idSesion": "sess-1769387447555-606",
      "items": [
        { "nombre": "Sol del Valle 250g", "cantidad": 2 }
      ]
    }
    ```
*   **Respuestas:**
    *   *Éxito:* `{"result": "success"}`
    *   *Fallo (Stock Insuficiente):* `{"result": "error", "error": "Alguien acaba de tomar el último Sol del Valle 250g. Intenta en 10 min."}`

### Acción: Confirmar Pedido (Acción por Defecto)
Registra la orden final de compra pendiente de transferir.
*   **Cuerpo de la Petición (JSON):**
    ```json
    {
      "cliente": "Tomas Salinas",
      "email": "tomas@gmail.com",
      "rut": "12345678-9",
      "telefono": "987654321",
      "entrega": "delivery",
      "ubicacion": "Región Metropolitana - Av. Providencia 1234",
      "pedido": "2x Sol del Valle 250g",
      "total": 7000,
      "items": [
        { "nombre": "Sol del Valle 250g", "precioBase": 3500, "precio": 7000, "cantidad": 2, "obs": "", "imagen": "..." }
      ],
      "cupon": "ARVINEA"
    }
    ```
*   **Respuestas:**
    *   *Éxito:* `{"result": "success", "idPedido": "ARV-12345-99"}`
    *   *Fallo:* `{"result": "error", "error": "Stock insuficiente para: ..."}`
