<!--
The notes for the release being prepared. Rewrite this file before bumping the
version: `release.yml` reads it at build time and the action copies it into
`latest.json`, which is what an installed copy shows in Ajustes. Notes added to
the release page afterwards never reach anyone who already has the app.
-->

## Novedades

- **Previstos: lo que sabés que se viene.**

  Una compra grande en noviembre, la VTV de este año, un bono puntual. Se cargan
  en Compromisos → Previstos, aparecen en la proyección de los próximos meses y,
  cuando llega la fecha, los confirmás o los descartás. Nada se registra solo.

  Van aparte de «Ya comprometido», que sigue mostrando solo cuotas, préstamos y
  recurrentes. Lo que firmaste y lo que pensás que va a pasar son dos cosas
  distintas, y sumarlas haría que ninguna de las dos fuera confiable.

  Para lo que se repite todos los meses o todos los años siguen estando las
  recurrentes: Previstos es para lo que pasa una sola vez.

- **Cierres: cómo terminó cada mes, en PDF.**

  Una sección nueva en el panel lateral con todos los meses cerrados. Cada uno se
  guarda como PDF con los ingresos y gastos por categoría, cuánto pesa cada una
  sobre el total, y la comparación contra el mes anterior y contra el mismo mes
  del año pasado.

  Un solo documento por mes, con todas las monedas que se movieron: si tuviste
  gastos en pesos y en dólares, los dos están, cada uno con sus propias
  comparaciones y sin sumarse nunca entre sí. La moneda que no se movió ese mes
  no ocupa espacio.

- **Aviso cuando el cierre está listo.**

  Al terminar el mes, Estadísticas te avisa que el resumen está disponible, con
  el botón para guardarlo ahí mismo. También llega como notificación del sistema,
  una sola vez. Si lo dejás pasar no se pierde: el mes queda en Cierres para
  siempre.

## Arreglos

- **Los informes largos ya no se imprimían cortados.** Todo lo que pasaba de un
  alto de ventana salía en blanco, sin ninguna señal de que faltaba algo. Ahora
  el documento ocupa las páginas que necesite.

- **Cambiar de Gasto a Ingreso en una recurrente ya no deja la categoría vieja.**
  Se podía guardar un ingreso clasificado con una categoría de gastos.

- **Las tarjetas vacías se leen mejor.** El texto que explica por qué no hay nada
  va debajo del título, y el botón para crear el primero abajo de todo, en vez de
  los dos sueltos en el medio.

## Instalación

Bajá el `.dmg` si estás en macOS, o el `.msi` o el `.exe` si estás en Windows.

La app no está firmada con certificado de Apple ni de Microsoft, así que la
primera vez el sistema la va a bloquear. En macOS: Ajustes del Sistema →
Privacidad y seguridad → «Abrir igualmente». En Windows: Más información →
Ejecutar de todas formas.
