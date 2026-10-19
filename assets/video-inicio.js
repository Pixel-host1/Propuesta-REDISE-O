/* =========================================================
   VIDEO DE INICIO (YouTube Short en marco de celular)
   - Se carga solo cuando el usuario se acerca a la sección.
   - Se reproduce en bucle, sin sonido (requisito de los navegadores
     para la reproducción automática). El usuario puede activar el audio.
   - Se pausa al salir de la vista o cambiar de pestaña, y continúa
     al volver. Si el usuario lo pausó a mano, no se reanuda solo.
========================================================= */
(function () {
    'use strict';

    var cont = document.getElementById('yt-player');
    if (!cont || !('IntersectionObserver' in window)) return;

    var VIDEO_ID = cont.getAttribute('data-video');
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var player = null;
    var listo = false;
    var visible = false;
    var pausaAutomatica = false;  // la pausa la hicimos nosotros
    var pausadoPorUsuario = false;

    function estado() { return player && player.getPlayerState ? player.getPlayerState() : -1; }

    function reproducir() {
        if (!listo || pausadoPorUsuario || reduceMotion || document.hidden) return;
        player.playVideo();
    }

    function pausar() {
        if (!listo) return;
        var s = estado();
        if (s === 1 || s === 3) { // reproduciendo o cargando
            pausaAutomatica = true;
            player.pauseVideo();
        }
    }

    function crearReproductor() {
        player = new YT.Player('yt-player', {
            host: 'https://www.youtube-nocookie.com',
            videoId: VIDEO_ID,
            width: '100%',
            height: '100%',
            playerVars: {
                autoplay: 0,
                mute: 1,
                loop: 1,
                playlist: VIDEO_ID,
                playsinline: 1,
                rel: 0,
                modestbranding: 1,
                controls: 1
            },
            events: {
                onReady: function () {
                    listo = true;
                    player.mute();
                    if (visible) reproducir();
                },
                onStateChange: function (e) {
                    if (e.data === 0) {            // terminó: volver a empezar
                        player.seekTo(0, true);
                        player.playVideo();
                    } else if (e.data === 1) {     // reproduciendo
                        pausadoPorUsuario = false;
                    } else if (e.data === 2) {     // pausado
                        if (pausaAutomatica) pausaAutomatica = false;
                        else pausadoPorUsuario = true;
                    }
                }
            }
        });
    }

    // 1) Cargar la API de YouTube solo cuando el video se acerca a la pantalla
    var cargado = false;
    var cerca = new IntersectionObserver(function (entradas) {
        if (cargado || !entradas.some(function (e) { return e.isIntersecting; })) return;
        cargado = true;
        cerca.disconnect();
        var anterior = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function () {
            if (typeof anterior === 'function') anterior();
            crearReproductor();
        };
        if (window.YT && window.YT.Player) { crearReproductor(); return; }
        var s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        s.async = true;
        document.head.appendChild(s);
    }, { rootMargin: '400px 0px' });
    cerca.observe(cont.parentNode);

    // 2) Reproducir / pausar según la visibilidad (al menos 50 % del video en pantalla)
    var vista = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
            visible = e.isIntersecting && e.intersectionRatio >= 0.5;
            if (visible) reproducir(); else pausar();
        });
    }, { threshold: [0, 0.5, 1] });
    vista.observe(cont.parentNode);

    // 3) Pausar si el usuario cambia de pestaña o minimiza
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) pausar();
        else if (visible) reproducir();
    });
})();