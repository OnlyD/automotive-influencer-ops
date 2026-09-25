Propuesta técnica del proyecto Influencer de autos
**Estado: documento de trabajo para revisión**  
**Fecha: 24 de septiembre de 2026**  
**Supuesto de volumen: hasta 60 videos cortos mensuales**  
## Objetivo del proyecto
Construir una operación de contenido automotriz en la que una presentadora sea la imagen principal y exista un sistema técnico que ayude a convertir la información de cada vehículo en guiones, planes de grabación, publicaciones y métricas. La meta inicial es producir contenido constante para TikTok, Instagram Reels, YouTube Shorts y Facebook Reels, con capacidad de añadir otras redes después.
La tecnología debe reducir el trabajo repetitivo, mantener la información de los vehículos verificable y permitir que ambos participantes aprueben el contenido antes de publicarlo. El proyecto no parte de la publicación completamente automática. Primero se validarán los formatos y después se automatizarán las partes que ya sean predecibles.
## Alcance inicial
- Registro de vehículos y datos comerciales.
- Generación asistida de guiones, hooks, tomas, textos en pantalla y captions.
- Flujo de aprobación entre la presentadora y el responsable técnico.
- Gestión de videos originales, ediciones y versiones finales.
- Programación de publicaciones en cuatro redes principales.
- Recolección de métricas y asociación de contactos con el contenido que los originó.
- Historial de cambios, errores y reintentos.
Quedan fuera de la primera versión la edición completamente automática, la respuesta automática a comentarios, el uso de avatares para sustituir a la presentadora y las integraciones directas con todas las redes.
## Modelo operativo
Cada pieza seguirá este ciclo:
1. Cargar el vehículo y la oferta.
2. Verificar marca, modelo, año, versión, precio, kilometraje, características y disponibilidad.
3. Generar con IA uno o más conceptos de contenido.
4. Revisar el guion y adaptar el lenguaje a la voz de la presentadora.
5. Aprobar el contenido.
6. Grabar por lotes.
7. Editar el video y producir un archivo maestro vertical sin marcas de agua.
8. Adaptar título, descripción, CTA y hashtags para cada red.
9. Programar o completar la publicación desde la aplicación correspondiente.
10. Recopilar métricas y contactos para mejorar los siguientes guiones.
Estados recomendados:
BORRADOR -> DATOS_VERIFICADOS -> GUION_GENERADO -> APROBADO -> GRABADO -> EDITADO -> LISTO -> PROGRAMADO -> PUBLICADO -> MEDIDO
## Reparto de responsabilidades
### Presentadora
- Participar en la definición de personalidad, tono y límites de la marca.
- Revisar los guiones y hacerlos naturales para su forma de hablar.
- Presentar los vehículos y grabar los recursos solicitados.
- Comunicar si una idea, vestuario, toma o afirmación le resulta incómoda.
- Participar en la revisión mensual de resultados.
### Responsable técnico y de producción
- Mantener el sistema, automatizaciones y accesos.
- Preparar información verificada de los vehículos.
- Configurar la generación de guiones y variantes.
- Coordinar grabaciones y realizar la edición ligera.
- Programar publicaciones, resolver errores y recopilar métricas.
- Mantener copias de seguridad y proteger las credenciales.
### Responsable comercial
Esta función puede recaer en una de las dos personas o en el concesionario. Debe aprobar precios, ofertas, condiciones, disponibilidad y llamadas a la acción antes de la publicación.
## Arquitectura propuesta
### Aplicación administrativa
- TypeScript y Next.js para el panel.
- Autenticación y permisos por rol.
- Formularios para vehículos, contenido, activos y publicaciones.
- Historial de versiones y comentarios de aprobación.
### Datos y archivos
- PostgreSQL mediante Supabase para vehículos, guiones, estados, publicaciones, métricas y contactos.
- Cloudflare R2 para videos originales y finales.
- URLs firmadas para archivos privados.
- Política de retención para evitar conservar material innecesario.
### Inteligencia artificial
- OpenAI Responses API con salidas estructuradas.
- Un modelo de mayor calidad para el primer guion y uno económico para adaptaciones repetitivas.
- Transcripción automática para subtítulos y control del contenido hablado.
- Versionado de prompts para comparar resultados.
- Límite mensual de gasto y registro de consumo por video.
La salida del modelo debe guardarse como datos estructurados:
```json
{
  "hook": "",
  "spoken_script": "",
  "shot_list": [],
  "b_roll": [],
  "on_screen_text": [],
  "caption_by_platform": {},
  "hashtags": [],
  "cta": "",
  "claims_to_verify": [],
  "source_ids": []
}
```
Cada afirmación técnica o comercial debe vincularse a una fuente interna. El modelo no podrá completar por su cuenta un precio, rendimiento, garantía, consumo o característica no proporcionada.
### Automatización
- n8n para tareas programadas, notificaciones y conexiones externas.
- La aplicación conservará los estados, aprobaciones e historial.
- Cada publicación utilizará una clave de idempotencia para evitar duplicados.
- Los errores tendrán reintentos limitados y notificación al responsable.
### Publicación
Durante el piloto se utilizará Buffer o Metricool como capa de programación. Esto reduce la complejidad inicial de permisos y revisiones de las APIs sociales. El sistema conservará una interfaz de publicación propia para poder reemplazar el proveedor o añadir conectores directos más adelante.
Primera ola de canales:
1. TikTok.
2. Instagram Reels.
3. YouTube Shorts.
4. Facebook Reels.
Segunda ola posible:
- Threads.
- Pinterest.
- LinkedIn.
- Google Business Profile.
## Entidades principales
- vehicles: identidad y estado del vehículo.
- vehicle_facts: datos verificables y fuente.
- content_items: concepto, objetivo, formato y estado.
- scripts: versiones de guion y aprobación.
- assets: archivos, tipo, propietario y versión.
- publications: canal, fecha, texto, ID externo y resultado.
- metrics: vistas, retención, compartidos, clics y contactos.
- leads: datos mínimos del interesado y contenido de origen.
- prompt_versions: instrucciones utilizadas por la IA.
- audit_events: cambios, errores y responsables.
## Especificación del video maestro
- Relación vertical 9:16.
- Resolución objetivo 1080 por 1920.
- Archivo sin marca de agua de una red social.
- Audio de voz claro y normalizado.
- Subtítulos revisados.
- Portada y texto seguro dentro de las áreas visibles de cada plataforma.
- Música propia, autorizada o aprobada para uso comercial.
## Costos mensuales estimados
Para 60 videos y cuatro redes se recomienda presupuestar entre 80 y 140 dólares mensuales en software e infraestructura, sin incluir el pago de la presentadora ni el valor del tiempo de producción.
| Concepto | Estimado mensual |
| --- | --- |
| Guiones, revisiones y adaptaciones con IA | 5 a 15 USD |
| Transcripción y subtítulos | 1 a 5 USD |
| Programación en cuatro redes | 16 a 25 USD aproximadamente |
| Automatización | 0 con instalación propia o alrededor de 20 EUR en Cloud |
| Base de datos | 0 durante validación o 25 USD en producción |
| Almacenamiento | 2 a 8 USD |
| Hosting, dominio y monitoreo | 10 a 25 USD |
| Edición con DaVinci Resolve | 0 USD |


El costo de validación puede mantenerse entre 35 y 65 dólares mensuales. Una operación estable debe planear alrededor de 120 dólares mensuales, con un límite inicial de 150 dólares.
Los precios son referencias de planeación al 24 de septiembre de 2026 y deben confirmarse antes de contratar cualquier servicio.
## Seguridad y cumplimiento
- Las cuentas deberán crearse con un correo controlado por el negocio.
- Los tokens de acceso se almacenarán cifrados y nunca dentro del código.
- La presentadora mantendrá derecho de revisión sobre contenido sensible o incómodo.
- Se documentarán propiedad de cuentas, derechos de imagen, compensación y uso posterior del material.
- Las relaciones comerciales y promociones deberán divulgarse claramente.
- Las afirmaciones sobre vehículos, precios y financiamiento deberán ser verdaderas y verificables.
- Los formularios solo recopilarán los datos necesarios de los interesados.
## Métricas de éxito
El proyecto no se evaluará únicamente por seguidores. Las métricas principales serán:
- Retención durante los primeros segundos.
- Porcentaje promedio visto y finalización.
- Compartidos, guardados y visitas al perfil.
- Mensajes, clics y solicitudes de información.
- Pruebas de manejo y ventas relacionadas con contenido.
- Tiempo invertido por video y costo operativo por pieza.
Cada publicación deberá conservar un content_id para asociarla con el contacto o venta que genere.
## Plan de ejecución
### Etapa uno: Definición
- Acordar audiencia, personalidad, CTA, responsabilidades y compensación.
- Definir cinco formatos repetibles.
- Crear los formatos de información y aprobación.
### Etapa dos: Piloto
- Producir entre 12 y 20 videos.
- Publicar en los cuatro canales principales.
- Medir esfuerzo, comodidad frente a cámara y respuesta de la audiencia.
### Etapa tres: Sistema mínimo
- Construir el registro de vehículos.
- Generar paquetes de contenido estructurados.
- Añadir aprobación, activos y programación.
- Incorporar seguimiento de errores y costos.
### Etapa cuatro: Escalamiento
- Aumentar progresivamente hasta 60 videos mensuales.
- Automatizar subtítulos, plantillas y adaptaciones repetitivas.
- Añadir análisis por formato y canal.
- Evaluar conectores directos solo cuando el volumen lo justifique.
## Decisiones pendientes
- Nombre y propiedad de la marca.
- Mercado geográfico e idioma principal.
- Tipo de vehículos y fuente del inventario.
- CTA y método para recibir contactos.
- Compensación de la presentadora y reparto de ingresos.
- Días de grabación y volumen inicial.
- Nivel de aprobación requerido antes de publicar.
- Presupuesto máximo mensual.
- Qué cuentas serán personales y cuáles pertenecerán al negocio.
- Duración y criterios de éxito del piloto.
