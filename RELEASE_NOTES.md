<!--
The notes for the release being prepared. Rewrite this file before bumping the
version: `release.yml` reads it at build time and the action copies it into
`latest.json`, which is what an installed copy shows in Ajustes. Notes added to
the release page afterwards never reach anyone who already has the app.
-->

## Novedades

- **Estadísticas ahora son dos pestañas: Resumen y Análisis.**

  Era una sola pantalla con once bloques apilados. El Resumen responde «cómo
  vengo»: tu balance, el mes en curso, lo que ya está comprometido y los últimos
  movimientos. El Análisis responde «qué pasó»: filtros, totales del período y
  los gráficos.

- **El balance se muestra en pesos, en dólares y unificado**, con la cotización
  usada debajo.

  El total consolidado solo era exacto y engañoso a la vez: quien vive en pesos
  y guarda dólares aparte sabe que ese número no es lo que puede gastar esta
  semana. Ahora son dos bolsillos, mostrados como dos.

- **Los ingresos y gastos siempre tienen un período.**

  Antes, sin filtros, sumaban todo el histórico. Un balance acumulado desde
  siempre significa algo; un ingreso de hace dos años sumado al de este mes, no.
  El análisis abre en los últimos 12 meses y la tercera cifra pasó a llamarse
  **Resultado**, porque eso es: lo que dejó el período, no lo que tenés.

- **Nueva tarjeta «Ya comprometido»**: lo que deben los próximos tres meses en
  cuotas, préstamos y recurrentes, también dibujado en el gráfico. No es un
  pronóstico ni incluye lo que gastes de más: es un calendario que ya cargaste.

- **De nueve secciones a siete.**

  **Compromisos** junta lo que se repite, las compras en cuotas y los préstamos:
  las tres se confirman igual y esperaban en tres lugares distintos.
  **Presupuestos** pasó a vivir dentro de Categorías, porque un presupuesto es un
  tope de una categoría. El menú _Ver_ sigue listando todo, y `Cmd+1` a `Cmd+7`
  siguen coincidiendo con el orden del panel lateral.

- **Podés mandar sugerencias desde Ajustes.** Escribís dentro de la app y se abre
  tu programa de correo con el mensaje listo. Nada sale de tu equipo hasta que
  vos lo mandes.

## Arreglos

- **La ventana se puede arrastrar en macOS.** La barra de título es un overlay y
  el contenido la tapaba por completo, así que no quedaba nada de dónde agarrar.

- **El ícono ya no se ve más grande que el del resto de las apps.** La placa
  ocupaba todo el lienzo; macOS espera el cuerpo del ícono en 824 de 1024 px.

- **En Windows, la barra de título acompaña al modo oscuro** en vez de quedarse
  clara arriba de una app oscura.

- **Los textos al pasar el cursor por el panel lateral** ahora los dibuja la app
  y dicen para qué sirve cada sección, en vez de repetir la etiqueta que ya
  estás viendo.

## Instalación

Bajá el `.dmg` si estás en macOS, o el `.msi` o el `.exe` si estás en Windows.

La app no está firmada con certificado de Apple ni de Microsoft, así que la
primera vez el sistema la va a bloquear. En macOS: Ajustes del Sistema →
Privacidad y seguridad → «Abrir igualmente». En Windows: Más información →
Ejecutar de todas formas.
