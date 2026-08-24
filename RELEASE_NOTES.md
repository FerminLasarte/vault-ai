<!--
The notes for the release being prepared. Rewrite this file before bumping the
version: `release.yml` reads it at build time and the action copies it into
`latest.json`, which is what an installed copy shows in Ajustes. Notes added to
the release page afterwards never reach anyone who already has the app.
-->

## Qué cambia

Nada dentro de la app: es idéntica a la 1.0.1. Si ya la tenés funcionando, no
vas a notar ninguna diferencia y no hay nada que hacer.

Lo que cambió es cómo se compilan y publican las versiones. Las notas de cada
release ahora viajan junto al código, así que a partir de ahora vas a poder leer
acá mismo, y también en Ajustes → Actualizaciones, qué trae cada versión antes
de instalarla.

## Instalación

Bajá el `.dmg` si estás en macOS, o el `.msi` o el `.exe` si estás en Windows.

La app no está firmada con certificado de Apple ni de Microsoft, así que la
primera vez el sistema la va a bloquear. En macOS: Ajustes del Sistema →
Privacidad y seguridad → «Abrir igualmente». En Windows: Más información →
Ejecutar de todas formas.
