# 09. Diagramas de Secuencia (Sequence Diagrams)

Este documento describe paso a paso la comunicación y el intercambio de mensajes entre el Cliente, el Frontend, el Backend en Google Apps Script, y la Base de Datos (Google Sheets).

---

## 1. Flujo de Reserva Temporal de Stock (Anti-Secuestro)

Este proceso ocurre cuando el cliente hace clic en el botón de pagar e ingresa los datos personales del sidebar.

```mermaid
sequenceDiagram
    autonumber
    actor Cliente
    participant FE as Frontend (app.js)
    participant BE as Backend (script.js)
    participant DB as Sheets (Reservas / Inventario)

    Cliente->>FE: Hace clic en "Continuar al Pago"
    Note over FE: Recopila ítems del carro<br/>y genera SESSION_ID
    FE->>BE: POST /exec {accion: "reservar", items, idSesion}
    Note over BE: Bloquea hoja con LockService
    BE->>DB: Lee stock real en 'Inventario'
    BE->>DB: Lee reservas activas en 'Reservas' (<10 min)
    Note over BE: Calcula stock neto disponible
    alt Stock Neto Suficiente
        BE->>DB: Agrega fila en 'Reservas' (Tiempo actual)
        BE-->>FE: Retorna {"result": "success"}
        FE->>Cliente: Muestra pestaña Pago y Datos Bancarios
    else Stock Neto Insuficiente
        BE-->>FE: Retorna {"result": "error", "error": "Alguien acaba de tomar..."}
        FE->>Cliente: Muestra alerta en pantalla y bloquea el avance
    end
```

---

## 2. Flujo de Compra y Conciliación Bancaria Automática (Robot)

Representa el proceso asíncrono desde que el cliente transfiere en su banco hasta que el robot multibanco valida el pago.

```mermaid
sequenceDiagram
    autonumber
    actor Cliente
    participant B as Banco Cliente
    participant MP as Banco Arvinea (MercadoPago/Estado)
    participant E as Gmail (Inbox)
    participant R as Robot (verificarPagosBancarios)
    participant DB as Sheets (Pedidos / Ruta)
    participant S as Servidor Email (MailApp)

    Cliente->>B: Transfiere monto del pedido
    B->>MP: Deposita fondos
    MP->>E: Envía email de confirmación "Aviso de recepción..." (Unread)
    
    Note over R: Se ejecuta cada 10 min por Trigger
    R->>E: Busca correos con subject/from específicos (unread)
    alt Correo Encontrado
        R->>E: Parsea cuerpo y extrae ID (ARV-XXXXX) y monto ($)
        R->>DB: Busca fila en hoja 'Pedidos'
        alt ID Encontrado y Monto Coincide
            Note over R: Llama a validarYAprobar()
            R->>DB: Escribe "Pagado" en Columna Estado (Verde)
            R->>DB: Descuenta stock real en hoja 'Inventario'
            R->>DB: Copia datos a la hoja 'Hoja de Ruta'
            R->>S: Solicita enviar correo de confirmación de pago
            S-->>Cliente: Despacha correo "Pedido Confirmado"
            R->>E: Marca correo bancario como Leído (Read)
        else Monto no coincide
            R->>S: Envía correo de Alerta a Felipe (arvinea.organic@gmail.com)
            R->>DB: Escribe "Alerta" en la hoja 'Pedidos'
        end
    end
```

---

## 3. Flujo de Logística y Aviso de Despacho (Manual Admin)

Describe la interacción al momento de realizar el empaque físico y despacho por courier o entrega presencial.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrador (Excel)
    participant DB as Sheets (Hoja de Ruta)
    participant BE as Backend (onEditHojaRuta)
    participant S as Servidor Email (MailApp)
    actor Cliente

    alt Caso A: Despacho a Domicilio (Delivery)
        Admin->>DB: Genera etiqueta en BlueExpress
        Admin->>DB: Escribe Código de Tracking en Col J
        Admin->>DB: Escribe "Enviado" en Col H (Estado Entrega)
        BE->>DB: trigger onEditHojaRuta detecta cambio
        BE->>S: Genera email con link de tracking
        S-->>Cliente: Envía "¡Tu pedido va en camino! 🚚"
    else Caso B: Retiro en Punto (Pickup)
        Admin->>DB: Deja Col J vacía
        Admin->>DB: Escribe "Listo" en Col H (Estado Entrega)
        BE->>DB: trigger onEditHojaRuta detecta cambio
        BE->>S: Genera email con enlace de WhatsApp
        S-->>Cliente: Envía "¡Tu pedido está listo! 🛍️"
    end
```
