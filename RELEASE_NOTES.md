<!--
The notes for the release being prepared. Rewrite this file before bumping the
version: `release.yml` reads it at build time and the action copies it into
`latest.json`, which is what an installed copy shows in Ajustes. Notes added to
the release page afterwards never reach anyone who already has the app.
-->

## Novedades

- **Logo nuevo**, en toda la app y en el ícono del escritorio.

  El ícono ahora va sobre una placa blanca redondeada. El anterior era una marca
  sin fondo, que se veía bien en un dock claro pero casi desaparecía en uno
  oscuro. Así se lee igual en los dos.

  Dentro de la app el logo sigue adaptándose al tema: negro sobre blanco en modo
  claro, blanco sobre negro en oscuro.

## Instalación

Bajá el `.dmg` si estás en macOS, o el `.msi` o el `.exe` si estás en Windows.

La app no está firmada con certificado de Apple ni de Microsoft, así que la
primera vez el sistema la va a bloquear. En macOS: Ajustes del Sistema →
Privacidad y seguridad → «Abrir igualmente». En Windows: Más información →
Ejecutar de todas formas.
