// --- VARIABLES GLOBALES ---
let carrito = [];
let productoTemporal = {};
let tipoEntrega = 'delivery'; 
let inventarioGlobal = []; 
let tarifasEnvio = []; // Guardará la lista de precios
let costoEnvioSeleccionado = 0; // Guardará el costo actual (0, 4000, 7500...)

// URL de Sheet (API)
const SHEET_API = 'https://script.google.com/macros/s/AKfycbw-5mkT1ERyv40a0dQJIWDl_lQKBqXiz6HwAV5Q7io6_bueuW176J5ejqMiKJyqymV0aA/exec';


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
    
    // --- MEJORA BUSCADOR: Guardamos todo el texto buscable aquí ---
    // Unimos Nombre + Categoría + Descripción en una sola frase oculta
    const textoBuscable = `${p.nombre} ${p.categoria} ${p.descripcion}`;
    div.setAttribute('data-busqueda', textoBuscable); 
    // -------------------------------------------------------------

    let botonHTML = '';
    if (p.stock > 0) {
        botonHTML = `<button class="btn-agregar" onclick="prepararCompra('${p.nombre}')">
                        <i class="fas fa-plus"></i> Agregar
                     </button>`;
    } else {
        botonHTML = `<button class="btn-agregar agotado" disabled>Agotado</button>`;
    }

    const nombreSafe = p.nombre.replace(/'/g, "\\'");
    const descSafe = p.descripcion ? p.descripcion.replace(/'/g, "\\'") : '';
    const nutriSafe = p.nutricion ? p.nutricion.replace(/'/g, "\\'") : '';

    div.innerHTML = `
        <div class="product-image" onclick="abrirModalInfo('${nombreSafe}', '${descSafe}', '${nutriSafe}')">
            <img src="${p.imagen}" alt="${p.nombre}">
        </div>
        <div class="product-info">
            <h3>${p.nombre}</h3>
            <p class="price">$${p.precio.toLocaleString('es-CL')}</p>
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
    const producto = inventarioGlobal.find(p => p.nombre === nombreProducto);
    if (producto) {
        abrirDetalle(producto.nombre, producto.precio, producto.imagen, producto.stock);
    }
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
    let nuevaCantidad = productoTemporal.cantidad + delta;
    let stockMaximo = productoTemporal.stockMax;

    // Verificar carrito actual
    let cantidadEnCarrito = 0;
    for (let item of carrito) {
        if (item.nombre === productoTemporal.nombre) cantidadEnCarrito += item.cantidad;
    }
    
    let limiteReal = stockMaximo - cantidadEnCarrito;

    if (nuevaCantidad >= 1 && nuevaCantidad <= limiteReal) {
        productoTemporal.cantidad = nuevaCantidad;
        document.getElementById('det-cantidad').innerText = productoTemporal.cantidad;
        actualizarTotalModal();
    } else if (nuevaCantidad > limiteReal) {
        alert(`Stock limitado. Máximo disponible: ${stockMaximo}`);
    }
}

function actualizarTotalModal() {
    const total = productoTemporal.precioBase * productoTemporal.cantidad;
    document.getElementById('det-total-calc').innerText = '$' + total.toLocaleString('es-CL');
}

function confirmarAgregarAlCarrito() {
    let stockMaximo = productoTemporal.stockMax;
    let cantidadEnCarrito = 0;
    for (let item of carrito) {
        if (item.nombre === productoTemporal.nombre) cantidadEnCarrito += (item.cantidad || 1);
    }

    if ((cantidadEnCarrito + productoTemporal.cantidad) > stockMaximo) {
        alert(`No hay suficiente stock. Disponibles: ${stockMaximo}`);
        return;
    }

    productoTemporal.observacion = document.getElementById('det-obs').value;
    carrito.push({ ...productoTemporal });
    actualizarCarritoUI();
    document.getElementById('modal-detalle').style.display = 'none';
    toggleCarrito(); 
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
        contenedor.innerHTML += `
            <div style="display:flex; gap:10px; margin-bottom:15px; border-bottom:1px solid #f0f0f0; padding-bottom:10px;">
                <img src="${item.imagen}" style="width:50px; height:50px; object-fit:contain; border-radius:4px;">
                <div style="flex:1;">
                    <div style="font-weight:bold; font-size:0.9rem;">${item.cantidad}x ${item.nombre}</div>
                    <div style="font-size:0.8rem; color:#666;">${item.observacion || ''}</div>
                    <div style="display:flex; justify-content:space-between; margin-top:5px;">
                        <span style="color:var(--primary); font-weight:bold;">$${subtotal.toLocaleString('es-CL')}</span>
                        <i class="fas fa-trash" style="color:#e74c3c; cursor:pointer;" onclick="eliminarItem(${index})"></i>
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
    const nombre = document.getElementById('cliente-nombre').value;
    const fono = document.getElementById('cliente-telefono').value;
    const email = document.getElementById('cliente-email').value;

    // Validaciones
    if(!nombre || !validarTelefono(fono) || !validarEmail(email)) {
        alert("Por favor revisa tus datos."); return;
    }

    // Validación de Envío
    if (tipoEntrega === 'delivery' && costoEnvioSeleccionado === 0) {
        alert("Por favor selecciona tu Región para el envío.");
        return;
    }

    // CALCULO TOTAL FINAL
    let subtotal = 0;
    carrito.forEach(i => subtotal += (i.precioBase * i.cantidad));

    // Si es retiro, el envío es 0. Si es delivery, usamos el seleccionado.
    const envioFinal = (tipoEntrega === 'delivery') ? costoEnvioSeleccionado : 0;
    const granTotal = subtotal + envioFinal;
    document.getElementById('resumen-subtotal').innerText = '$' + subtotal.toLocaleString('es-CL');
    document.getElementById('resumen-envio').innerText = '$' + envioFinal.toLocaleString('es-CL');
    document.getElementById('total-final-pago').innerText = '$' + granTotal.toLocaleString('es-CL');
    // Mostrar en el resumen (Paso 3)
    document.getElementById('total-final-pago').innerText = '$' + granTotal.toLocaleString('es-CL');

    // (Opcional) Mostrar desglose
    // Puedes crear un elemento <p id="desglose-pago"></p> en el HTML si quieres mostrar "Subtotal + Envío"

    cambiarPestaña('tab-pago', 'vista-pago', 'btns-paso-3');
    document.getElementById('footer-total-row').style.display = 'none'; 
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

// INICIALIZAR
document.addEventListener("DOMContentLoaded", () => {
    cargarProductos();
    cargarTarifas();
});