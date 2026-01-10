// --- VARIABLES GLOBALES ---
let carrito = [];
let productoTemporal = {};
let tipoEntrega = 'delivery'; 

// --- STOCK ----
const STOCK = {
    'Sol del Valle 250g': 999,
    'Sombra del Valle 500g': 999,
    'Pack Sol & Sombra': 999,
    'Miel de Ulmo 1kg': 999 
};

// URL de Sheet (Para el Excel) 
const SHEET_API = 'https://script.google.com/macros/s/AKfycbxVRT_tKs0pmO49TRSmInOQwUG4__mYplb89KlIryRNUdo2An2POl8wkWTOc3DBWP8urA/exec';

// --- ARREGLO ESC LISTENER ---
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        document.getElementById('lightbox').style.display = 'none';
        document.getElementById('modal-detalle').style.display = 'none';
        
        const sidebar = document.getElementById('sidebar-carrito');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar && sidebar.classList.contains('active')) {
            toggleCarrito();
        }
    }
});

// --- LÓGICA DE ENTREGA (CORREGIDA) ---
function setEntrega(tipo) {
    tipoEntrega = tipo; // Guardamos la elección en la variable global
    
    // 1. Actualizar colores de los botones
    const btnDelivery = document.getElementById('btn-delivery');
    const btnPickup = document.getElementById('btn-pickup');
    
    if(tipo === 'delivery') {
        btnDelivery.classList.add('active');
        btnPickup.classList.remove('active');
    } else {
        btnPickup.classList.add('active');
        btnDelivery.classList.remove('active');
    }

    // 2. Mostrar/Ocultar los contenedores correctos
    // Si es delivery, mostramos la dirección y ocultamos el select de retiro
    const divDelivery = document.getElementById('contenedor-delivery');
    const divRetiro = document.getElementById('contenedor-retiro');

    if(tipo === 'delivery') {
        divDelivery.style.display = 'block';
        divRetiro.style.display = 'none';
    } else {
        divDelivery.style.display = 'none';
        divRetiro.style.display = 'block';
    }
}

// --- VALIDACIONES DE RUT (FALTABA ESTA FUNCIÓN) ---
function formatoRut(input) {
    // Eliminar todo lo que no sea número o K
    let valor = input.value.replace(/[^0-9kK]/g, "");
    
    // Si hay más de un caracter, poner el guión antes del último
    if (valor.length > 1) {
        let cuerpo = valor.slice(0, -1);
        let dv = valor.slice(-1);
        input.value = cuerpo + "-" + dv;
    } else {
        input.value = valor;
    }
}

function validarRut(rut) {
    if (!rut || rut.length < 3) return false;
    let valor = rut.replace(/\./g, '').replace(/-/g, '');
    let cuerpo = valor.slice(0, -1);
    let dv = valor.slice(-1).toUpperCase();
    
    // Validar largo mínimo
    if (cuerpo.length < 7) return false; 
    
    let suma = 0;
    let multiplo = 2;
    for (let i = 1; i <= cuerpo.length; i++) {
        let index = multiplo * valor.charAt(cuerpo.length - i);
        suma = suma + index;
        if (multiplo < 7) { multiplo = multiplo + 1; } else { multiplo = 2; }
    }
    let dvEsperado = 11 - (suma % 11);
    dvEsperado = (dvEsperado == 11) ? "0" : ((dvEsperado == 10) ? "K" : dvEsperado.toString());
    
    return dv == dvEsperado;
}


// --- NAVEGACIÓN ---
function irASeccion(id) {
    const elemento = document.getElementById(id);
    if(elemento) { elemento.scrollIntoView({ behavior: 'smooth' }); }
}

function irADatos() {
    if(carrito.length === 0) { alert("Tu carrito está vacío 🍃"); return; }
    cambiarPestaña('tab-checkout', 'vista-checkout', 'btns-paso-2');
}

function irAPago() {
    const nombre = document.getElementById('cliente-nombre').value;
    const fono = document.getElementById('cliente-telefono').value;
    const rut = document.getElementById('cliente-rut').value;
    
    // Validaciones antes de pasar al pago
    if(!nombre || !fono) { 
        alert("Por favor completa tu nombre y teléfono."); 
        return; 
    }
    if (rut && !validarRut(rut)) { // Si escribió RUT, validarlo
        alert("El RUT ingresado no es válido.");
        return;
    }

    let total = 0;
    carrito.forEach(i => total += (i.precioBase * i.cantidad));
    document.getElementById('total-final-pago').innerText = '$' + total.toLocaleString('es-CL');

    cambiarPestaña('tab-pago', 'vista-pago', 'btns-paso-3');
    document.getElementById('footer-total-row').style.display = 'none'; 
}

function volverAPedido() { 
    cambiarPestaña('tab-pedido', 'vista-pedido', 'btn-paso-1'); 
    document.getElementById('footer-total-row').style.display = 'flex';
}
function volverADatos() { 
    cambiarPestaña('tab-checkout', 'vista-checkout', 'btns-paso-2');
    document.getElementById('footer-total-row').style.display = 'flex';
}

function cambiarPestaña(tabId, vistaId, btnGroupId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sidebar-body').forEach(v => v.style.display = 'none');
    
    document.getElementById('btn-paso-1').style.display = 'none';
    document.getElementById('btns-paso-2').style.display = 'none';
    document.getElementById('btns-paso-3').style.display = 'none';

    document.getElementById(tabId).classList.add('active');
    document.getElementById(vistaId).style.display = 'block';
    
    const btnGroup = document.getElementById(btnGroupId);
    if(btnGroup) btnGroup.style.display = (btnGroupId === 'btns-paso-2' || btnGroupId === 'btns-paso-3') ? 'flex' : 'block';
}

// --- PROCESO FINAL ---
// BUSCA ESTA FUNCIÓN Y REEMPLÁZALA COMPLETAMENTE
async function procesarPedidoFinal() {
    // 1. OBTENER DATOS
    const nombre = document.getElementById('cliente-nombre').value;
    const telefono = document.getElementById('cliente-telefono').value;
    const rut = document.getElementById('cliente-rut').value;
    const email = document.getElementById('cliente-email') ? document.getElementById('cliente-email').value : '';
    
    // Ubicación
    let ubicacionFinal = "";
    if (tipoEntrega === 'delivery') {
        ubicacionFinal = document.getElementById('cliente-direccion').value;
        if(!ubicacionFinal) { alert("Por favor ingresa tu dirección."); return; }
    } else {
        ubicacionFinal = document.getElementById('lugar-retiro').value;
        if(!ubicacionFinal) { alert("Por favor selecciona un punto de retiro."); return; }
    }

    // VALIDACIONES BÁSICAS
    if (!nombre || !telefono) {
        alert("Por favor completa los datos obligatorios.");
        return;
    }

    // Calcular total
    let totalCalculado = 0;
    carrito.forEach(i => totalCalculado += (i.precioBase * i.cantidad));
    const pedidoTexto = carrito.map(item => `${item.cantidad}x ${item.nombre}`).join(', ');

    // UI: Bloquear botón para que no hagan doble click
    const btn = document.getElementById('btn-enviar-final');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando Stock...';
    btn.disabled = true;

    try {
        // A. ENVIAR A GOOGLE APPS SCRIPT
        const datos = {
            cliente: nombre,
            email: email,
            rut: rut,
            telefono: telefono,
            entrega: tipoEntrega,
            ubicacion: ubicacionFinal,
            pedido: pedidoTexto,
            total: totalCalculado,
            items: carrito
        };

        const response = await fetch(SHEET_API, {
            method: 'POST',
            body: JSON.stringify(datos)
        });
        
        const respuestaJson = await response.json();

        // --- AQUÍ ESTÁ LA MAGIA: DETECTAR ERROR DE STOCK ---
        if (respuestaJson.result === "error") {
            // Si Google dice que no hay stock, mostramos alerta y detenemos todo
            alert(respuestaJson.error); 
            
            // Reactivar botón
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
            return; // ¡NO SEGUIR!
        }

        // Si llegamos aquí, es "success"
        const idRecibido = respuestaJson.idPedido;
        console.log("Pedido creado:", idRecibido);

        // B. GUARDAR EN MEMORIA PARA LA PÁGINA DE GRACIAS
        localStorage.setItem('ultimo_pedido_id', idRecibido);
        localStorage.setItem('ultimo_pedido_total', totalCalculado);

        // C. (OPCIONAL) FORMULARIO DE RESPALDO
        const linkAprobar = `${SHEET_API}?action=aprobar&id=${idRecibido}`;

        // Solo lo enviamos si el script funcionó bien
        document.getElementById('real-cliente').value = nombre;
        document.getElementById('real-id').value = idRecibido;
        document.getElementById('real-telefono').value = telefono;
        document.getElementById('real-direccion').value = ubicacionFinal;
        document.getElementById('real-pedido').value = pedidoTexto;
        document.getElementById('real-total').value = totalCalculado;
        
        // D. REDIRIGIR A GRACIAS (O enviar el form oculto y luego redirigir)
        // Como ya guardaste en Google, podemos ir directo a gracias.html
        if(document.getElementById('real-email')) {
             document.getElementById('real-email').value = email; 
        }
        if(document.getElementById('real-link-gestion')) {
             document.getElementById('real-link-gestion').value = linkAprobar;
        }
        // O si quieres mantener el correo de respaldo de FormSubmit:
        document.getElementById('form-real').submit();

    } catch (error) {
        console.error('Error:', error);
        alert('Hubo un problema de conexión con el servidor. Por favor intenta de nuevo.');
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

// --- BUSCADOR ---
function filtrarProductos() {
    const input = document.getElementById('buscador');
    if (!input) return;
    const filtro = input.value.toUpperCase().trim();
    const items = document.getElementsByClassName('producto');
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const tituloTag = item.querySelector('h3');
        if (tituloTag) {
            const textoTitulo = tituloTag.innerText || tituloTag.textContent;
            item.style.display = (textoTitulo.toUpperCase().indexOf(filtro) > -1) ? "" : "none";
        }
    }
}
document.addEventListener("DOMContentLoaded", function() {
    const inputBuscador = document.getElementById('buscador');
    if(inputBuscador) inputBuscador.addEventListener('keyup', filtrarProductos);
});

// --- FUNCIONES DEL CARRITO Y MODAL ---
function abrirDetalle(nombre, precio, imagen) {
    productoTemporal = { nombre, precioBase: precio, imagen, cantidad: 1, observacion: '' };
    document.getElementById('det-titulo').innerText = nombre;
    document.getElementById('det-precio').innerText = '$' + precio.toLocaleString('es-CL');
    document.getElementById('det-img').src = imagen;
    document.getElementById('det-cantidad').innerText = 1;
    document.getElementById('det-obs').value = ''; 
    actualizarTotalModal();
    document.getElementById('modal-detalle').style.display = 'flex';
}

function cerrarDetalle() { document.getElementById('modal-detalle').style.display = 'none'; }

function cambiarCantidad(delta) {
    let nuevaCantidad = productoTemporal.cantidad + delta;
    let nombre = productoTemporal.nombre;
    let stockMaximo = STOCK[nombre] !== undefined ? STOCK[nombre] : 100;

    // Calculamos cuánto ya hay en el carrito para descontarlo del límite
    let cantidadEnCarrito = 0;
    for (let item of carrito) {
        if (item.nombre === nombre) {
            cantidadEnCarrito += item.cantidad;
        }
    }
    
    let limiteReal = stockMaximo - cantidadEnCarrito;

    // Validación: No bajar de 1 y No subir del stock disponible
    if (nuevaCantidad >= 1 && nuevaCantidad <= limiteReal) {
        productoTemporal.cantidad = nuevaCantidad;
        document.getElementById('det-cantidad').innerText = productoTemporal.cantidad;
        actualizarTotalModal();
    } else if (nuevaCantidad > limiteReal) {
        alert(`No puedes agregar más. Stock máximo: ${stockMaximo} (Tienes ${cantidadEnCarrito} en el carrito).`);
    }
}

function actualizarTotalModal() {
    const total = productoTemporal.precioBase * productoTemporal.cantidad;
    document.getElementById('det-total-calc').innerText = '$' + total.toLocaleString('es-CL');
}

function confirmarAgregarAlCarrito() {
    let nombre = productoTemporal.nombre;
    
    // Si no está en la lista STOCK, asumimos que hay 100 disponibles
    let stockMaximo = STOCK[nombre] !== undefined ? STOCK[nombre] : 100;
    
    // 1. Contar cuántos ya tienes en el carrito
    let cantidadEnCarrito = 0;
    for (let item of carrito) {
        if (item.nombre === nombre) {
            cantidadEnCarrito += (item.cantidad || 1);
        }
    }

    // 2. Verificar: Lo que ya tengo + Lo que quiero agregar ahora
    let cantidadTotal = cantidadEnCarrito + productoTemporal.cantidad;

    if (cantidadTotal > stockMaximo) {
        // Calculamos cuántos le quedan disponibles para agregar
        let disponibles = stockMaximo - cantidadEnCarrito;
        if (disponibles <= 0) {
            alert(`¡Ya tienes todo el stock disponible de ${nombre} en tu carrito!`);
        } else {
            alert(`Solo quedan ${stockMaximo} unidades en total. Ya tienes ${cantidadEnCarrito} en el carrito, así que solo puedes agregar ${disponibles} más.`);
        }
        return; // Detiene la función
    }

    // Si pasa la validación, guarda
    productoTemporal.observacion = document.getElementById('det-obs').value;
    carrito.push({ ...productoTemporal });
    actualizarCarritoUI();
    cerrarDetalle();
    toggleCarrito(); 
}

// --- SIDEBAR UI ---
function toggleCarrito() {
    const sidebar = document.getElementById('sidebar-carrito');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (!sidebar.classList.contains('active')) {
        volverAPedido();
    }
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function actualizarCarritoUI() {
    const contenedor = document.getElementById('carrito-items');
    contenedor.innerHTML = '';
    let total = 0;
    
    if (carrito.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px">Tu carrito está vacío 🍃</p>';
    }

    carrito.forEach((item, index) => {
        const subtotal = item.precioBase * item.cantidad;
        total += subtotal;
        contenedor.innerHTML += `
            <div style="display:flex; gap:10px; margin-bottom:15px; border-bottom:1px solid #f0f0f0; padding-bottom:10px;">
                <img src="${item.imagen}" style="width:60px; height:60px; object-fit:contain; border:1px solid #eee; border-radius:6px;">
                <div style="flex:1;">
                    <div style="font-weight:600; font-size:0.9rem;">${item.cantidad}x ${item.nombre}</div>
                    <div style="font-size:0.8rem; color:#888;">${item.observacion || ''}</div>
                    <div style="display:flex; justify-content:space-between; margin-top:5px;">
                        <span style="color:var(--primary); font-weight:bold;">$${subtotal.toLocaleString('es-CL')}</span>
                        <i class="fas fa-trash" style="color:#ff4757; cursor:pointer;" onclick="eliminarItem(${index})"></i>
                    </div>
                </div>
            </div>
        `;
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

// --- EXTRAS VISUALES ---
function verFotoGrande(src) { document.getElementById('lightbox-img').src = src; document.getElementById('lightbox').style.display = 'flex'; }
function cerrarFotoGrande() { document.getElementById('lightbox').style.display = 'none'; }

window.onscroll = function() {
    const btn = document.getElementById('btn-subir');
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
        btn.style.display = "flex";
    } else {
        btn.style.display = "none";
    }
};