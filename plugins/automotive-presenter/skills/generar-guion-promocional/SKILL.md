---
name: generar-guion-promocional
description: Crea un borrador promocional en español con dos o tres datos atractivos del vehículo investigado y condiciones comerciales confirmadas o marcadores para datos faltantes. No investiga el vehículo ni las promociones, ni presenta borradores como publicables.
---

# Generar un guion promocional

Responde y entrega todo en español. Esta skill crea un borrador de venta a partir de una investigación previa del vehículo, la información comercial que la influencer recibió y, si existen, fotos o videos sin audio. No investiga el vehículo ni la oferta. La información promocional puede faltar sin detener la preparación del borrador.

## Preparar el borrador

1. Usa internamente `draft-promotional-script@1.3.0` y valida el resultado con el contrato vigente. El JSON, los schemas, los IDs internos y los mensajes técnicos son datos de trabajo: **nunca los muestres, adjuntes ni expliques a la influencer**.
2. Usa la investigación con hechos candidatos y fuentes identificables disponible en esta conversación, normalmente preparada con `$investigar-vehiculo`. Si no existe, indica en español que primero investigue el vehículo con esa skill en esta misma conversación y detente; no exijas un handoff del operador ni busques especificaciones dentro de esta skill.
3. Selecciona solo dos o tres datos atractivos y relevantes de esa investigación para la audiencia y el ángulo promocional. No resumas toda la investigación ni conviertas el guion en una ficha técnica. Mantén cada dato ligado a su fuente y descríbelo como pendiente de revisión. Si la investigación contiene menos de dos datos utilizables, aprovecha los respaldados y advierte brevemente que hace falta más contexto.
4. Acepta el resumen comercial de la influencer en lenguaje natural como input separado. Usa los términos que ella indique como proporcionados por ella para el borrador, sin pedir URL, paquete del operador, nombre del dealer ni fecha de confirmación como requisito previo. No declares que tú verificaste esos términos.
5. Deja un marcador solo donde realmente falte información o la influencer diga que es incierta: `[PRECIO POR CONFIRMAR]`, `[PROMOCIÓN POR CONFIRMAR]`, `[DISPONIBILIDAD POR CONFIRMAR]`, `[FINANCIAMIENTO POR CONFIRMAR]` o `[CONDICIONES DE CRÉDITO POR CONFIRMAR]`. Conserva los términos que ella sí proporcionó sin ponerles un marcador.
6. Incluye la vigencia dentro de la última escena. Si se proporciona fecha final, úsala tal como se indicó. Si no, incluye `[VIGENCIA POR CONFIRMAR]` en la voz en off y en el texto en pantalla. No inventes fechas ni disponibilidad.
7. Si no se especifica duración, usa una duración breve apropiada para la solicitud y calcula los tiempos según la extensión hablada. Si la influencer pide ampliar, desarrolla la voz en off; mantén las indicaciones visuales cortas.
8. Crea escenas con timing, visual conciso, voz en off completa y texto en pantalla breve. Usa un tono mexicano natural, alegre y conversacional; evita repetir “pregunta en la agencia”. Presenta los beneficios proporcionados directamente. Cierra con una llamada a la acción concreta, sin prometer aprobación o entrega garantizadas.
9. Añade siempre dos llamadas habladas al final: invita a contactar usando solo el medio que la influencer haya proporcionado (si falta: `[MEDIO DE CONTACTO POR CONFIRMAR]`) y a seguir la cuenta, dar me gusta y comentar. No inventes teléfonos, usuarios, enlaces ni contactos de la agencia.
10. Usa fotografías y clips enviados como referencias visuales. Si están sin audio, propone una voz en off que pueda acompañarlos; no digas que los medios ya fueron editados.

## Entrega

- Genera un documento Word en español con el formato aprobado de cuatro columnas: **Tiempo / escena**, **Visual breve**, **Voz en off** y **Texto en pantalla**. No agregues una batería de preguntas al dealer, anexos técnicos, JSON, schemas, advertencias por cada línea ni notas internas.
- Coloca un único aviso discreto de borrador/revisión. Si hay marcadores, agrega una sola nota breve indicando que deben sustituirse antes de grabar; no deben leerse literalmente.
- Asegúrate de que las llamadas a contactar y a seguir/dar me gusta/comentar queden en la narración hablada final del Word.
- Entrega el enlace al Word y, en el chat, una explicación breve en español. Nunca devuelvas el objeto de workflow ni el JSON crudo.
- No guardes datos comerciales ni material real en Git o en el inventario. Conserva el Word como archivo de trabajo local. El borrador no publica contenido.
- Si no se puede generar el Word, entrega el guion con las cuatro columnas en una tabla legible en el chat; no pidas a la influencer que use una terminal o interprete una falla técnica.
