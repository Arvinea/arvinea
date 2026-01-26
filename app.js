// --- VARIABLES GLOBALES ---
const SESSION_ID = 'sess-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
let carrito = [];
let productoTemporal = {};
let tipoEntrega = 'delivery'; 
let inventarioGlobal = []; 
let tarifasEnvio = []; // Guardará la lista de precios
let configGlobal = {}; // Aquí guardaremos lo que diga el Excel
let costoEnvioSeleccionado = 0; // Guardará el costo actual (0, 4000, 7500...)
let listaCupones = []; // Aquí se guardarán los cupones válidos
let descuentoCupón = 0; // El monto ($) que descontaremos
const STOCK_SEGURIDAD = 1; // El cliente ve 1 unidad menos de la real
let codigoAplicado = ""; // Para saber qué cupón usó

// URL de Sheet (API)
const SHEET_API = 'https://script.google.com/macros/s/AKfycbyoRt7hECoMSx1HmMG34pvkrG2llfmiVZIbD38HgdiKbKV64wTui3zNY6C7gY_TmyKCFw/exec';


// --- CARGAR PRODUCTOS Y CREAR BOTONES (DINÁMICO TOTAL) ---
async function cargarProductos() {
    const contenedorPrincipal = document.getElementById('catalogo-dinamico'); // Recuerda cambiar el ID en tu HTML main
    // SI USAS EL HTML ANTERIOR, EL ID ERA "catalogo", ASEGÚRATE DE QUE COINCIDAN
    // Para tu caso actual (según el último HTML que mandaste), usaremos "catalogo" y borraremos lo de adentro.
    const mainCatalogo = document.getElementById('catalogo'); 
    
    const barraCategorias = document.getElementById('barra-categorias');

    if(!mainCatalogo || !barraCategorias) return;

    mainCatalogo.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Cargando catálogo...</div>';

    try {
        const response = await fetch(`${SHEET_API}?action=obtenerProductos`);
        const productos = await response.json();
        
        inventarioGlobal = productos; 
        
        // Limpiamos
        mainCatalogo.innerHTML = ''; 
        
        // 1. REINICIAR BARRA DE CATEGORÍAS
        // Agregamos siempre el botón "Todo" primero
        barraCategorias.innerHTML = `
            <button class="btn-cat active" onclick="filtrarSeccion('todos', this)">Todo</button>
        `;

        // 2. AGRUPAR PRODUCTOS
        const grupos = {};
        productos.forEach(p => {
            if (p.precio > 0 && p.stock > 0) {
                const catNombre = p.categoria ? p.categoria.trim() : 'Otros';
                if (!grupos[catNombre]) grupos[catNombre] = [];
                grupos[catNombre].push(p);
            }
        });

        // 3. GENERAR SECCIONES Y BOTONES
        const categoriasOrdenadas = Object.keys(grupos).sort();

        if (categoriasOrdenadas.length === 0) {
            mainCatalogo.innerHTML = '<p style="text-align:center; padding:20px;">No hay productos disponibles.</p>';
            return;
        }

        categoriasOrdenadas.forEach((catNombre) => {
            // Generar ID único seguro (ej: "Valle Escondido" -> "cat-valle-escondido")
            const idSeccion = 'cat-' + catNombre.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

            // --- A. CREAR BOTÓN EN LA BARRA ---
            const btn = document.createElement('button');
            btn.className = 'btn-cat';
            btn.innerText = catNombre;
            btn.onclick = () => filtrarSeccion(idSeccion, btn);
            barraCategorias.appendChild(btn);

            // --- B. CREAR SECCIÓN EN EL MAIN ---
            const seccionDiv = document.createElement('div');
            seccionDiv.className = 'seccion-categoria'; // Clase para poder filtrarlas luego
            seccionDiv.id = idSeccion; // ID para identificarla

            // Título
            const h2 = document.createElement('h2');
            h2.className = 'titulo-seccion';
            h2.innerText = catNombre;

            // Rejilla
            const grid = document.createElement('div');
            grid.className = 'grid-productos';

            // Tarjetas
            grupos[catNombre].forEach(prod => {
                crearTarjetaProducto(prod, grid);
            });

            // Ensamblar
            seccionDiv.appendChild(h2);
            seccionDiv.appendChild(grid);
            
            // Separador (HR)
            const hr = document.createElement('hr');
            hr.className = 'separador-seccion';

            mainCatalogo.appendChild(seccionDiv);
            mainCatalogo.appendChild(hr);
        });

    } catch (error) {
        console.error("Error cargando inventario:", error);
        mainCatalogo.innerHTML = '<p style="text-align:center">Hubo un error cargando el catálogo.</p>';
    }
}

async function cargarTarifas() {
    try {
        const response = await fetch(`${SHEET_API}?action=obtenerTarifas`);
        tarifasEnvio = await response.json();

        // Llenar el select del HTML
        const select = document.getElementById('select-region');
        if(select) {
            select.innerHTML = '<option value="0">Selecciona tu Región...</option>';
            tarifasEnvio.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.precio; // El valor es el precio
                opt.innerText = t.region; // El texto es el nombre
                select.appendChild(opt);
            });
        }
    } catch (error) {
        console.error("Error cargando tarifas:", error);
    }
}

function calcularTotalConEnvio() {
    const select = document.getElementById('select-region');
    const info = document.getElementById('info-costo-envio');

    // Obtenemos el precio del select
    costoEnvioSeleccionado = parseInt(select.value) || 0;

    if (costoEnvioSeleccionado > 0) {
        info.innerText = `Costo de envío: $${costoEnvioSeleccionado.toLocaleString('es-CL')}`;
        info.style.color = 'var(--primary)';
    } else {
        info.innerText = "Selecciona una región para ver el costo.";
        info.style.color = '#999';
    }
}

// --- FUNCIÓN PARA FILTRAR VISUALMENTE LAS SECCIONES ---
function filtrarSeccion(idObjetivo, btnClick) {
    // 1. Gestionar botones activos (visual)
    const todosBotones = document.querySelectorAll('.btn-cat');
    todosBotones.forEach(b => b.classList.remove('active'));
    btnClick.classList.add('active');

    // 2. Mostrar/Ocultar secciones
    const todasSecciones = document.querySelectorAll('.seccion-categoria');
    const todosHR = document.querySelectorAll('.separador-seccion');

    if (idObjetivo === 'todos') {
        // Mostrar todo
        todasSecciones.forEach(sec => sec.style.display = 'block');
        todosHR.forEach(hr => hr.style.display = 'block');
    } else {
        // Ocultar todo primero
        todasSecciones.forEach(sec => sec.style.display = 'none');
        todosHR.forEach(hr => hr.style.display = 'none'); // Ocultar líneas separadoras para que se vea limpio

        // Mostrar solo la elegida
        const seccionElegida = document.getElementById(idObjetivo);
        if(seccionElegida) {
            seccionElegida.style.display = 'block';
            // Animación suave de entrada
            seccionElegida.style.animation = 'fadeIn 0.5s';
        }
    }
}

// --- 2. CREAR TARJETA HTML ---
function crearTarjetaProducto(p, contenedor) {
    const div = document.createElement('div');
    div.classList.add('product-card');
    
    // Texto oculto para el buscador
    const textoBuscable = `${p.nombre} ${p.categoria} ${p.descripcion}`;
    div.setAttribute('data-busqueda', textoBuscable); 

    let botonHTML = '';
    
    // --- CAMBIO CLAVE AQUÍ ---
    // Solo mostramos botón si el stock supera la seguridad
    if (p.stock > STOCK_SEGURIDAD) {
        botonHTML = `<button class="btn-agregar" onclick="prepararCompra('${p.nombre}')">
                        <i class="fas fa-plus"></i> Agregar
                     </button>`;
    } else {
        // Si stock es 1 o 0, mostramos Agotado
        botonHTML = `<button class="btn-agregar agotado" disabled>Agotado</button>`;
    }

    const nombreSafe = p.nombre.replace(/'/g, "\\'");
    const descSafe = p.descripcion ? p.descripcion.replace(/'/g, "\\'") : '';
    const nutriSafe = p.nutricion ? p.nutricion.replace(/'/g, "\\'") : '';

    // Lógica de Precio Oferta (que ya hicimos)
    let htmlPrecio = `<p class="price">$${p.precio.toLocaleString('es-CL')}</p>`;
    if (p.precioAntes && p.precioAntes > p.precio) {
        htmlPrecio = `
            <div class="precio-oferta-container">
                <span class="precio-tachado">$${p.precioAntes.toLocaleString('es-CL')}</span>
                <span class="price oferta">$${p.precio.toLocaleString('es-CL')}</span>
            </div>
            <div class="etiqueta-oferta">OFERTA</div>
        `;
    }

    let badgeHTML = '';
    
    // Prioridad: Si es 2x1 gana sobre el % de descuento normal
    if (p.promo === '2X1' || p.promo === '3X2') {
        badgeHTML = `<span class="badge-sale promo-special">${p.promo}</span>`;
    } else if (p.precioAntes && p.precioAntes > p.precio) {
        badgeHTML = '<span class="badge-sale">%</span>';
    }

    div.innerHTML = `
        <div class="product-image" onclick="abrirModalInfo('${nombreSafe}', '${descSafe}', '${nutriSafe}')">
            <img src="${p.imagen}" alt="${p.nombre}">
            ${(p.precioAntes && p.precioAntes > p.precio) ? '<span class="badge-sale">%</span>' : ''}
        </div>
        <div class="product-info">
            <h3>${p.nombre}</h3>
            ${htmlPrecio}
            <div style="display:flex; gap:10px; flex-direction:column;">
                ${botonHTML}
                <button class="btn-info-nutri" onclick="abrirModalInfo('${nombreSafe}', '${descSafe}', '${nutriSafe}')">
                    <i class="fas fa-info-circle"></i> Info Nutricional
                </button>
            </div>
        </div>
    `;
    contenedor.appendChild(div);
}

// --- 3. LÓGICA DE COMPRA ---
function prepararCompra(nombreProducto) {
    // 1. Buscamos el producto
    productoTemporal = inventarioGlobal.find(p => p.nombre === nombreProducto);
    if (!productoTemporal) return;

    // 2. Calculamos el disponible REAL (Stock - Seguridad)
    // Si tienes 7 en Excel y seguridad 1, el cliente puede llevar máximo 6.
    let disponibleParaCliente = productoTemporal.stock - STOCK_SEGURIDAD;

    // Validación extra por si acaso
    if (disponibleParaCliente <= 0) {
        alert("Producto Agotado");
        return;
    }

    // 3. Llenamos los datos visuales
    document.getElementById('det-img').src = productoTemporal.imagen;
    document.getElementById('det-nombre').innerText = productoTemporal.nombre;
    document.getElementById('det-precio').innerText = '$' + productoTemporal.precio.toLocaleString('es-CL');
    document.getElementById('det-desc').innerText = productoTemporal.descripcion;

    // 4. CONFIGURAMOS EL INPUT DE CANTIDAD (Aquí está la magia)
    const inputCant = document.getElementById('det-cantidad');
    inputCant.value = 1;      // Reseteamos a 1
    inputCant.min = 1;        // Mínimo 1
    inputCant.max = disponibleParaCliente; // <--- ¡ESTO BLOQUEA EL 7!

    // Limpiamos observaciones y actualizamos total
    document.getElementById('det-obs').value = '';
    calcularTotalDetalle(); 
    
    // Mostramos el modal
    document.getElementById('modal-detalle').style.display = 'flex';
}

function abrirDetalle(nombre, precio, imagen, stockDisponible) {
    productoTemporal = { 
        nombre, precioBase: precio, imagen, cantidad: 1, observacion: '', stockMax: stockDisponible 
    };
    
    document.getElementById('det-titulo').innerText = nombre;
    document.getElementById('det-precio').innerText = '$' + precio.toLocaleString('es-CL');
    document.getElementById('det-img').src = imagen;
    document.getElementById('det-cantidad').innerText = 1;
    document.getElementById('det-obs').value = ''; 
    actualizarTotalModal();
    document.getElementById('modal-detalle').style.display = 'flex';
}

function cambiarCantidad(delta) {
    const input = document.getElementById('det-cantidad');
    const maximo = parseInt(input.max); // El tope que pusimos según el stock
    let valorActual = parseInt(input.value) || 1;
    let nuevoValor = valorActual + delta;

    // Solo cambiamos si está dentro de los límites (1 y Máximo)
    if (nuevoValor >= 1 && nuevoValor <= maximo) {
        input.value = nuevoValor;
        calcularTotalDetalle(); // Actualizamos el precio total
    } else if (nuevoValor > maximo) {
        // Opcional: Pequeña vibración o alerta visual si intenta pasar el stock
        input.style.color = "red";
        setTimeout(() => input.style.color = "black", 200);
    }
}

// --- NUEVA FUNCIÓN: CAMBIAR CANTIDAD EN EL CARRITO ---
function cambiarCantidadCarrito(index, delta) {
    const item = carrito[index];
    if (!item) return;

    // 1. Buscamos el stock real del producto
    const productoOriginal = inventarioGlobal.find(p => p.nombre === item.nombre);
    if (!productoOriginal) return;

    const stockMaximo = productoOriginal.stock - STOCK_SEGURIDAD;
    
    // 2. Calculamos cuánto llevamos en TOTAL de este producto en todo el carrito
    // (Por si el cliente agregó el mismo producto en 2 filas distintas)
    let cantidadTotalEnCarro = 0;
    carrito.forEach(c => {
        if(c.nombre === item.nombre) cantidadTotalEnCarro += c.cantidad;
    });

    // 3. Validar SUBIDA (+)
    if (delta > 0) {
        // Si al sumar 1 nos pasamos del stock real, bloqueamos
        if (cantidadTotalEnCarro + 1 > stockMaximo) {
            alert(`Stock limitado. Máximo disponible: ${stockMaximo}`);
            return;
        }
    }

    // 4. Calcular nueva cantidad
    const nuevaCantidad = item.cantidad + delta;

    // 5. Validar BAJADA (-)
    if (nuevaCantidad < 1) {
        // Si baja de 1, preguntamos si quiere eliminar
        if(confirm("¿Deseas eliminar este producto del pedido?")) {
            eliminarItem(index);
        }
        return;
    }

    // 6. Aplicar cambio
    item.cantidad = nuevaCantidad;
    // Importante: Actualizamos el precio total de esa línea (PrecioUnitario * Cantidad)
    item.precio = item.precioBase * nuevaCantidad; 
    
    actualizarCarritoUI();
}

function actualizarTotalModal() {
    const total = productoTemporal.precioBase * productoTemporal.cantidad;
    document.getElementById('det-total-calc').innerText = '$' + total.toLocaleString('es-CL');
}

// --- FUNCIÓN QUE FALTABA ---
function calcularTotalDetalle() {
    const input = document.getElementById('det-cantidad');
    let cantidad = parseInt(input.value) || 1;
    
    // Si el usuario borra el número, asumimos 1 visualmente
    if (cantidad < 1) cantidad = 1;

    // productoTemporal tiene los datos del producto abierto
    const total = productoTemporal.precio * cantidad;
    
    document.getElementById('det-total-calc').innerText = '$' + total.toLocaleString('es-CL');
}


function confirmarAgregarAlCarrito() {
    const cantidad = parseInt(document.getElementById('det-cantidad').value);
    const obs = document.getElementById('det-obs').value;

    // Validaciones
    if (isNaN(cantidad) || cantidad < 1) return;

    const maximoPermitido = productoTemporal.stock - STOCK_SEGURIDAD;
    if (cantidad > maximoPermitido) {
        alert("Stock insuficiente."); return; 
    }

    // Crear ítem
    const item = {
        nombre: productoTemporal.nombre,
        precioBase: productoTemporal.precio,
        precio: productoTemporal.precio * cantidad,
        cantidad: cantidad,
        obs: obs,
        imagen: productoTemporal.imagen
    };

    // Agregar y Actualizar
    carrito.push(item);
    actualizarCarritoUI();
    
    // --- AQUÍ ESTABA EL ERROR DE CIERRE ---
    cerrarDetalle(); // Antes decía cerrarModal() y esa función no existía
    
    // Feedback visual opcional
    // alert("¡Producto agregado!"); 
}

// --- 4. BUSCADOR Y FILTROS (CORREGIDO) ---
function filtrarProductos(filtroTexto) {
    const input = document.getElementById('buscador');
    
    // Si viene texto desde un botón (ej: Categoría), lo ponemos en el input
    if (typeof filtroTexto === 'string') {
        input.value = filtroTexto;
    }

    const termino = input.value.toUpperCase().trim();
    const items = document.getElementsByClassName('product-card'); 
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // RECUPERAMOS EL TEXTO OCULTO QUE CREAMOS ANTES
        // Si por alguna razón no tiene el atributo (productos viejos), usamos un string vacío para no dar error
        const dataBusqueda = (item.getAttribute('data-busqueda') || '').toUpperCase();

        // Si el término está en CUALQUIER parte de esa data (nombre, desc o cat)
        if (dataBusqueda.indexOf(termino) > -1) {
            item.style.display = "";
            item.style.animation = "fadeIn 0.5s"; // Efecto visual suave
        } else {
            item.style.display = "none";
        }
    }
}

// Listener para escribir en el buscador
document.addEventListener("DOMContentLoaded", function() {
    const inputBuscador = document.getElementById('buscador');
    if(inputBuscador) inputBuscador.addEventListener('keyup', () => filtrarProductos());
});


// --- 5. MODALES Y UI ---
function abrirModalInfo(nombre, desc, nutriData) {
    document.getElementById('modal-titulo').innerText = nombre;
    document.getElementById('modal-desc').innerText = desc || "Sin descripción.";
    
    const tablaBody = document.getElementById('modal-nutri-body');
    tablaBody.innerHTML = '';
    
    if (nutriData) {
        const lineas = nutriData.split('|');
        lineas.forEach(linea => {
            const partes = linea.split(':');
            const row = `<tr><td>${partes[0]}</td><td><strong>${partes[1] || ''}</strong></td></tr>`;
            tablaBody.innerHTML += row;
        });
        document.getElementById('tabla-nutricional').style.display = 'table';
    } else {
        document.getElementById('tabla-nutricional').style.display = 'none';
    }
    document.getElementById('modal-info-producto').style.display = 'flex';
}

function cerrarModalInfo() { document.getElementById('modal-info-producto').style.display = 'none'; }
function cerrarDetalle() { document.getElementById('modal-detalle').style.display = 'none'; }

function toggleCarrito() {
    const sidebar = document.getElementById('sidebar-carrito');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar.classList.contains('active')) volverAPedido();
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function actualizarCarritoUI() {
    const contenedor = document.getElementById('carrito-items');
    contenedor.innerHTML = '';
    let total = 0;
    
    if (carrito.length === 0) contenedor.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px">Tu carrito está vacío 🍃</p>';

    carrito.forEach((item, index) => {
        const subtotal = item.precioBase * item.cantidad;
        total += subtotal;
        
        // --- AQUÍ ESTÁ EL CAMBIO VISUAL ---
        contenedor.innerHTML += `
            <div style="display:flex; gap:10px; margin-bottom:15px; border-bottom:1px solid #f0f0f0; padding-bottom:10px;">
                <img src="${item.imagen}" style="width:50px; height:50px; object-fit:contain; border-radius:4px;">
                
                <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="font-weight:bold; font-size:0.9rem;">${item.nombre}</div>
                        <i class="fas fa-trash" style="color:#e74c3c; cursor:pointer;" onclick="eliminarItem(${index})" title="Eliminar"></i>
                    </div>

                    <div style="font-size:0.8rem; color:#666; margin-bottom:8px;">${item.observacion || ''}</div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        
                        <div style="display:flex; align-items:center; gap:5px; background:#f9f9f9; border-radius:4px; border:1px solid #eee; padding:2px;">
                            <button onclick="cambiarCantidadCarrito(${index}, -1)" style="width:24px; height:24px; border:none; background:white; cursor:pointer; font-weight:bold; border-radius:3px; color:#555;">-</button>
                            <span style="font-size:0.9rem; font-weight:bold; min-width:20px; text-align:center;">${item.cantidad}</span>
                            <button onclick="cambiarCantidadCarrito(${index}, 1)" style="width:24px; height:24px; border:none; background:white; cursor:pointer; font-weight:bold; border-radius:3px; color:var(--primary);">+</button>
                        </div>

                        <span style="color:var(--primary); font-weight:bold;">$${subtotal.toLocaleString('es-CL')}</span>
                    </div>
                </div>
            </div>`;
    });

    const totalTexto = '$' + total.toLocaleString('es-CL');
    document.getElementById('float-count').innerText = carrito.length;
    document.getElementById('float-total').innerText = totalTexto;
    const btnFlotante = document.getElementById('btn-flotante-carrito');
    if (carrito.length > 0) btnFlotante.style.display = 'flex';
    document.getElementById('sidebar-total').innerText = totalTexto;
}

function eliminarItem(index) {
    carrito.splice(index, 1);
    actualizarCarritoUI();
}

// --- 6. CHECKOUT Y ENVIO ---
function irADatos() {
    if(carrito.length === 0) { alert("Tu carrito está vacío 🍃"); return; }
    cambiarPestaña('tab-checkout', 'vista-checkout', 'btns-paso-2');
}

function irAPago() {
    // 1. Datos y Validaciones
    const nombre = document.getElementById('cliente-nombre').value;
    const fono = document.getElementById('cliente-telefono').value;
    const email = document.getElementById('cliente-email').value;

    if(!nombre || !validarTelefono(fono) || !validarEmail(email)) {
        alert("Por favor revisa tus datos."); return;
    }
    if (tipoEntrega === 'delivery' && costoEnvioSeleccionado === 0) {
        alert("Por favor selecciona tu Región para el envío."); return;
    }

    // 2. Cálculos Base (Subtotal y Promos Automáticas 2x1 / 3x2)
    let subtotal = 0; // Suma de todos los precios full
    let totalDescuentoPromos = 0; // Ahorro por 2x1 o 3x2

    carrito.forEach(i => {
        // Sumamos el precio normal al subtotal general
        subtotal += (i.precioBase * i.cantidad);

        // Buscamos el producto original en inventario para ver si tiene promo activa
        // (Usamos inventarioGlobal porque el carrito quizás no guardó el dato 'promo')
        const prodData = inventarioGlobal.find(p => p.nombre === i.nombre);
        const promo = prodData ? prodData.promo : ""; 
        
        let gratis = 0;

        if (promo === '2X1') {
            // Cada 2 unidades, 1 es gratis
            gratis = Math.floor(i.cantidad / 2);
        } else if (promo === '3X2') {
            // Cada 3 unidades, 1 es gratis
            gratis = Math.floor(i.cantidad / 3);
        }

        // Si corresponde algo gratis, sumamos ese valor al descuento
        if (gratis > 0) {
            totalDescuentoPromos += (gratis * i.precioBase);
        }
    });

    // Calculamos el monto real que pagaría el cliente antes de cupones y envío
    let montoTrasPromos = subtotal - totalDescuentoPromos;

    // 3. Lógica Envío Gratis (Validamos sobre el monto REAL, tras promos)
    let costoEnvioFinal = (tipoEntrega === 'delivery') ? costoEnvioSeleccionado : 0;
    let descuentoEnvio = 0;
    let textoEnvio = '$' + costoEnvioFinal.toLocaleString('es-CL');

    if (configGlobal.EnvioGratis && montoTrasPromos >= parseInt(configGlobal.EnvioGratis)) {
        if (tipoEntrega === 'delivery') {
            descuentoEnvio = costoEnvioFinal;
            costoEnvioFinal = 0;
            textoEnvio = `<span style="text-decoration:line-through; color:#999; font-size:0.8em;">$${descuentoEnvio.toLocaleString('es-CL')}</span> <span style="color:#27ae60; font-weight:bold;">GRATIS</span>`;
        }
    }

    // 4. Recalcular Cupón (Si es porcentaje, debe aplicarse al nuevo monto)
    if (codigoAplicado && listaCupones.length > 0) {
         const cuponData = listaCupones.find(c => c.codigo === codigoAplicado);
         // Si el cupón es porcentaje, recalculamos para ser exactos con el nuevo subtotal
         if (cuponData && cuponData.tipo === 'PORCENTAJE') {
             descuentoCupón = Math.round(montoTrasPromos * (cuponData.valor / 100));
         }
         // Si es MONTO fijo, se mantiene el valor que ya tenía
    }

    // 5. Total Final
    // Gran Total = (Subtotal - Promos) - Cupón + Envío
    let granTotal = montoTrasPromos - descuentoCupón + costoEnvioFinal;
    if (granTotal < 0) granTotal = 0; // Seguridad para no dar negativos

    // 6. Generar HTML del Resumen
    const resumenHTML = `
        <div class="resumen-container">
            <div class="resumen-fila">
                <span>Subtotal Productos:</span>
                <span>$${subtotal.toLocaleString('es-CL')}</span>
            </div>

            ${totalDescuentoPromos > 0 ? `
            <div class="resumen-fila destacado" style="color:#8e44ad; background:#f4ecf7;">
                <span>Ahorro Promo (2x1/3x2):</span>
                <span>-$${totalDescuentoPromos.toLocaleString('es-CL')}</span>
            </div>` : ''}

            <div style="margin: 15px 0; padding: 10px; background: #fff; border: 1px dashed #ccc; border-radius: 5px;">
                <div style="display:flex; gap:5px;">
                    <input type="text" id="input-cupon" placeholder="Código de descuento" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;" value="${codigoAplicado}">
                    <button onclick="aplicarCupon()" style="background:var(--primary); color:white; border:none; padding:0 15px; border-radius:4px; cursor:pointer;">Aplicar</button>
                </div>
                <p id="msg-cupon" style="font-size:0.8rem; margin-top:5px; min-height:1.2em;">
                    ${codigoAplicado ? `<span style="color:#27ae60">Cupón ${codigoAplicado} aplicado.</span>` : ''}
                </p>
            </div>

            ${descuentoCupón > 0 ? `
            <div class="resumen-fila destacado" style="color:#e74c3c; background:#fdedec;">
                <span>Descuento Cupón:</span>
                <span>-$${descuentoCupón.toLocaleString('es-CL')}</span>
            </div>` : ''}

            <div class="resumen-fila ${descuentoEnvio > 0 ? 'destacado' : ''}">
                <span>Envío (${tipoEntrega === 'delivery' ? 'Domicilio' : 'Retiro'}):</span>
                <span>${textoEnvio}</span>
            </div>
            
            ${descuentoEnvio > 0 ? `<div style="text-align:center; font-size:0.85rem; color:#27ae60; margin-bottom:10px;">¡Envío gratis aplicado! 🚚</div>` : ''}

            <div style="text-align:center;">
                <span style="color:#888; text-transform:uppercase; font-size:0.9rem;">Total a Pagar</span>
                <div class="total-gigante">$${granTotal.toLocaleString('es-CL')}</div>
            </div>
        </div>
    `;

    // 7. Inyectar en el HTML
    const divResumen = document.getElementById('area-resumen-pago');
    if (divResumen) divResumen.innerHTML = resumenHTML;

    // 8. Ocultar footer antiguo y mostrar pestaña
    const footerRow = document.getElementById('footer-total-row');
    if(footerRow) footerRow.style.display = 'none';

    cambiarPestaña('tab-pago', 'vista-pago', 'btns-paso-3');
}

function volverAPedido() { cambiarPestaña('tab-pedido', 'vista-pedido', 'btn-paso-1'); document.getElementById('footer-total-row').style.display = 'flex'; }
function volverADatos() { cambiarPestaña('tab-checkout', 'vista-checkout', 'btns-paso-2'); document.getElementById('footer-total-row').style.display = 'flex'; }

function cambiarPestaña(tabId, vistaId, btnGroupId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sidebar-body').forEach(v => v.style.display = 'none');
    document.getElementById('btn-paso-1').style.display = 'none';
    document.getElementById('btns-paso-2').style.display = 'none';
    document.getElementById('btns-paso-3').style.display = 'none';

    document.getElementById(tabId).classList.add('active');
    document.getElementById(vistaId).style.display = 'block';
    
    const btnGroup = document.getElementById(btnGroupId);
    if(btnGroup) btnGroup.style.display = 'flex';
}

async function procesarPedidoFinal() {
    const nombre = document.getElementById('cliente-nombre').value;
    const telefono = document.getElementById('cliente-telefono').value;
    const rut = document.getElementById('cliente-rut').value;
    const email = document.getElementById('cliente-email').value;
    
    let ubicacionFinal = "";
    if (tipoEntrega === 'delivery') {
        ubicacionFinal = document.getElementById('cliente-direccion').value;
        if(!ubicacionFinal) { alert("Ingresa tu dirección."); return; }
    } else {
        ubicacionFinal = document.getElementById('lugar-retiro').value;
        if(!ubicacionFinal) { alert("Selecciona punto de retiro."); return; }
    }

    let totalCalculado = 0;
    carrito.forEach(i => totalCalculado += (i.precioBase * i.cantidad));

    if (tipoEntrega === 'delivery') {
        totalCalculado += costoEnvioSeleccionado;

        // Agregar la región a la dirección para que sepas dónde mandar
        const regionNombre = document.getElementById('select-region').selectedOptions[0].text;
        ubicacionFinal = `${regionNombre} - ${ubicacionFinal}`;
    }

    const pedidoTexto = carrito.map(item => `${item.cantidad}x ${item.nombre}`).join(', ');

    const btn = document.getElementById('btn-enviar-final');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    btn.disabled = true;

    try {
        const datos = {
            cliente: nombre, email: email, rut: rut, telefono: telefono,
            entrega: tipoEntrega, ubicacion: ubicacionFinal,
            pedido: pedidoTexto, total: totalCalculado, items: carrito
        };

        const response = await fetch(SHEET_API, { method: 'POST', body: JSON.stringify(datos) });
        const respuestaJson = await response.json();

        if (respuestaJson.result === "error") {
            alert(respuestaJson.error); 
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
            return;
        }

        localStorage.setItem('ultimo_pedido_id', respuestaJson.idPedido);
        localStorage.setItem('ultimo_pedido_total', totalCalculado);

        const linkAprobar = `${SHEET_API}?action=aprobar&id=${respuestaJson.idPedido}`;
        document.getElementById('real-cliente').value = nombre;
        document.getElementById('real-id').value = respuestaJson.idPedido;
        document.getElementById('real-telefono').value = telefono;
        document.getElementById('real-direccion').value = ubicacionFinal;
        document.getElementById('real-pedido').value = pedidoTexto;
        document.getElementById('real-total').value = totalCalculado;
        if(document.getElementById('real-email')) document.getElementById('real-email').value = email;
        if(document.getElementById('real-link-gestion')) document.getElementById('real-link-gestion').value = linkAprobar;

        document.getElementById('form-real').submit();

    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión.');
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

// --- UTILIDADES ---
function validarEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function validarTelefono(input) {
    let limpio = input.replace(/\D/g, ''); 
    if (limpio.startsWith('569')) limpio = limpio.substring(2);
    return /^9\d{8}$/.test(limpio);
}
function formatoRut(input) {
    let valor = input.value.replace(/[^0-9kK]/g, "");
    if (valor.length > 1) input.value = valor.slice(0, -1) + "-" + valor.slice(-1);
    else input.value = valor;
}
function irASeccion(id) {
    const el = document.getElementById(id);
    if(el) el.scrollIntoView({ behavior: 'smooth' });
}
function setEntrega(tipo) {
    tipoEntrega = tipo; 
    const btnDelivery = document.getElementById('btn-delivery');
    const btnPickup = document.getElementById('btn-pickup');
    
    if(tipo === 'delivery') {
        btnDelivery.classList.add('active'); btnPickup.classList.remove('active');
        document.getElementById('contenedor-delivery').style.display = 'block';
        document.getElementById('contenedor-retiro').style.display = 'none';
    } else {
        btnPickup.classList.add('active'); btnDelivery.classList.remove('active');
        document.getElementById('contenedor-delivery').style.display = 'none';
        document.getElementById('contenedor-retiro').style.display = 'block';
    }
}

// CARRUSEL
let slideIndex = 0;
function mostrarSlide(n) {
    const slides = document.querySelectorAll('.slide');
    if (n >= slides.length) slideIndex = 0;
    if (n < 0) slideIndex = slides.length - 1;
    slides.forEach(s => s.classList.remove('active'));
    slides[slideIndex].classList.add('active');
}
function moverSlide(n) { mostrarSlide(slideIndex += n); }
setInterval(() => { moverSlide(1); }, 5000);

function aplicarCupon() {
    const input = document.getElementById('input-cupon');
    const mensaje = document.getElementById('msg-cupon');
    const codigoUser = input.value.toUpperCase().trim();
    
    // Buscamos si existe
    const cuponEncontrado = listaCupones.find(c => c.codigo === codigoUser);

    if (cuponEncontrado) {
        codigoAplicado = cuponEncontrado.codigo;
        
        // Calculamos el descuento basado en el subtotal actual
        let subtotal = 0;
        carrito.forEach(i => subtotal += (i.precioBase * i.cantidad));

        if (cuponEncontrado.tipo === 'PORCENTAJE') {
            descuentoCupón = Math.round(subtotal * (cuponEncontrado.valor / 100));
        } else {
            descuentoCupón = cuponEncontrado.valor;
        }

        mensaje.style.color = "#27ae60";
        mensaje.innerText = `¡Cupón ${codigoUser} aplicado! Ahorras $${descuentoCupón.toLocaleString('es-CL')}`;
        
        // Recargamos la vista de pago para que se actualicen los números
        irAPago(); 
    } else {
        descuentoCupón = 0;
        codigoAplicado = "";
        mensaje.style.color = "red";
        mensaje.innerText = "Cupón inválido o expirado.";
        irAPago(); // Recargamos para borrar cualquier descuento previo
    }
}

async function cargarConfiguracion() {
    try {
        const response = await fetch(`${SHEET_API}?action=obtenerConfig`);
        configGlobal = await response.json();

        // Si hay mensaje de barra activo, lo mostramos
        if (configGlobal.MensajeBarra) {
            const barra = document.getElementById('promo-bar');
            document.getElementById('promo-texto').innerText = configGlobal.MensajeBarra;
            barra.style.display = 'block';
        }
    } catch (e) { console.error("Error config:", e); }
}

// INICIALIZAR
document.addEventListener("DOMContentLoaded", () => {
    cargarProductos();
    cargarTarifas();
    cargarConfiguracion();
    cargarCupones();
});

async function cargarCupones() {
    try {
        const response = await fetch(`${SHEET_API}?action=obtenerCupones`);
        listaCupones = await response.json();
    } catch (e) { console.error("Error cupones:", e); }
}

async function solicitarReservaStock() {
    // Mostramos un loader o cambiamos el texto del botón
    const btn = document.getElementById('btn-ir-pago'); // Asumiendo que tienes este ID en el botón de ir a pago
    const textoOriginal = btn ? btn.innerText : "";
    if(btn) { btn.innerText = "Verificando Stock..."; btn.disabled = true; }

    const datosReserva = {
        accion: "reservar",
        idSesion: SESSION_ID,
        items: carrito.map(p => ({ nombre: p.nombre, cantidad: p.cantidad }))
    };

    try {
        const response = await fetch(SHEET_API, {
            method: 'POST',
            body: JSON.stringify(datosReserva)
        });
        const resultado = await response.json();

        if (resultado.result === "success") {
            // Éxito: Pasamos a la vista de pago
            irAPago();
        } else {
            // Error: Alguien ganó el stock
            alert("⚠️ " + resultado.error);
        }
    } catch (e) {
        console.error(e);
        alert("Error de conexión. Intenta de nuevo.");
    } finally {
        if(btn) { btn.innerText = textoOriginal; btn.disabled = false; }
    }
}