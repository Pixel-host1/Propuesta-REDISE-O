/* =========================================================
   LIBRO DE RECLAMACIONES VIRTUAL - ShowTech Solutions
   ---------------------------------------------------------
   Envío: FormSubmit (https://formsubmit.co), sin servidor propio.
   - La hoja llega al correo de la empresa (DESTINO).
   - El consumidor recibe una copia en su correo (_cc).
   IMPORTANTE: el primer envío dispara un correo de activación a
   DESTINO. Hay que confirmarlo una sola vez para que funcione.
========================================================= */
(function () {
    'use strict';

    var DESTINO = 'showtechsolutionssac@gmail.com';
    var ENDPOINT = 'https://formsubmit.co/ajax/' + DESTINO;

    var form = document.getElementById('lr-form');
    if (!form) return;

    var $ = function (id) { return document.getElementById(id); };
    var errorBox = $('lr-error');
    var submitBtn = $('lr-submit');
    var menor = $('lr-menor');
    var menorBox = $('lr-minor-box');
    var tipoDoc = $('lr-tipodoc');
    var numDoc = $('lr-numdoc');

    function pad(n) { return String(n).padStart(2, '0'); }
    function fechaLarga(d) {
        return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
            ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    function numeroHoja(d) {
        return 'LR-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
            '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    }

    $('lr-fecha').textContent = fechaLarga(new Date());

    // Menor de edad: muestra y exige los datos del representante
    menor.addEventListener('change', function () {
        menorBox.hidden = !menor.checked;
        $('lr-apoderado').required = menor.checked;
        $('lr-apoderado-doc').required = menor.checked;
    });

    // Reglas del número de documento según el tipo
    function reglaDocumento() {
        var t = tipoDoc.value;
        if (t === 'DNI') { numDoc.pattern = '\\d{8}'; numDoc.title = 'El DNI tiene 8 dígitos'; numDoc.maxLength = 8; numDoc.inputMode = 'numeric'; }
        else if (t === 'RUC') { numDoc.pattern = '\\d{11}'; numDoc.title = 'El RUC tiene 11 dígitos'; numDoc.maxLength = 11; numDoc.inputMode = 'numeric'; }
        else { numDoc.pattern = '[A-Za-z0-9]{6,15}'; numDoc.title = 'Entre 6 y 15 letras o números'; numDoc.maxLength = 15; numDoc.inputMode = 'text'; }
    }
    tipoDoc.addEventListener('change', reglaDocumento);
    reglaDocumento();

    function mostrarError(html) {
        errorBox.innerHTML = html;
        errorBox.hidden = false;
        errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function valor(name) {
        var el = form.elements[name];
        if (!el) return '';
        if (el instanceof RadioNodeList) return el.value;
        return (el.value || '').trim();
    }

    function recolectar(numero, fecha) {
        var datos = [
            ['Hoja de reclamación N.º', numero],
            ['Fecha y hora', fecha],
            ['Proveedor', 'ShowTech Solutions'],
            ['Tipo', valor('tipo_reclamacion')],
            ['Nombres y apellidos', valor('nombres') + ' ' + valor('apellidos')],
            ['Documento', valor('tipo_documento') + ' ' + valor('numero_documento')],
            ['Domicilio', valor('domicilio')],
            ['Teléfono', valor('telefono') || '—'],
            ['Correo electrónico', valor('email')]
        ];
        if (menor.checked) {
            datos.push(['Menor de edad', 'Sí']);
            datos.push(['Padre, madre o representante', valor('apoderado_nombre') + ' (' + valor('apoderado_documento') + ')']);
            if (valor('apoderado_email')) datos.push(['Correo del representante', valor('apoderado_email')]);
        }
        datos.push(
            ['Bien contratado', valor('tipo_bien')],
            ['Descripción', valor('descripcion_bien')],
            ['Monto reclamado', valor('monto') ? 'S/ ' + Number(valor('monto')).toFixed(2) : '—'],
            ['Fecha del servicio o compra', valor('fecha_servicio') || '—'],
            ['Comprobante de pago', valor('comprobante') || 'No indicado'],
            ['Detalle', valor('detalle')],
            ['Pedido', valor('pedido')]
        );
        return datos;
    }

    function pintarCopia(datos) {
        var dl = $('lr-copy-list');
        dl.innerHTML = '';
        datos.forEach(function (par) {
            var dt = document.createElement('dt');
            var dd = document.createElement('dd');
            dt.textContent = par[0];
            dd.textContent = par[1];
            dl.appendChild(dt);
            dl.appendChild(dd);
        });
    }

    function textoPlano(datos) {
        return datos.map(function (p) { return p[0] + ': ' + p[1]; }).join('\n');
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        errorBox.hidden = true;

        if (form.elements._honey.value) return; // bot

        if (!form.checkValidity()) {
            var primero = form.querySelector(':invalid');
            form.reportValidity();
            if (primero) primero.focus();
            return;
        }

        var ahora = new Date();
        var numero = numeroHoja(ahora);
        var fecha = fechaLarga(ahora);
        var datos = recolectar(numero, fecha);

        var payload = {};
        datos.forEach(function (p) { payload[p[0]] = p[1]; });
        payload._subject = 'Libro de Reclamaciones ' + numero + ' (' + valor('tipo_reclamacion') + ')';
        payload._cc = valor('email');
        payload._replyto = valor('email');
        payload._template = 'table';
        payload._captcha = 'false';

        submitBtn.disabled = true;
        submitBtn.firstChild.textContent = 'ENVIANDO… ';

        fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
            .then(function (res) {
                if (!res.ok || String(res.j.success) !== 'true') throw new Error(res.j.message || 'Error de envío');
                pintarCopia(datos);
                $('lr-result-num').textContent = numero;
                $('lr-form-wrap').hidden = true;
                var result = $('lr-result');
                result.hidden = false;
                result.focus();
                window.scrollTo({ top: result.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
            })
            .catch(function () {
                var cuerpo = encodeURIComponent(textoPlano(datos));
                var asunto = encodeURIComponent('Libro de Reclamaciones ' + numero);
                mostrarError('No pudimos enviar tu hoja de reclamación en este momento. Tus datos no se han perdido: ' +
                    '<a href="mailto:' + DESTINO + '?subject=' + asunto + '&body=' + cuerpo + '">envíala por correo con un clic</a> ' +
                    'o inténtalo nuevamente en unos minutos.');
            })
            .finally(function () {
                submitBtn.disabled = false;
                submitBtn.firstChild.textContent = 'ENVIAR HOJA DE RECLAMACIÓN ';
            });
    });

    $('lr-print').addEventListener('click', function () { window.print(); });
})();