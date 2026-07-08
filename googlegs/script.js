// =======================================================
//        ARVINEA ORGANIC - SISTEMA INTEGRAL V3.5
// =======================================================

// --- CONFIGURACIÓN ---
const EMAIL_FELIPE = "arvinea.organic@gmail.com"; 
const STOCK_SEGURIDAD = 1; 
const API_TOKEN = "ARV_SECURE_TOKEN_2026"; // Token de seguridad para aprobación manual

// --- CONFIGURACIÓN BANCOS ---
const REMITENTE_BE = "noreply@correo.bancoestado.cl"; 
const ASUNTO_BE = "Aviso de envío o recepción de dinero"; 

const REMITENTE_MP = "info@mercadopago.cl"; 
const KEYWORD_MP = "transfirió"; 

const REMITENTE_BCH = "serviciodetransferencias@bancochile.cl"; 
const ASUNTO_BCH = "Aviso de transferencia de fondos"; 

// --- 1. UTILIDADES ---
function generarIDPedido() {
  const timestamp = Date.now().toString().slice(-5);
  const random = Math.floor(Math.random() * 100); 
  return 'ARV-' + timestamp + '-' + random;
}

function limpiarPrecio(texto) {
  if (!texto) return 0;
  return parseInt(texto.toString().replace(/[^0-9]/g, ''), 10);
}

// --- 2. ACTIVADOR MANUAL (AL ESCRIBIR EN EXCEL) ---
function onEditInstallable(e) {
  var range = e.range;
  var sheet = range.getSheet();
  
  // Solo actuamos en la hoja "Pedidos", columna K (11)
  if (sheet.getName() === "Pedidos" && range.getColumn() === 11) {
    var valorNuevo = String(range.getValue()).toLowerCase(); 
    
    // Si escribes "pagado", activamos la validación manual
    if (valorNuevo.includes("pagado")) { 
      console.log("✏️ Activación manual detectada");
      
      var fila = range.getRow();
      var idPedido = sheet.getRange(fila, 1).getValue(); // Col A
      var total = sheet.getRange(fila, 10).getValue();   // Col J
      
      // Llamamos a la validación forzando manual (true)
      validarYAprobar(idPedido, limpiarPrecio(total), sheet, sheet.getDataRange().getValues(), null, true);
    }
  }
}

// --- 3. RECIBIR PEDIDO (WEB) ---
function doPost(e) {
  // A. INTERCEPTOR RESERVAS
  try {
     var requestData = JSON.parse(e.postData.contents);
     if (requestData.accion === "reservar") {
         return reservarStock(e);
     }
  } catch(err) {}

  // B. BLOQUEO DE SEGURIDAD
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": "Servidor ocupado." })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheetPedidos = doc.getSheetByName("Pedidos") || doc.getSheets()[0];
    var sheetInventario = doc.getSheetByName("Inventario");
    
    var data = JSON.parse(e.postData.contents);
    var itemsSolicitados = data.items; 

    // C. VALIDAR STOCK
    if (sheetInventario && itemsSolicitados) {
      var datosInv = sheetInventario.getDataRange().getValues();
      for (var k = 0; k < itemsSolicitados.length; k++) {
        var productoBuscado = String(itemsSolicitados[k].nombre).trim().toLowerCase();
        var cantidadPedida = itemsSolicitados[k].cantidad || 1;
        
        for (var i = 1; i < datosInv.length; i++) {
          if (String(datosInv[i][0]).trim().toLowerCase() === productoBuscado) {
            var stockActual = parseInt(datosInv[i][1]);
            if (stockActual < (cantidadPedida + STOCK_SEGURIDAD)) {
               return ContentService.createTextOutput(JSON.stringify({ 
                "result": "error", 
                "error": "Stock insuficiente para: " + itemsSolicitados[k].nombre 
              })).setMimeType(ContentService.MimeType.JSON);
            }
            break; 
          }
        }
      }
    }

    // D. GUARDAR PEDIDO
    var idPedido = generarIDPedido();
    var jsonItems = JSON.stringify(itemsSolicitados);
    var esVentaCaja = (data.cupon === "CAJA");
    var estadoInicial = esVentaCaja ? "Pagado" : "Pendiente"; 
    
    var nuevaFila = sheetPedidos.appendRow([
      idPedido, new Date(), data.cliente, data.email, data.telefono, 
      data.rut, data.ubicacion, data.entrega, data.pedido, data.total, 
      estadoInicial, jsonItems, "", data.cupon || "" 
    ]);

    if (esVentaCaja && data.cupon) {incrementarUsoCupon(data.cupon);}

    // E. ACCIONES VENTA CAJA
    if (esVentaCaja) {
       var ultimaFila = sheetPedidos.getLastRow();
       descontarStockReal(ultimaFila, sheetPedidos);
       sheetPedidos.getRange(ultimaFila, 11).setBackground("#b6d7a8");
    }

    // F. CORREO INSTRUCCIONES (Si no es caja)
    if (data.email && !esVentaCaja) {
      var htmlInstrucciones = `
          ${obtenerBarraProgreso(1)} <h2 style="color: #2d4f1e; text-align:center;">¡Casi listo, ${data.cliente}!</h2>
          <p style="text-align:center;">Tu pedido <strong>${idPedido}</strong> ha sido reservado con éxito.</p>
          
          <div style="background-color: #fff; border: 2px dashed #d4a373; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px;">
            <p style="margin: 0; color: #666; font-size: 0.9rem;">Monto a Transferir</p>
            <div style="font-size: 32px; font-weight: bold; color: #2d4f1e; margin: 10px 0;">$${parseInt(data.total).toLocaleString('es-CL')}</div>
          </div>

          <h3 style="color: #d4a373; border-bottom: 1px solid #eee; padding-bottom: 10px;">Datos de Transferencia:</h3>
          <ul style="list-style: none; padding: 0; line-height: 2;">
            <li>🏦 <strong>Banco:</strong> Mercado Pago</li>
            <li>🪪 <strong>RUT:</strong> 21.917.234-6</li>
            <li>👤 <strong>Nombre:</strong> Arvinea Organic</li>
            <li>🔢 <strong>Cuenta:</strong> 1049386009</li>
            <li>📧 <strong>Email:</strong> ${EMAIL_FELIPE}</li>
          </ul>

          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; color: #2d4f1e; font-size: 0.9rem; margin-top: 20px;">
            <strong>⚠️ IMPORTANTE:</strong><br>
            En el comentario de la transferencia escribe solo el ID sin guiones:<br>
            <span style="font-size: 1.2rem; font-weight: bold;">${idPedido}</span>
          </div>
      `;
      var linkAprobar = ScriptApp.getService().getUrl() + "?action=aprobar&id=" + idPedido + "&token=" + API_TOKEN;
      var cuerpoInstrucciones = crearPlantillaEmail("Confirma tu Pedido", htmlInstrucciones, "pago");

      MailApp.sendEmail({
        to: data.email,
        subject: "⏳ Confirma tu pedido " + idPedido + " - Arvinea Organic",
        htmlBody: cuerpoInstrucciones
      });

      var productosParaEmail = String(data.pedido)
            .replace(/\n/g, '<br>')
            .replace(/↳ 📌 NOTA:/g, '<span style="background-color: #fff3cd; color: #856404; padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; font-weight: bold;">↳ 📌 NOTA:</span>');

      MailApp.sendEmail({
        to: EMAIL_FELIPE,
        subject: "🚨 ¡Nuevo Pedido Registrado! " + idPedido,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
            <h3 style="color: #2d4f1e; border-bottom: 2px solid #2d4f1e; padding-bottom: 10px;">🚨 ¡Nuevo Pedido Registrado!</h3>
            <p>Un cliente acaba de realizar un pedido en la tienda web.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
              <tr>
                <td style="padding: 10px; font-weight: bold; background: #f9f9f9; width: 30%; border-bottom: 1px solid #eee;">ID Pedido:</td>
                <td style="padding: 10px; background: #f9f9f9; color: #2d4f1e; font-weight: bold; font-size: 1.1rem; border-bottom: 1px solid #eee;">${idPedido}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Cliente:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.cliente} <br><span style="font-size:0.85rem; color:#666;">${data.telefono}</span></td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; background: #f9f9f9; border-bottom: 1px solid #eee;">Monto Total:</td>
                <td style="padding: 10px; background: #f9f9f9; font-weight: bold; color: #b8860b; font-size: 1.1rem; border-bottom: 1px solid #eee;">$${parseInt(data.total).toLocaleString('es-CL')}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; vertical-align: top;">Productos:</td>
                <td style="padding: 10px; line-height: 1.6; color: #111;">
                    ${productosParaEmail}
                </td>
              </tr>
            </table>
            
            <div style="margin: 25px 0; text-align: center; background-color: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px dashed #2d4f1e;">
              <p style="font-size: 0.95rem; color: #166534; margin-bottom: 15px; font-weight: bold;">¿Verificaste el pago en el banco?</p>
              <a href="${linkAprobar}" target="_blank" style="background-color: #2d4f1e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 1.05rem; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                Aprobar y Descontar Stock ✅
              </a>
            </div>
            
            <p style="font-size: 0.8rem; color: #999; text-align: center;">Arvinea Organic - Sistema de Gestión Automática</p>
          </div>
        `
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ "result": "success", "idPedido": idPedido })).setMimeType(ContentService.MimeType.JSON);
  
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": e.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// --- 4. ROBOT MULTIBANCO (ELIMINADO) ---
// La conciliación de pagos ahora se gestiona de forma segura a través del link de aprobación manual de Felipe
// o cambiando el estado a "Pagado" directamente en la planilla de cálculo.

// --- 5. LÓGICA DE APROBACIÓN (CENTRAL Y ÚNICA) ---
function validarYAprobar(idBuscado, montoRecibido, sheetPedidos, dataPedidos, mensajeOriginal, forzarManual) {
  console.log("--- BUSCANDO PEDIDO: " + idBuscado + " ---");
  
  var filaEncontrada = -1;
  var montoEsperado = 0;
  var emailCliente = ""; 
  var nombreCliente = "";
  var celdaEstado = null;
  
  var numerosBuscados = String(idBuscado).replace(/[^0-9]/g, '');

  // BÚSQUEDA INVERSA (De abajo hacia arriba)
  for (var i = dataPedidos.length - 1; i >= 1; i--) {
    var idExcelLimpio = String(dataPedidos[i][0]).replace(/[^0-9]/g, '');
    
    if (idExcelLimpio === numerosBuscados && numerosBuscados.length > 3) {
       
       // 🛠️ ARREGLO MANUAL: Extraemos los datos siempre que el ID coincida, 
       // para no perder el email si tú escribiste "Pagado" antes de que el script buscara.
       filaEncontrada = i + 1;
       nombreCliente = dataPedidos[i][2]; 
       emailCliente = dataPedidos[i][3]; 
       montoEsperado = limpiarPrecio(dataPedidos[i][9]); 
       
       var estadoActual = String(dataPedidos[i][10]).toLowerCase(); 
       
       // Si está pendiente, es el objetivo perfecto. Paramos.
       if (estadoActual.includes("pendiente")) {
          break; 
       }
       
       // Si es una acción forzada manual, usamos el primero que coincida y paramos.
       if (forzarManual) {
          break;
       }
    }
  }

  if (filaEncontrada > 0) {
    celdaEstado = sheetPedidos.getRange(filaEncontrada, 11);
    var fondoActual = celdaEstado.getBackground();

    // EVITAR DUPLICADOS: Si ya está verde y no es una acción manual, se detiene.
    if (!forzarManual && fondoActual === "#b6d7a8") {
      console.log("⚠️ ALERTA: Pedido ya procesado anteriormente. Se ignora.");
      return "YA_PAGADO";
    }

    if (forzarManual || Math.abs(montoEsperado - montoRecibido) < 100) {
      console.log("💰 Monto validado. Procediendo en fila: " + filaEncontrada);
      
      descontarStockReal(filaEncontrada, sheetPedidos); 
      
      var cuponUsado = dataPedidos[filaEncontrada - 1][13]; // Columna 13 (índice 12)
      if (cuponUsado && cuponUsado !== "") {
          incrementarUsoCupon(cuponUsado);
      }


      celdaEstado.setValue("Pagado"); 
      celdaEstado.setBackground("#b6d7a8"); 
      
      copiarAHojaDeRuta(idBuscado, nombreCliente, dataPedidos[filaEncontrada-1]);

      // ENVÍO DE CORREO CONFIRMACIÓN
      if (emailCliente && emailCliente.includes("@")) {
        try {
           var contenidoHTML = `
              ${obtenerBarraProgreso(2)}
              <h2 style="color: #2d4f1e; margin-top: 0;">¡Hola ${nombreCliente}!</h2>
              <p>Tenemos excelentes noticias. Hemos confirmado tu pago de <strong>$${montoEsperado.toLocaleString('es-CL')}</strong>.</p>
              <div style="background-color: #f9f9f9; border-left: 4px solid #d4a373; padding: 15px; margin: 20px 0;">
                <strong>Pedido:</strong> ${idBuscado}<br>
                <strong>Estado:</strong> Confirmado y en preparación 👨‍🍳
              </div>
              <p>Ahora nuestro equipo comenzará a preparar tus productos. Te avisaremos apenas salgan a despacho.</p>
              <br>
              <center><a href="https://arvinea.github.io/arvinea" style="background-color: #2d4f1e; color: white; padding: 12px 25px; text-decoration: none; border-radius: 30px; font-weight: bold;">Volver a la Tienda</a></center>
           `;

           var cuerpoFinal = crearPlantillaEmail("¡Pago Confirmado!", contenidoHTML, "pago");

           MailApp.sendEmail({
               to: emailCliente,
               subject: "✅ Pedido Confirmado - Arvinea Organic",
               htmlBody: cuerpoFinal
           });
           console.log("✅ Correo enviado a: " + emailCliente);
        } catch(e) { 
           console.error("❌ ERROR AL ENVIAR MAIL: " + e.toString()); 
        }
      } else {
         console.warn("⚠️ No se pudo enviar el correo: no hay email válido en la fila.");
      }
      return "APROBADO";
    } else {
      enviarAlertaFelipe(idBuscado, montoEsperado, montoRecibido);
      return "ALERTA";
    }
  } else {
    console.error("❌ ID NO ENCONTRADO");
  }
  return "NO_ENCONTRADO"; 
}

// --- 6. DESCONTAR STOCK ---
function descontarStockReal(filaPedido, sheetPedidos) {
  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheetInventario = doc.getSheetByName("Inventario");
    var jsonItems = sheetPedidos.getRange(filaPedido, 12).getValue();
    if (!jsonItems) return;

    var items = JSON.parse(jsonItems);
    var datosInv = sheetInventario.getDataRange().getValues();

    for (var k = 0; k < items.length; k++) {
      var prodNombre = String(items[k].nombre).trim().toLowerCase();
      var prodCant = items[k].cantidad || 1;

      for (var i = 1; i < datosInv.length; i++) {
        var nombreEnInv = String(datosInv[i][0]).trim().toLowerCase();
        if (nombreEnInv === prodNombre) {
          var celdaStock = sheetInventario.getRange(i + 1, 3); 
          var nuevoStock = parseInt(datosInv[i][2]) - prodCant;
          celdaStock.setValue(nuevoStock);
          // ALERTA ROJA: Quiebre de Stock por Pago Atrasado
          if (nuevoStock < 0) {
             MailApp.sendEmail({
               to: EMAIL_FELIPE,
               subject: "🚨 URGENTE: QUIEBRE DE STOCK (Pago Atrasado)",
               htmlBody: "El sistema acaba de procesar un pago atrasado, pero el producto <strong>" + prodNombre + "</strong> se ha quedado sin stock.<br><br>El Excel marca <strong>" + nuevoStock + "</strong> unidades.<br><br><strong>Acción requerida:</strong> Revisa el inventario físico. Si no tienes, contacta al cliente del último pedido para coordinar un cambio o reembolso."
             });
          } 
          // ALERTA AMARILLA: Stock Crítico normal
          else if (nuevoStock <= 3) {
             MailApp.sendEmail({
               to: EMAIL_FELIPE,
               subject: "⚠️ STOCK CRÍTICO: " + prodNombre,
               htmlBody: "Quedan solo <strong>" + nuevoStock + "</strong> unidades."
             });
          }
          break; 
        }
      }
    }
  } catch (e) { console.error("Error stock: " + e.toString()); }
}

// --- 7. API GET ---
function doGet(e) {
  var action = e.parameter.action;
  if (action === "obtenerProductos") return obtenerInventarioJSON();
  if (action === "obtenerTarifas") return obtenerTarifasJSON();
  if (action === "obtenerConfig") return obtenerConfigJSON();
  if (action === "obtenerCupones") return obtenerCuponesJSON();
  if (action === "obtenerCarrusel") return obtenerCarruselJSON();
  if (action === "obtenerValoraciones") {
     var sheetVal = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Valoraciones");
     if (!sheetVal) return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);
     var data = sheetVal.getDataRange().getValues();
     var resenas = [];
     var contador = 0;
     for(var i = data.length - 1; i >= 1; i--) {
        if (contador >= 20) break;
        if(parseInt(data[i][3]) >= 4) {
           resenas.push({
              nombre: data[i][1],
              producto: data[i][2],
              estrellas: parseInt(data[i][3]),
              comentario: data[i][4]
           });
           contador++;
        }
     }
     return ContentService.createTextOutput(JSON.stringify(resenas)).setMimeType(ContentService.MimeType.JSON);
  }
  if (action === "obtenerTodo") return obtenerTodoJSON();
  var idTarget = e.parameter.id;
  if (action === "aprobar" && idTarget) {
    var token = e.parameter.token;
    if (token !== API_TOKEN) {
       return HtmlService.createHtmlOutput("<h1 style='color:red;'>❌ Acceso no autorizado</h1>");
    }
    
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName("Pedidos");
    var data = sheet.getDataRange().getValues();
    var montoReal = 0;
    for(var i=1; i<data.length; i++) {
       if(String(data[i][0]).indexOf(idTarget) !== -1) {
         montoReal = limpiarPrecio(data[i][9]);
         break;
       }
    }
    var resultado = validarYAprobar(idTarget, montoReal, sheet, data, null, true);
    if (resultado === "APROBADO" || resultado === "YA_PAGADO") {
       return HtmlService.createHtmlOutput("<h1 style='color:green;'>✅ Aprobado</h1>");
    } else {
       return HtmlService.createHtmlOutput("<h1 style='color:red;'>❌ Error</h1>");
    }
  }
  return HtmlService.createHtmlOutput("API Online");
}

// --- 8. FUNCIONES JSON (Inventario, Config, etc) ---
function obtenerInventarioJSON() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheetInv = doc.getSheetByName("Inventario");
  var sheetRes = doc.getSheetByName("Reservas"); 
  var dataInv = sheetInv.getDataRange().getValues(); 
  var dataRes = sheetRes ? sheetRes.getDataRange().getValues() : [];
  var ahora = Date.now();
  var reservasMap = {};
  for (var r = 1; r < dataRes.length; r++) {
     var tiempo = new Date(dataRes[r][2]).getTime();
     if (ahora - tiempo < (10 * 60 * 1000)) { 
        var prod = String(dataRes[r][0]);
        var cant = parseInt(dataRes[r][1]);
        if (!reservasMap[prod]) reservasMap[prod] = 0;
        reservasMap[prod] += cant;
     }
  }
  var productos = [];
  for (var i = 1; i < dataInv.length; i++) {
    if(dataInv[i][0] === "") continue;
    var nombreP = String(dataInv[i][0]);
    var saborP = String(dataInv[i][1]); // NUEVO: Extraemos el Sabor de la Columna B
    var stockReal = parseInt(dataInv[i][2]) || 0; // ANTES 1, AHORA 2
    var stockReservado = reservasMap[nombreP] || 0;
    var stockFinal = stockReal - stockReservado; 
    if (stockFinal < 0) stockFinal = 0;
    productos.push({
      nombre: nombreP, sabor: saborP, stock: stockFinal, precio: parseInt(dataInv[i][3]) || 0, // ANTES 2, AHORA 3
      categoria: String(dataInv[i][4]), imagen: String(dataInv[i][5]), // ANTES 3 y 4, AHORA 4 y 5
      descripcion: String(dataInv[i][6]), nutricion: String(dataInv[i][7]), // ANTES 5 y 6, AHORA 6 y 7
      precioAntes: parseInt(dataInv[i][8]) || 0, promo: String(dataInv[i][10]).toUpperCase().trim() // Corregido: Columna K (índice 10)
    });
  }
  return ContentService.createTextOutput(JSON.stringify(productos)).setMimeType(ContentService.MimeType.JSON);
}

function obtenerTarifasJSON() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Tarifas");
  if (!sheet) return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);
  var data = sheet.getDataRange().getValues();
  var tarifas = [];
  for (var i = 1; i < data.length; i++) {
    if(data[i][0] === "") continue;
    tarifas.push({ region: String(data[i][0]), precio: parseInt(data[i][1]) || 0 });
  }
  return ContentService.createTextOutput(JSON.stringify(tarifas)).setMimeType(ContentService.MimeType.JSON);
}

function obtenerConfigJSON() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Configuracion");
  if (!sheet) return ContentService.createTextOutput("{}").setMimeType(ContentService.MimeType.JSON);
  var data = sheet.getDataRange().getValues();
  var config = {};
  for (var i = 1; i < data.length; i++) {
    var clave = String(data[i][0]);
    var valor = data[i][1];
    var activo = String(data[i][2]).toUpperCase();
    if (activo === "SI") { config[clave] = valor; }
  }
  return ContentService.createTextOutput(JSON.stringify(config)).setMimeType(ContentService.MimeType.JSON);
}

function obtenerCuponesJSON() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Cupones");
  if (!sheet) return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);
  var data = sheet.getDataRange().getValues();
  var cupones = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][3]).toUpperCase() === "SI") {
      cupones.push({ 
        codigo: String(data[i][0]).toUpperCase().trim(), 
        tipo: String(data[i][1]).toUpperCase(), 
        valor: parseInt(data[i][2]) || 0,
        maxUsos: parseInt(data[i][4]) || 9999, // Columna E (Índice 4)
        usados: parseInt(data[i][5]) || 0      // Columna F (Índice 5)
      });
    }
  }
  return ContentService.createTextOutput(JSON.stringify(cupones)).setMimeType(ContentService.MimeType.JSON);
}

// --- 9. OTROS HELPERS ---
function enviarAlertaFelipe(id, esperado, recibido) {
  MailApp.sendEmail({ to: EMAIL_FELIPE, subject: "⚠️ ALERTA: Monto Incorrecto - " + id, htmlBody: "Recibido: " + recibido + " | Esperado: " + esperado });
}

function copiarAHojaDeRuta(id, cliente, filaDatos) {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheetRuta = doc.getSheetByName("Hoja de Ruta");
  if (!sheetRuta) return; 
  var dataRuta = sheetRuta.getDataRange().getValues();
  for (var i = 1; i < dataRuta.length; i++) {
     if (String(dataRuta[i][0]) === String(id)) {
        console.log("🚫 El pedido " + id + " ya está en Hoja de Ruta. No se duplica.");
        return; 
     }
  }
  var email = filaDatos[3];
  var telefono = filaDatos[4];
  var ubicacion = filaDatos[6];
  var tipo = filaDatos[7];
  var pedidoResumen = filaDatos[8];
  sheetRuta.appendRow([id, new Date(), cliente, telefono, tipo, ubicacion, pedidoResumen, "Por Despachar", email]);
}

function reservarStock(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000); 
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheetInv = doc.getSheetByName("Inventario");
    var sheetRes = doc.getSheetByName("Reservas");
    var data = JSON.parse(e.postData.contents);
    var items = data.items;
    var idSesion = data.idSesion;
    var ahora = Date.now();
    var datosInv = sheetInv.getDataRange().getValues();
    var datosRes = sheetRes.getDataRange().getValues();
    var reservasActivas = {};
    for (var r = 1; r < datosRes.length; r++) {
       var tiempo = new Date(datosRes[r][2]).getTime();
       if (ahora - tiempo < (10 * 60 * 1000)) {
          var prod = String(datosRes[r][0]);
          var cant = parseInt(datosRes[r][1]);
          if (!reservasActivas[prod]) reservasActivas[prod] = 0;
          reservasActivas[prod] += cant;
       }
    }
    for (var k = 0; k < items.length; k++) {
       var nombre = items[k].nombre;
       var cantidad = items[k].cantidad;
       var stockFisico = 0;
       for (var i = 1; i < datosInv.length; i++) {
          if (String(datosInv[i][0]) === nombre) { stockFisico = parseInt(datosInv[i][1]); break; }
       }
       var reservadoTotal = reservasActivas[nombre] || 0;
       var disponible = stockFisico - reservadoTotal;
       if (disponible < (cantidad + 1)) {
           return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": "Alguien acaba de tomar el último " + nombre + ". Intenta en 10 min." })).setMimeType(ContentService.MimeType.JSON);
       }
    }
    items.forEach(function(item) { sheetRes.appendRow([item.nombre, item.cantidad, new Date().toISOString(), idSesion]); });
    return ContentService.createTextOutput(JSON.stringify({ "result": "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": e.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally { lock.releaseLock(); }
}

// --- 10. AVISAR DESPACHO (ON EDIT HOJA RUTA) ---
function onEditHojaRuta(e) {
  var range = e.range;
  var sheet = range.getSheet();
  if (sheet.getName() === "Hoja de Ruta" && range.getColumn() === 8) {
    var valor = String(e.value).toLowerCase();
    if (valor.includes("enviado") || valor.includes("despachado") || valor.includes("listo")) {
       var fila = range.getRow();
       var datos = sheet.getRange(fila, 1, 1, 10).getValues()[0]; 
       var nombre = datos[2]; 
       var tipoEntrega = String(datos[4]).toLowerCase(); 
       var lugar = datos[5]; 
       var email = datos[8]; 
       var tracking = datos[9]; 

       if (email && email.includes("@")) {
          var tituloCorreo = "";
          var contenidoHTML = "";
          var tipoIcono = "envio";
          var barraHTML = obtenerBarraProgreso(3); 

          if (tipoEntrega.includes("pickup") || tipoEntrega.includes("retiro")) {
             tituloCorreo = "¡Tu pedido está listo! 🛍️";
             contenidoHTML = `
                ${barraHTML}
                <h2 style="color: #2d4f1e;">¡Hola ${nombre}!</h2>
                <p>Tu pedido ya está preparado y listo para ser entregado.</p>
                <div style="background-color: #f9f9f9; border-left: 4px solid #d4a373; padding: 15px; margin: 20px 0;">
                   <strong>Punto de Retiro:</strong> ${lugar}<br>
                   <strong>Estado:</strong> Listo para entrega ✅
                </div>
                <p>Por favor, coordina el horario respondiendo este correo o por WhatsApp.</p>
                <center><a href="https://wa.me/56950323402" style="background-color: #25d366; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Coordinar WhatsApp</a></center>
             `;
          } else {
             tituloCorreo = "¡Tu pedido va en camino! 🚚";
             var trackingBlock = "";
             if (tracking && String(tracking).length > 3) {
                trackingBlock = `
                   <div style="text-align: center; margin: 20px 0; padding: 20px; background: #fff3cd; border-radius: 8px;">
                      <p style="margin:0; color:#856404; font-size: 0.9rem;">Número de Seguimiento</p>
                      <div style="font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #2d4f1e; margin-top:5px;">${tracking}</div>
                      <br>
                      <a href="https://www.blue.cl/seguimiento/" style="background-color: #2d4f1e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Rastrear en BlueExpress</a>
                   </div>
                `;
             } else {
                trackingBlock = `<p><em>(El número de seguimiento te lo enviaremos en breve o puedes solicitarlo por WhatsApp)</em></p>`;
             }
             contenidoHTML = `
                ${barraHTML}
                <h2 style="color: #2d4f1e;">¡Hola ${nombre}!</h2>
                <p>Tu pedido ha salido de nuestra bodega y va rumbo a: <strong>${lugar}</strong>.</p>
                <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <strong>🕒 Tiempo estimado:</strong> 3 a 5 días hábiles.<br>
                    <strong>📦 Estado:</strong> En manos del courier.
                </div>
                ${trackingBlock}
                <br>
                <p style="text-align:center; font-size:0.9rem; color:#777;">¿Dudas con el envío?</p>
                <center>
                  <a href="https://wa.me/56950323402?text=Hola,%20consulto%20por%20envio%20pedido%20a%20nombre%20de%20${encodeURIComponent(nombre)}" 
                     style="background-color: #25d366; color: white; padding: 10px 20px; text-decoration: none; border-radius: 20px; font-weight: bold; font-size: 0.9rem;">
                     <span style="font-size: 1.2em; vertical-align: middle;">✆</span> Preguntar estado por WhatsApp
                  </a>
                </center>
             `;
          }
          var cuerpoFinal = crearPlantillaEmail(tituloCorreo, contenidoHTML, tipoIcono);
          MailApp.sendEmail({ to: email, subject: tituloCorreo + " - Arvinea Organic", htmlBody: cuerpoFinal });
       }
    }
  }
}

// --- 11. SISTEMA DE RESEÑAS ---
function verificarPedidosParaResena() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName("Pedidos");
  var data = sheet.getDataRange().getValues();
  var hoy = new Date();
  var LINK_FORMULARIO = "https://forms.gle/YtUMGSFsgyrmdoqu8"; 

  for (var i = 1; i < data.length; i++) {
    var fechaPedido = new Date(data[i][1]);
    var estado = String(data[i][10]).toLowerCase(); 
    var yaEnviado = data[i][12]; 
    var diffTiempo = hoy.getTime() - fechaPedido.getTime();
    var diasPasados = Math.floor(diffTiempo / (1000 * 3600 * 24));

    if (diasPasados >= 7 && estado === "pagado" && yaEnviado !== "SI") {
        var nombre = data[i][2];
        var email = data[i][3];
        if (email && email.includes("@")) {
           enviarSolicitudResena(email, nombre, LINK_FORMULARIO);
           sheet.getRange(i + 1, 13).setValue("SI"); 
        }
    }
  }
}

function enviarSolicitudResena(email, nombre, link) {
  var html = `
    <h2 style="color: #2d4f1e;">¿Qué te pareció el sabor del valle? 🍓</h2>
    <p>Hola ${nombre},</p>
    <p>Ha pasado una semana desde tu compra y nos encantaría saber tu opinión.</p>
    <br>
    <center><a href="${link}" style="background-color: #d4a373; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">⭐ Dejar una Reseña</a></center>
    <br>
    <p style="font-size: 0.9rem; color: #777;">¡Gracias por ser parte de la familia Arvinea!</p>
  `;
  var cuerpo = crearPlantillaEmail("¡Queremos escucharte!", html, "envio");
  MailApp.sendEmail({ to: email, subject: "⭐ Tu opinión es muy importante - Arvinea Organic", htmlBody: cuerpo });
}

// --- 12. DISEÑO Y BARRAS ---
function crearPlantillaEmail(titulo, contenido, tipo) {
  var colorPrimario = "#2d4f1e"; var colorAcento = "#d4a373"; var colorFondo = "#f4f4f4";
  var logoUrl = "https://arvinea.github.io/arvinea/img/arvcircle.PNG"; 
  var icono = "🍓";
  if (tipo === "alerta") icono = "⚠️";
  if (tipo === "envio") icono = "🚚";
  if (tipo === "pago") icono = "✅";

  return `
    <div style="background-color: ${colorFondo}; padding: 40px 0; font-family: 'Helvetica', sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        <div style="background-color: ${colorPrimario}; padding: 20px; text-align: center;">
           <img src="${logoUrl}" alt="Arvinea Organic" style="max-height: 60px; object-fit: contain;">
           <h1 style="color: #ffffff; font-size: 24px; margin: 10px 0 0 0; font-weight: 300; letter-spacing: 1px;">${titulo}</h1>
        </div>
        <div style="padding: 40px 30px; color: #333333; line-height: 1.6;">
           <div style="font-size: 40px; text-align: center; margin-bottom: 20px;">${icono}</div>
           ${contenido}
        </div>
        <div style="background-color: #333; color: #888; padding: 20px; text-align: center; font-size: 12px;">
           <p style="margin: 0;">Arvinea Organic - Sabor Natural, Vida Real</p>
           <p style="margin: 5px 0;">Valle Escondido, Chile 🇨🇱</p>
           <div style="margin-top: 10px;">
             <a href="https://instagram.com/arvinea.cl" style="color: ${colorAcento}; text-decoration: none; margin: 0 10px;">Instagram</a> | 
             <a href="https://arvinea.github.io/arvinea" style="color: ${colorAcento}; text-decoration: none; margin: 0 10px;">Nuestra Web</a>
           </div>
        </div>
      </div>
    </div>
  `;
}

function obtenerBarraProgreso(pasoActivo) {
    var colorActivo = "#2d4f1e"; 
    var colorInactivo = "#e0e0e0"; 
    var c1 = pasoActivo >= 1 ? colorActivo : colorInactivo;
    var c2 = pasoActivo >= 2 ? colorActivo : colorInactivo;
    var c3 = pasoActivo >= 3 ? colorActivo : colorInactivo;
    
    return `
      <div style="margin: 30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
             <td align="center" style="font-size:24px; color:${c1};">●</td>
             <td align="center" style="border-bottom: 2px solid ${c2}; width: 30%;"></td>
             <td align="center" style="font-size:24px; color:${c2};">●</td>
             <td align="center" style="border-bottom: 2px solid ${c3}; width: 30%;"></td>
             <td align="center" style="font-size:24px; color:${c3};">●</td>
          </tr>
          <tr>
             <td align="center" style="font-size:10px; color:${c1}; font-weight:bold;">SOLICITUD</td>
             <td></td>
             <td align="center" style="font-size:10px; color:${c2}; font-weight:bold;">PREPARACIÓN</td>
             <td></td>
             <td align="center" style="font-size:10px; color:${c3}; font-weight:bold;">DESPACHO</td>
          </tr>
        </table>
      </div>
    `;
}

function obtenerCarruselJSON() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Carrusel");
  if (!sheet) return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);
  
  var data = sheet.getDataRange().getValues();
  var slides = [];
  
  // Empezamos en i = 1 para saltar los encabezados
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][5]).toUpperCase() === "SI") { // Columna F (Activo)
      slides.push({
        imagen: String(data[i][0]),
        titulo: String(data[i][1]),
        texto: String(data[i][2]),
        btnTexto: String(data[i][3]),
        btnLink: String(data[i][4])
      });
    }
  }
  return ContentService.createTextOutput(JSON.stringify(slides)).setMimeType(ContentService.MimeType.JSON);
}

function incrementarUsoCupon(codigo) {
  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheetCupones = doc.getSheetByName("Cupones");
    if (!sheetCupones) return;
    var data = sheetCupones.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === String(codigo).trim().toUpperCase()) {
        var celdaUsados = sheetCupones.getRange(i + 1, 6); // Columna F
        var usosActuales = parseInt(data[i][5]) || 0;
        celdaUsados.setValue(usosActuales + 1);
        break;
      }
    }
  } catch (e) { console.error("Error al incrementar cupón: " + e.toString()); }
}

function obtenerTodoJSON() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Configuración
  var sheetConfig = doc.getSheetByName("Configuracion");
  var config = {};
  if (sheetConfig) {
    var dataC = sheetConfig.getDataRange().getValues();
    for (var i = 1; i < dataC.length; i++) {
      if (String(dataC[i][2]).toUpperCase() === "SI") config[String(dataC[i][0])] = dataC[i][1];
    }
  }

  // 2. Cupones
  var sheetCupones = doc.getSheetByName("Cupones");
  var cupones = [];
  if (sheetCupones) {
    var dataCup = sheetCupones.getDataRange().getValues();
    for (var i = 1; i < dataCup.length; i++) {
      if (String(dataCup[i][3]).toUpperCase() === "SI") {
        cupones.push({ codigo: String(dataCup[i][0]).toUpperCase().trim(), tipo: String(dataCup[i][1]).toUpperCase(), valor: parseInt(dataCup[i][2])||0, maxUsos: parseInt(dataCup[i][4])||9999, usados: parseInt(dataCup[i][5])||0 });
      }
    }
  }

  // 3. Tarifas
  var sheetTarifas = doc.getSheetByName("Tarifas");
  var tarifas = [];
  if (sheetTarifas) {
     var dataT = sheetTarifas.getDataRange().getValues();
     for (var i = 1; i < dataT.length; i++) {
       if(dataT[i][0] !== "") tarifas.push({ region: String(dataT[i][0]), precio: parseInt(dataT[i][1]) || 0 });
     }
  }

  // 4. Carrusel
  var sheetCarrusel = doc.getSheetByName("Carrusel");
  var slides = [];
  if (sheetCarrusel) {
     var dataCar = sheetCarrusel.getDataRange().getValues();
     for (var i = 1; i < dataCar.length; i++) {
       if (String(dataCar[i][5]).toUpperCase() === "SI") {
         slides.push({ imagen: String(dataCar[i][0]), titulo: String(dataCar[i][1]), texto: String(dataCar[i][2]), btnTexto: String(dataCar[i][3]), btnLink: String(dataCar[i][4]) });
       }
     }
  }

  // 5. Reseñas
  var sheetVal = doc.getSheetByName("Valoraciones");
  var resenas = [];
  if (sheetVal) {
     var dataV = sheetVal.getDataRange().getValues();
     var contador = 0;
     for(var i = dataV.length - 1; i >= 1; i--) {
        if (contador >= 20) break;
        if(parseInt(dataV[i][3]) >= 4) {
           resenas.push({ nombre: dataV[i][1], producto: dataV[i][2], estrellas: parseInt(dataV[i][3]), comentario: dataV[i][4] });
           contador++;
        }
     }
  }

  // 6. Inventario (Con cálculo de reservas integrado)
  var sheetInv = doc.getSheetByName("Inventario");
  var sheetRes = doc.getSheetByName("Reservas");
  var dataInv = sheetInv ? sheetInv.getDataRange().getValues() : [];
  var dataRes = sheetRes ? sheetRes.getDataRange().getValues() : [];
  var ahora = Date.now();
  var reservasMap = {};
  for (var r = 1; r < dataRes.length; r++) {
     var tiempo = new Date(dataRes[r][2]).getTime();
     if (ahora - tiempo < (10 * 60 * 1000)) {
        var prod = String(dataRes[r][0]);
        var cant = parseInt(dataRes[r][1]);
        if (!reservasMap[prod]) reservasMap[prod] = 0;
        reservasMap[prod] += cant;
     }
  }
  var productos = [];
  for (var i = 1; i < dataInv.length; i++) {
    if(dataInv[i][0] === "") continue;
    var nombreP = String(dataInv[i][0]);
    var stockFinal = (parseInt(dataInv[i][2]) || 0) - (reservasMap[nombreP] || 0);
    if (stockFinal < 0) stockFinal = 0;
    productos.push({
      nombre: nombreP, sabor: String(dataInv[i][1]), stock: stockFinal, precio: parseInt(dataInv[i][3]) || 0,
      categoria: String(dataInv[i][4]), imagen: String(dataInv[i][5]), descripcion: String(dataInv[i][6]), 
      nutricion: String(dataInv[i][7]), precioAntes: parseInt(dataInv[i][8]) || 0, promo: String(dataInv[i][10]).toUpperCase().trim() // Corregido: Columna K (índice 10)
    });
  }

  // 7. Empaquetar todo y enviarlo de golpe
  return ContentService.createTextOutput(JSON.stringify({
    config: config, cupones: cupones, tarifas: tarifas, carrusel: slides, resenas: resenas, productos: productos
  })).setMimeType(ContentService.MimeType.JSON);
}

// --- 13. LIMPIEZA AUTOMÁTICA DE RESERVAS EXPIRADAS ---
function limpiarReservasExpiradas() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheetRes = doc.getSheetByName("Reservas");
  if (!sheetRes) return;

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Esperar hasta 10 segundos
    var data = sheetRes.getDataRange().getValues();
    var ahora = Date.now();
    var filasBorradas = 0;

    // Iteramos de abajo hacia arriba para evitar desordenar los índices al borrar
    for (var i = data.length - 1; i >= 1; i--) {
      var tiempo = new Date(data[i][2]).getTime();
      if (isNaN(tiempo) || (ahora - tiempo > 10 * 60 * 1000)) {
        sheetRes.deleteRow(i + 1);
        filasBorradas++;
      }
    }
    if (filasBorradas > 0) {
      console.log("🧹 Se limpiaron " + filasBorradas + " reservas de stock expiradas.");
    }
  } catch (e) {
    console.error("Error al limpiar reservas expiradas: " + e.toString());
  } finally {
    lock.releaseLock();
  }
}