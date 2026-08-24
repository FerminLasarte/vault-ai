<!--
The notes for the release being prepared. Rewrite this file before bumping the
version: `release.yml` reads it at build time and the action copies it into
`latest.json`, which is what an installed copy shows in Ajustes. Notes added to
the release page afterwards never reach anyone who already has the app.
-->

## Correcciones

- **Cuentas**: la columna de importes quedaba torcida. El saldo de cada fila
  aparecía a una distancia distinta según el largo del nombre de la cuenta, así
  que la lista se leía desprolija. Ahora los importes quedan alineados a la
  derecha, en una sola vertical, y el nombre se recorta en vez de desbordar
  cuando la ventana es angosta.

## Actualizaciones automáticas

Vault se actualiza sola. Al abrirla comprueba si hay una versión nueva y te la
ofrece; se descarga, se instala y la app se reinicia. Cada paquete viene firmado
y la app rechaza cualquier actualización cuya firma no coincida.

Si ya tenés Vault instalada, no hace falta que descargues nada de acá: abrí la
app y te va a avisar.

## Instalación

Bajá el `.dmg` si estás en macOS, o el `.msi` o el `.exe` si estás en Windows.

La app no está firmada con certificado de Apple ni de Microsoft, así que la
primera vez el sistema la va a bloquear. En macOS: Ajustes del Sistema →
Privacidad y seguridad → «Abrir igualmente». En Windows: Más información →
Ejecutar de todas formas.
