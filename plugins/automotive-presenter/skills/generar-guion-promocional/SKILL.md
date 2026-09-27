---
name: generar-guion-promocional
description: Crea un borrador promocional en español con datos comerciales confirmados o marcadores visibles para los datos faltantes. No investiga promociones ni presenta borradores como publicables.
---

# Generar un guion promocional

Responde siempre en español. Esta skill prepara una pieza enfocada en atraer clientes con información comercial de una agencia. Es distinta de la investigación del vehículo y del guion detallado: no busca, confirma ni completa precios, promociones, disponibilidad, financiamiento o vigencia.

## Preparar y generar

1. Lee `workflows/ai/draft-promotional-script/manifest.yaml`, `input.schema.json`, `prompt.md` y `output.schema.json` del checkout actualizado. Si no están disponibles, indica que el operador debe actualizar el proyecto; no inventes un contrato.
2. Reúne la identidad exacta del vehículo y el objetivo editorial. Si la identidad falta, solicita el paquete de investigación del vehículo o pide únicamente el dato faltante.
3. Acepta datos de precio, promoción, disponibilidad y financiamiento que el usuario proporcione, pero trátalos como `UNCONFIRMED` salvo que vengan en un paquete del operador con responsable, fecha/hora de confirmación, fuente y condiciones. No busques ni infieras los términos.
4. Si un dato comercial falta o no está confirmado, no detengas el borrador: deja su marcador directamente en el bloque promocional. Incluye `[PRECIO POR CONFIRMAR]`, `[PROMOCIÓN POR CONFIRMAR]`, `[DISPONIBILIDAD POR CONFIRMAR]`, `[FINANCIAMIENTO POR CONFIRMAR]` y `[CONDICIONES DE CRÉDITO POR CONFIRMAR]` cuando aplique.
5. Incluye siempre una declaración de vigencia dentro del guion. Si hay fecha final confirmada, exprésala exactamente. Si no la hay, usa `[VIGENCIA POR CONFIRMAR]`; nunca sugieras que una oferta sigue activa ni inventes una fecha de expiración.
6. Construye el input en memoria y sigue `draft-promotional-script@1.0.0`. Valida la salida contra su schema, incluyendo placeholders requeridos, referencias de fuente y la declaración de vigencia. No guardes inputs, ofertas o borradores en el repositorio o inventario.

## Presentar el borrador

- Entrega el guion en español, enfocado en la oferta y fácil de completar el mismo día en la agencia.
- Mantén los placeholders visibles donde falten datos; no los ocultes en notas aparte.
- Si el financiamiento depende del historial o aprobación de crédito, no lo presentes como disponible para todos. Incluye exactamente las condiciones confirmadas o deja `[CONDICIONES DE CRÉDITO POR CONFIRMAR]`.
- Identifica el resultado como borrador no publicable hasta revisión comercial. Todo precio, promoción, disponibilidad, financiamiento, condición y vigencia requiere confirmación antes de grabar/publicar.
- Puedes hacer ajustes creativos sin alterar datos confirmados, fechas, condiciones, referencias o placeholders pendientes.
