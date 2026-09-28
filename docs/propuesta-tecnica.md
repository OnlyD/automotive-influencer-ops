# Especificación técnica de ejecución — Operación de contenido automotriz

**Estado:** ejecución autorizada; bootstrap e implementación incremental en curso  
**Fecha de consolidación:** 27 de septiembre de 2026  
**Versión de la especificación:** 2.6.0
**Nombre lógico del repositorio:** `automotive-content-ops`  
**Responsable técnico y autoridad de integración:** operador técnico del proyecto  
**Audiencia principal:** agente Codex que continuará la implementación, operador técnico y futuros mantenedores  
**Carácter del documento:** normativo y autocontenido; no es una propuesta comercial  

## 1. Propósito, autoridad y forma de uso

Este documento es la especificación principal para ejecutar y continuar el proyecto desde Codex Desktop. Debe permitir que un agente nuevo trabaje sin acceso al historial de conversación y sin tener que reinferir decisiones. Define requisitos funcionales y no funcionales, arquitectura, contratos de datos, workflows de IA, skills, subagentes, permisos, almacenamiento, pruebas, fases, riesgos y criterios de aceptación.

No debe leerse como una colección de sugerencias. Las reglas expresadas como **debe**, **no debe**, **se requiere** o **queda prohibido** son obligatorias. Las decisiones pendientes aparecen identificadas de forma explícita y no autorizan al agente a escoger silenciosamente una opción.

Orden de autoridad cuando existan contradicciones:

1. Esta especificación y sus futuras versiones aprobadas.
2. ADRs aceptados dentro de `docs/decisions/`.
3. Schemas, manifests y templates versionados.
4. Código y pruebas de la rama protegida.
5. Ejemplos y fixtures.

El acuerdo operativo del proyecto conserva las decisiones de colaboración y producción de contenido, pero no sustituye los contratos técnicos. Quedan fuera de esta especificación la compensación, los honorarios o fees, el reparto de ingresos, la nacionalidad y el estatus o situación migratoria de cualquier participante.

### Historial de esta especificación

| Versión | Fecha | Cambio |
| --- | --- | --- |
| 1.0.0 | 24-sep-2026 | Arquitectura inicial y decisiones de alto nivel. |
| 2.0.0 | 27-sep-2026 | Conversión a especificación autocontenida de ejecución; incorpora inventario, contratos, workflows, skills, subagentes, operación, pruebas, riesgos y handoff. |
| 2.1.0 | 27-sep-2026 | Añade una vista previa de guion para la presentadora con hechos candidatos enlazados a fuentes, revisión factual obligatoria y sin publicación ni persistencia. |
| 2.2.0 | 27-sep-2026 | Separa la investigación técnica del guion: el operador prepara el paquete de investigación y la presentadora solo lo convierte en una vista previa. |
| 2.3.0 | 27-sep-2026 | Añade un workflow promocional independiente con marcadores en el texto hablado para datos comerciales faltantes y una declaración obligatoria de vigencia. |
| 2.4.0 | 27-sep-2026 | Define documentos Word de cuatro columnas para la presentadora, conserva JSON como formato interno, permite usar condiciones aportadas por ella sin presentarlas como confirmadas, y elimina la skill genérica duplicada del operador. |
| 2.5.0 | 27-sep-2026 | Requiere integrar dos o tres datos de investigación relevantes en la reseña detallada de la presentadora cuando el paquete tenga información suficiente. |
| 2.6.0 | 27-sep-2026 | Requiere que el guion promocional consuma investigación separada y use solo dos o tres datos atractivos y pertinentes de la unidad. |

### Punto de reanudación obligatorio en Codex

El proyecto ya superó la etapa de propuesta. La ejecución está autorizada, pero la infraestructura externa y la publicación real todavía requieren controles humanos. El repositorio puede existir con una estructura mínima; el agente no debe asumir que está vacío, limpio o sincronizado.

Antes de modificarlo, el agente debe:

1. Inspeccionar `git status`, rama actual, remoto y árbol existente.
2. Leer `AGENTS.md`, `README.md`, esta especificación y cualquier ADR presente.
3. Preservar cambios ajenos o no relacionados.
4. Comparar la estructura existente contra la sección de repositorio de este documento.
5. Elaborar un plan de implementación con cambios reversibles y verificables.

El siguiente trabajo autorizado es completar las fases 0 y 1 de forma incremental:

1. Completar el bootstrap del repositorio existente; crearlo solo si realmente no existe.
2. Añadir o corregir la estructura del primer commit definida en este documento.
3. Implementar `AGENTS.md`, documentación base, contratos, schemas, templates, fixtures y esqueletos de plugins.
4. Implementar primero el inventario local y el flujo ficticio de investigación y generación de guion.
5. Validar localmente la estructura, contratos, permisos y pruebas antes de cualquier servicio externo.

El nombre lógico `automotive-content-ops` no autoriza a renombrar un repositorio o remoto ya existente. Si el nombre real difiere, se conserva y se registra la diferencia mediante un ADR.

No se autoriza todavía:

- Desplegar recursos en AWS.
- Conectar cuentas sociales.
- Publicar contenido.
- Crear credenciales reales.
- Construir una aplicación web.
- Habilitar automatizaciones sin aprobación humana.

## 2. Objetivo técnico

Construir una operación reproducible para transformar información verificable de un vehículo en guiones, planes de grabación, materiales editados, publicaciones y métricas.

El diseño debe permitir:

- Una experiencia sencilla para la presentadora mediante skills en Codex Desktop.
- Control técnico y aprobación del operador sobre flujos, prompts, versiones y publicaciones.
- Resultados de IA consistentes mediante inputs, outputs, templates y esquemas versionados.
- Ejecución inicial de IA y automatización en el equipo local del operador.
- Persistencia y recepción de eventos en AWS sin mantener un runner activo las 24 horas.
- Migrar procesos locales a infraestructura administrada sin modificar la experiencia de la presentadora.

## 3. Alcance operativo

### Piloto

- Un video principal vertical de 120–150 segundos.
- Objetivo editorial de 4–6 clips derivados cuando la calidad lo permita; no es una cuota obligatoria.
- Aprobación humana antes de grabar y publicar, mediante gates separados y registrados.
- Grabación modular para facilitar correcciones y clipping.

### Validación posterior

- Meta inicial de 4 videos principales y entre 16 y 24 clips.
- Validar esfuerzo, comodidad frente a cámara, calidad, tiempos y respuesta de la audiencia.

### Escalamiento

- La referencia de 60 piezas mensuales representa una capacidad futura, no una obligación inicial.
- La distribución de referencia para esa capacidad futura es de 10 videos principales + 50 clips; no son 60 videos principales.
- Si una pieza se publica en cuatro plataformas, 60 piezas pueden producir hasta 240 publicaciones.
- La edición completamente automática, los avatares, las respuestas automáticas a comentarios y los conectores directos completos con todas las redes quedan fuera del inicio.

## 4. Principios de arquitectura

1. **GitHub contiene definiciones; AWS contiene operación.**
2. **La IA propone; el sistema valida; una persona aprueba.**
3. **Las skills son interfaces guiadas, no prompts libres.**
4. **Los contratos preceden a la automatización.**
5. **Los subagentes producen candidatos; la instancia principal conserva autoridad.**
6. **Los procesos locales nunca son el único lugar donde vive el estado.**
7. **Nada importante depende de que el equipo local esté encendido.**
8. **Los servicios permanentes se mantienen serverless durante el piloto.**
9. **Toda afirmación factual debe conservar su fuente.**
10. **Los permisos se aplican técnicamente y no solo mediante instrucciones.**

## 5. Distribución de responsabilidades técnicas

### Presentadora

- Invocar principalmente las skills autorizadas para su rol.
- La presentadora puede ajustar el guion: adaptar, reordenar, acortar o reescribir el texto hablado para llevarlo a su forma natural de expresarse.
- La presentadora puede solicitar una vista previa no oficial con hechos candidatos y fuentes; la revisión factual y la oficialización siguen siendo responsabilidad del operador.
- Preparar y completar la grabación solicitada.
- Entregar el material mediante el flujo definido.
- Solicitar correcciones sin modificar hechos, estados o reglas del sistema.

### Operador técnico

- Mantener el repositorio, contratos, prompts, schemas, infraestructura y accesos.
- Aprobar cambios de flujo y versiones.
- Administrar Codex CLI, n8n local y los recursos AWS.
- Verificar datos, coordinar producción, editar, publicar y medir.
- Resolver trabajos fallidos y decidir cuándo migrar componentes a la nube.

### Sistema

- Validar permisos, schemas, estados y versiones.
- Rechazar flujos desconocidos, no aprobados o modificados localmente.
- Mantener trazabilidad de entradas, resultados, fuentes y aprobaciones.
- Evitar duplicados mediante idempotencia.

## 6. Arquitectura híbrida

```text
Presentadora / Operador
        │
        ▼
Codex Desktop + skills
        │
        ▼
API Gateway + Lambda
        │
        ├── DynamoDB: estado y metadatos
        ├── S3: archivos y artefactos
        └── SQS: trabajos pendientes
                    │
                    ▼
             n8n local encendido
                    │
                    ▼
             AI Runner local
                    │
                    ▼
               Codex CLI
```

### Componentes siempre disponibles en AWS

- API Gateway para solicitudes controladas.
- Lambda para validación, autorización, estados y manejo de colas.
- DynamoDB para producciones, trabajos, versiones, aprobaciones y auditoría.
- S3 privado para videos, imágenes, audios y resultados.
- SQS para trabajos pendientes y una dead-letter queue para fallos definitivos.
- EventBridge para horarios que deban existir aunque el equipo local esté apagado.
- CloudWatch para logs, métricas y alertas.
- Cognito o un mecanismo equivalente para identidad y roles cuando se habilite acceso independiente.
- SSM Parameter Store o un servicio equivalente para configuración sensible.

### Componentes locales

- n8n ejecutado mediante Docker Compose.
- AI Runner como servicio local controlado.
- Codex CLI autenticado y administrado por el operador técnico.
- Worktrees o carpetas temporales aisladas para cada ejecución.
- Archivos temporales de edición y procesamiento.

### Regla de disponibilidad

Los webhooks, estados, cargas, aprobaciones y horarios viven en AWS. n8n local solo consume trabajos cuando está disponible. Si el equipo del operador está apagado, los trabajos permanecen en espera y no se pierden.

La presentadora no se conecta directamente a n8n ni a Codex CLI del operador.

## 7. Flujo de trabajos asincrónicos

1. Una skill o interfaz autorizada solicita una operación.
2. Lambda valida rol, workflow, versión, input y estado actual.
3. DynamoDB registra el trabajo.
4. SQS conserva el trabajo pendiente.
5. n8n local solicita el siguiente trabajo mediante `/jobs/claim`.
6. La API establece un lease temporal y entrega el payload autorizado.
7. n8n llama al AI Runner o ejecuta pasos deterministas.
8. El resultado se valida contra su schema.
9. Los archivos se guardan en S3 y el estado se actualiza en DynamoDB.
10. n8n confirma mediante `/jobs/{id}/complete` o reporta `/jobs/{id}/fail`.
11. Si el proceso se interrumpe, el lease expira y el trabajo vuelve a estar disponible.

Todos los trabajos deben incluir una clave de idempotencia para impedir ejecuciones duplicadas.

## 8. Contrato base de trabajo

```json
{
  "jobId": "job_123",
  "productionId": "production_001",
  "workflowId": "draft-vehicle-script",
  "workflowVersion": "1.0.0",
  "requestedBy": "technical-operator",
  "requestedRole": "operator",
  "inputLocation": "s3://private-bucket/jobs/job_123/input.json",
  "idempotencyKey": "production_001:draft-vehicle-script:1.0.0",
  "status": "QUEUED"
}
```

Estados mínimos de un trabajo:

```text
QUEUED -> CLAIMED -> RUNNING -> VALIDATING -> COMPLETED
                                └───────────> FAILED
FAILED -> RETRY_PENDING -> QUEUED
FAILED -> DEAD_LETTER
```

## 9. Estado de una producción

```text
BORRADOR
-> INVESTIGANDO
-> DATOS_VERIFICADOS
-> GUION_GENERADO
-> REVISION_PRESENTADORA
-> APROBADO
-> LISTO_PARA_GRABAR
-> GRABADO
-> EDITADO
-> LISTO
-> PROGRAMADO
-> PUBLICADO
-> MEDIDO
```

Las transiciones se implementan en `packages/domain` y se validan en la API. Una skill o modelo no puede cambiar estados directamente.

## 10. Repositorio

Se utilizará un monorepo privado TypeScript con `pnpm workspaces`. No se requiere Turborepo en la primera etapa.

```text
automotive-content-ops/
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
├── .gitignore
│
├── apps/
│   ├── ai-runner/
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── execute-codex.ts
│   │   │   └── workflow-registry.ts
│   │   └── package.json
│   └── web/                         # Futuro; no crear aún
│
├── services/
│   └── api/
│       ├── src/
│       │   ├── productions/
│       │   ├── jobs/
│       │   ├── uploads/
│       │   └── approvals/
│       └── package.json
│
├── packages/
│   ├── contracts/
│   │   ├── schemas/
│   │   └── src/
│   ├── domain/
│   │   └── src/
│   ├── inventory/
│   │   └── src/
│   └── aws-client/
│       └── src/
│
├── workflows/
│   └── ai/
│       ├── research-vehicle/
│       ├── validate-vehicle-data/
│       ├── draft-vehicle-script/
│       ├── adapt-presenter-script/
│       ├── create-shooting-plan/
│       ├── generate-captions/
│       └── analyze-performance/
│
├── infrastructure/
│   └── aws-cdk/
│
├── automation/
│   └── n8n/
│       ├── docker-compose.yml
│       ├── .env.example
│       ├── workflows/
│       └── scripts/
│
├── plugins/
│   ├── automotive-presenter/
│   │   ├── plugin.json
│   │   └── skills/
│   │       ├── adaptar-guion/
│   │       ├── preparar-grabacion/
│   │       └── entregar-material/
│   └── automotive-operator/
│       ├── plugin.json
│       └── skills/
│           ├── investigar-vehiculo/
│           ├── generar-guion/
│           └── analizar-rendimiento/
│
├── .agents/
│   └── plugins/
│       └── marketplace.json
│
├── templates/
│   └── production/
├── data/
│   ├── imports/
│   │   ├── incoming/
│   │   ├── archived/
│   │   └── rejected/
│   ├── mappings/
│   └── fixtures/
├── docs/
│   ├── architecture.md
│   ├── operational-flow.md
│   ├── roles-and-permissions.md
│   ├── content-rules.md
│   ├── decisions/
│   └── runbooks/
│
├── tests/
│   ├── contracts/
│   ├── workflows/
│   └── fixtures/
│
└── .github/
    ├── CODEOWNERS
    └── workflows/
        └── ci.yml
```

### Primer commit

Crear inicialmente:

```text
AGENTS.md
README.md
package.json
pnpm-workspace.yaml
tsconfig.base.json
docs/
packages/contracts/
packages/domain/
packages/inventory/
workflows/ai/
apps/ai-runner/
automation/n8n/
data/mappings/
data/fixtures/
plugins/automotive-presenter/
plugins/automotive-operator/
.agents/plugins/marketplace.json
.github/CODEOWNERS
.github/workflows/ci.yml
```

`services/api`, `infrastructure/aws-cdk` y `apps/web` se implementarán después de validar el primer flujo local. La estructura puede documentarlos sin crear código prematuro.

## 11. Límites de almacenamiento

| Ubicación | Contenido |
| --- | --- |
| GitHub | Código, schemas, templates, skills, prompts, workflows exportados, pruebas y documentación |
| AWS | Producciones reales, estados, trabajos, aprobaciones, videos, imágenes, resultados y logs |
| Local | Credenciales de Codex, base interna de n8n, worktrees, cachés, descargas y archivos temporales |

No se guardan videos, tokens, credenciales, bases locales de n8n ni datos reales sensibles dentro de GitHub.

## 12. Workflows de IA

Cada workflow de IA debe ser autocontenido y versionado:

```text
workflows/ai/draft-vehicle-script/
├── manifest.yaml
├── prompt.md
├── input.schema.json
├── input.template.yaml
├── output.schema.json
├── output.template.md
├── examples/
└── tests/
```

### Requisitos obligatorios

- Un ID estable y una versión semántica.
- Roles autorizados.
- Input schema y template humano.
- Output schema y template humano.
- Prompt versionado.
- Campos editables y campos bloqueados.
- Política de aprobación.
- Estrategia de delegación.
- Casos de prueba representativos.

Las skills no duplican prompts ni contratos. Actúan como una interfaz que localiza el workflow aprobado, solicita campos faltantes, valida la entrada, ejecuta y presenta la salida.

### Ejemplo de manifest

```yaml
id: adapt-presenter-script
version: 1.0.0
owner: technical-operator

allowed_roles:
  - presenter

input_schema: input.schema.json
output_schema: output.schema.json
requires_human_approval: true
allows_freeform_prompt: false

editable_fields:
  - spoken_text
  - preferred_expressions
  - presenter_notes

locked_fields:
  - verified_facts
  - prices
  - availability
  - commercial_claims
  - sources

execution:
  initial: main
  revisions: main

delegation:
  allowed: true
  only_when:
    - new_research_required
    - independent_fact_check_required
  maximum_subagents: 1
```

## 13. Skills y experiencia de la presentadora

La presentadora utilizará principalmente:

- `$generar-guion` para convertir un paquete de investigación del operador en un borrador Word no oficial que incorpora dos o tres hechos relevantes con sus fuentes; no busca ni completa hechos.
- `$adaptar-guion`
- `$preparar-grabacion`
- `$entregar-material`

Una solicitud como:

> `$adaptar-guion Quiero que suene más natural y menos formal.`

debe localizar el guion aprobado, cargar el contrato correcto y permitir cambios únicamente en los campos editables. `$generar-guion` es una excepción limitada: produce un borrador Word local, no persiste ni oficializa el resultado, mantiene cada afirmación candidata enlazada a su fuente y no permite publicar.

La presentadora no necesita:

- Redactar prompts técnicos.
- Conocer JSON, Git, AWS o n8n.
- Seleccionar modelos.
- Definir formatos de salida.
- Manejar credenciales.
- Modificar archivos de workflow.

Si falta información, la skill hará preguntas breves y concretas. Una entrada fuera del alcance se rechazará o se enviará al operador para revisión.

## 14. Subagentes y autoridad de la instancia principal

### Usar subagentes cuando

- Se genera un entregable nuevo y especializado.
- Se investiga una fuente independiente.
- Se requiere una revisión factual separada.
- Se comparan enfoques que no modifican el mismo artefacto.
- La tarea tiene una entrada, una salida y un criterio de terminación claros.

### Mantener la tarea en la instancia principal cuando

- Se modifica un resultado anterior.
- Se aplican comentarios de la presentadora.
- Se combinan resultados de varios subagentes.
- Se conserva el contexto conversacional.
- Se decide qué versión se vuelve oficial.

Si una modificación requiere investigación nueva, la instancia principal delega solamente esa investigación. El subagente devuelve un delta estructurado y la instancia principal aplica el cambio.

### Regla de escritura

- Los subagentes generan candidatos inmutables.
- Los subagentes no publican, no cambian estados y no sobrescriben artefactos oficiales.
- La instancia principal valida y sintetiza.
- El código determinista persiste el artefacto y ejecuta la transición.
- Si el runtime seleccionado no ofrece subagentes, la instancia principal ejecuta el mismo contrato sin cambiar inputs u outputs.

## 15. Versionado de artefactos y hechos bloqueados

Un artefacto oficial nunca se sobrescribe. Cada cambio crea una nueva versión:

```json
{
  "artifactId": "script",
  "version": 2,
  "parentVersion": 1,
  "workflowId": "adapt-presenter-script",
  "workflowVersion": "1.0.0",
  "modifiedBy": "root",
  "changeRequestedBy": "presenter",
  "basedOnSubagentRuns": [],
  "lockedFactsHash": "sha256:..."
}
```

Los datos verificados generan un hash. Si cambia un precio, especificación, fuente, disponibilidad o afirmación comercial, el hash deja de coincidir y el resultado regresa a revisión técnica.

## 16. AI Runner local

n8n no ejecutará comandos arbitrarios proporcionados por el usuario. Llamará a un AI Runner con una interfaz limitada y workflows permitidos.

Ejemplo:

```json
{
  "workflowId": "draft-vehicle-script",
  "workflowVersion": "1.0.0",
  "productionId": "production_001",
  "input": {
    "verifiedDataLocation": "s3://private-bucket/...",
    "targetDurationSeconds": 135
  }
}
```

El runner:

1. Verifica que el workflow y la versión estén registrados.
2. Crea un workspace aislado.
3. Carga prompt, input, referencias y output schema.
4. Invoca `codex exec` en modo no interactivo y con permisos mínimos.
5. Captura eventos estructurados.
6. Valida el resultado.
7. Devuelve únicamente un artefacto aceptado o un error tipado.
8. Elimina el workspace temporal según la política de retención.

La autenticación local de Codex es administrada únicamente por el operador. No se monta indiscriminadamente el directorio de credenciales dentro de n8n y no se expone el runner a internet.

El uso, límites y selección de modelos quedan bajo responsabilidad del operador técnico.

## 17. Controles de modificación y permisos

- La rama `main` estará protegida.
- `.github/CODEOWNERS` requerirá aprobación del operador para `workflows/`, `plugins/`, `packages/contracts/`, `packages/domain/` e `infrastructure/`.
- La presentadora no podrá aprobar ni desplegar cambios de flujo.
- La API aceptará únicamente workflows y versiones aprobados.
- Cada ejecución registrará `workflowId`, `workflowVersion` y commit de origen.
- CI validará YAML, JSON Schema, ejemplos, tests y referencias internas.
- El rol `presenter` tendrá acceso únicamente a endpoints de su responsabilidad.
- Las transiciones de estado estarán centralizadas en código.
- Ningún prompt de usuario se convierte directamente en un comando de shell.
- Un cambio local no aprobado no podrá convertirse en un artefacto oficial.

## 18. API mínima futura

```text
POST /productions
GET  /productions/{id}
POST /productions/{id}/request-workflow
POST /productions/{id}/approve
POST /uploads/request
POST /jobs/claim
POST /jobs/{id}/complete
POST /jobs/{id}/fail
```

La API exacta se definirá después de validar el primer workflow local. Los nombres anteriores expresan responsabilidades, no un contrato final.

## 19. Seguridad

- Credenciales fuera del repositorio.
- IAM con privilegio mínimo.
- S3 privado y cargas mediante URLs firmadas.
- Cifrado en tránsito y en reposo.
- Separación entre identidad de presentadora y operador.
- Logs sin prompts sensibles, tokens ni datos personales innecesarios.
- Validación de archivos, tamaños y tipos antes de procesarlos.
- Auditoría de cambios, aprobaciones y publicaciones.
- Divulgación de relaciones comerciales y respeto a derechos de imagen, música y materiales.
- Revisión manual de precios, promociones, disponibilidad, financiamiento y CTA.

## 20. Límites de costo

- Priorizar servicios AWS serverless y sus niveles gratuitos durante el piloto.
- No desplegar ECS, Fargate, RDS, NAT Gateway ni un runner permanente en la etapa inicial.
- Ejecutar n8n y Codex CLI localmente bajo control del operador.
- Mantener la inversión mensual total de herramientas, IA e infraestructura dentro del máximo conciliado de USD 120/mes, salvo aprobación posterior.
- Vigilar especialmente almacenamiento y transferencia de archivos de video.
- Configurar alertas de presupuesto antes de desplegar recursos AWS.

## 21. Evolución futura

Si la presentadora necesita ejecutar flujos sin depender del equipo local:

- Los trabajos breves y predecibles pueden migrar a Lambda.
- Los flujos con varios pasos, esperas y reintentos pueden migrar a Step Functions.
- Los trabajos largos y ocasionales pueden usar tareas Fargate bajo demanda.
- n8n puede desplegarse como servicio cuando necesite webhooks o disponibilidad permanente.
- Los workflows estables deben migrarse antes que los creativos o cambiantes.

La identidad local de Codex no se copiará informalmente a la nube. La autenticación de IA para un runner desplegado requerirá una decisión separada y credenciales apropiadas.

La interfaz de trabajo no cambia: las skills siguen solicitando el mismo `workflowId` y la infraestructura decide qué worker lo ejecuta.

## 22. Secuencia de implementación

### Fase 0 — Bootstrap del repositorio existente

- Inspeccionar el repositorio y conservar su remoto, nombre y cambios existentes.
- Crear el monorepo privado únicamente si todavía no existe.
- Agregar o completar `AGENTS.md`, estructura, documentación y CI mínima.
- Proteger `main` y configurar `CODEOWNERS` cuando el remoto esté disponible.
- Registrar mediante ADR cualquier diferencia deliberada frente a la estructura objetivo.

### Fase 1 — Inventario, contratos y primer workflow

- Implementar `packages/contracts`, `packages/domain` y `packages/inventory`.
- Definir las entidades canónicas, importación preview/apply y repositorios locales.
- Definir `research-vehicle`, `validate-vehicle-data`, `draft-vehicle-script` y `adapt-presenter-script`.
- Crear templates, schemas, ejemplos y pruebas.
- Crear el plugin `automotive-presenter`.

### Fase 2 — Ejecución local

- Construir el AI Runner.
- Configurar Codex CLI.
- Levantar n8n mediante Docker Compose.
- Ejecutar una producción ficticia de extremo a extremo.

### Fase 3 — AWS mínimo

- Configurar presupuesto y alertas.
- Desplegar S3, DynamoDB, SQS, Lambda y API Gateway mediante CDK.
- Conectar n8n local a la cola mediante la API.
- Validar reintentos, leases, idempotencia y dead-letter queue.

### Fase 4 — Piloto real

- Ejecutar el primer video principal y sus clips.
- Registrar tiempos, errores, comodidad y calidad.
- Corregir contratos y skills antes de aumentar volumen.

### Fase 5 — Interfaz y escalamiento

- Evaluar si una aplicación web aporta valor real.
- Automatizar únicamente pasos ya estables.
- Desplegar workers adicionales cuando la independencia o el volumen lo justifiquen.

## 23. Criterios de aceptación del primer flujo

El primer flujo se considera válido cuando:

- La presentadora puede invocar una skill sin instrucciones técnicas adicionales.
- Los inputs faltantes se solicitan de forma clara.
- El output cumple el schema y el template.
- Cada hecho conserva una fuente.
- Los campos bloqueados no cambian durante la adaptación.
- Una modificación crea una versión nueva.
- Un flujo modificado sin aprobación es rechazado.
- El operador puede reconstruir qué workflow, versión y fuentes produjeron el resultado.
- Ninguna publicación ocurre automáticamente.

## 24. Decisiones pendientes antes de implementar AWS

- Región principal de AWS.
- Antigüedad y plan de la cuenta AWS para determinar beneficios disponibles.
- Estrategia exacta de identidad para la presentadora.
- Política de retención de videos originales y resultados.
- Proveedor inicial de programación social.
- CTA y mecanismo de recepción de contactos.
- Primer vehículo real o dataset ficticio del piloto.
- Nombre definitivo de la marca y del repositorio.

Estas decisiones no bloquean la creación del repositorio, los contratos ni las pruebas locales.

## 25. Glosario y lenguaje común

| Término | Significado operativo |
| --- | --- |
| Pieza | Archivo editorial único: video principal, clip, historia, estado, portada u otro derivado. No equivale a publicación. |
| Publicación | Aparición de una pieza en una plataforma y cuenta específicas. Una pieza publicada en cuatro redes genera cuatro publicaciones. |
| Producción | Unidad de trabajo asociada a un vehículo o tema, desde la selección hasta la medición. |
| Vehículo | Registro canónico de una unidad de inventario o de un modelo utilizado para contenido editorial. |
| Hecho verificable | Afirmación concreta sobre un vehículo respaldada por una o más fuentes. |
| Dato comercial | Precio, disponibilidad, promoción, garantía, financiamiento, kilometraje de inventario o CTA comercial. |
| Fuente | Evidencia utilizada para sostener un hecho: documento oficial, página del fabricante, inventario autorizado u otra fuente identificable. |
| Artefacto | Resultado versionado: investigación, guion, plan de grabación, clip plan, caption o paquete de publicación. |
| Workflow | Contrato versionado que define input, procesamiento, output, permisos, aprobación, delegación y pruebas. |
| Skill | Interfaz guiada que ejecuta uno o más workflows aprobados sin exponer complejidad técnica a la presentadora. |
| Instancia principal | Agente que conserva el contexto, integra resultados, aplica revisiones y decide qué versión puede oficializarse. |
| Subagente | Ejecutor acotado que devuelve candidatos o evidencia; no controla el estado oficial. |
| Campo bloqueado | Campo factual o de control que la presentadora o un subagente no pueden modificar. |
| Aprobación | Decisión humana registrada, asociada a una versión exacta del artefacto. |
| Fuente de verdad | Registro canónico que prevalece sobre copias, archivos sueltos, prompts o memoria conversacional. |

## 26. Requisitos funcionales completos

El sistema debe cubrir como mínimo los siguientes dominios:

| ID | Dominio | Requisito |
| --- | --- | --- |
| FR-001 | Inventario | Importar inventario desde CSV o XLSX sin depender de una carpeta manual por vehículo. |
| FR-002 | Inventario | Mantener un registro canónico por unidad y detectar actualizaciones o duplicados. |
| FR-003 | Fuentes | Asociar cada hecho verificable con fuente, fecha de consulta y estado de verificación. |
| FR-004 | Investigación | Separar datos confirmados, datos contradictorios y datos pendientes. |
| FR-005 | Guiones | Generar el guion oficial a partir de hechos verificados; permitir una vista previa no oficial solo con hechos candidatos enlazados a fuentes y revisión factual del operador. |
| FR-006 | Adaptación | Permitir que la presentadora ajuste lenguaje y orden sin alterar hechos bloqueados. |
| FR-007 | Grabación | Generar un plan de tomas y checklist comprensible para la presentadora. |
| FR-008 | Entrega | Recibir y relacionar material grabado con una producción sin exponer credenciales. |
| FR-009 | Edición | Registrar el video principal, sus versiones y el estado de revisión. |
| FR-010 | Clipping | Proponer clips derivados con hook, intervalo, CTA y destino; la cantidad es objetivo, no garantía. |
| FR-011 | Publicación | Generar paquetes específicos por plataforma y exigir aprobación antes de publicar. |
| FR-012 | Métricas | Registrar identificadores de publicaciones y snapshots de rendimiento. |
| FR-013 | Aprendizaje | Relacionar desempeño con vehículo, ángulo, hook, duración, CTA y workflow. |
| FR-014 | Auditoría | Reconstruir quién solicitó, generó, revisó, aprobó y publicó cada versión. |
| FR-015 | Operación | Reintentar trabajos sin duplicar resultados ni perder estado. |
| FR-016 | Permisos | Restringir acciones según rol y estado de la producción. |
| FR-017 | Costos | Registrar consumo relevante y mantener alertas dentro del límite operativo aprobado. |

## 27. Requisitos no funcionales

- **Reproducibilidad:** una ejecución debe poder reconstruirse con `workflowId`, versión, commit, input, modelo o runner utilizado y fuentes.
- **Trazabilidad:** ningún hecho factual en un guion oficial puede existir sin referencia a un `vehicleFactId` verificado.
- **Consistencia:** los outputs se validan estructuralmente antes de mostrarse como candidatos aceptables.
- **Seguridad:** ninguna skill recibe acceso directo a shell, tokens, repositorio completo o credenciales de nube.
- **Idempotencia:** repetir una solicitud con la misma clave no crea otro artefacto oficial.
- **Portabilidad:** los contratos no dependen de un modelo específico; el runner puede cambiar sin modificar la interfaz de las skills.
- **Operación intermitente:** apagar el equipo local no pierde trabajos ni corrompe producciones.
- **Costo controlado:** no se despliega infraestructura permanente costosa durante el piloto.
- **Reversibilidad:** cambios de infraestructura y migraciones de datos deben poder revertirse o restaurarse.
- **Observabilidad:** errores, tiempos, reintentos, validaciones y aprobaciones generan eventos consultables.
- **Privacidad:** se evita recolectar información personal innecesaria de la presentadora, compradores o terceros visibles.

## 28. Inventario como fuente única de verdad

La base de datos es la fuente operativa de verdad del inventario. Las carpetas sirven para importaciones, ejemplos y archivos, no para representar el stock. Un guion no puede usar directamente una hoja de cálculo suelta. La hoja se importa, valida y convierte en registros canónicos antes de que un workflow pueda consultarla.

Durante la fase local se implementará una abstracción de repositorio con SQLite o almacenamiento equivalente fácil de ejecutar. La decisión local no cambia el contrato del dominio. Al migrar a AWS, DynamoDB será la opción inicial prevista, pero la partición final debe probarse con consultas reales antes de quedar congelada.

### 28.1 Entidades canónicas

#### Vehicle

Representa una unidad o modelo identificable.

```json
{
  "vehicleId": "veh_01J...",
  "inventoryKey": "dealer-a:stock-4582",
  "vin": null,
  "year": 2024,
  "make": "Ejemplo",
  "model": "Modelo X",
  "trim": "Touring",
  "market": "US",
  "condition": "USED",
  "status": "AVAILABLE",
  "sourceSystem": "dealer_csv",
  "sourceRecordId": "4582",
  "createdAt": "2026-09-27T00:00:00Z",
  "updatedAt": "2026-09-27T00:00:00Z"
}
```

Reglas:

- `vehicleId` es interno, estable e inmutable.
- `inventoryKey` debe ser único dentro del sistema de origen.
- El VIN es sensible y opcional; no se publica ni se entrega a la IA salvo necesidad explícita.
- Año, marca, modelo, versión y mercado forman parte de la identidad editorial y no se mezclan entre variantes.
- `status` mínimo: `AVAILABLE`, `RESERVED`, `SOLD`, `UNAVAILABLE`, `UNKNOWN`.
- El sistema conserva historial; no elimina una unidad porque deje de estar disponible.

#### VehicleFact

Representa una afirmación verificable, no una descripción libre sin origen.

```json
{
  "vehicleFactId": "fact_01J...",
  "vehicleId": "veh_01J...",
  "field": "engine.power_hp",
  "value": 250,
  "unit": "hp",
  "scope": "MODEL_TRIM",
  "verificationStatus": "VERIFIED",
  "sourceIds": ["src_01J..."],
  "verifiedAt": "2026-09-27T00:00:00Z",
  "verifiedBy": "technical-operator",
  "validUntil": null,
  "notes": null
}
```

Estados mínimos:

```text
UNVERIFIED -> IN_REVIEW -> VERIFIED
                      └-> CONFLICTED
VERIFIED -> STALE -> IN_REVIEW
```

#### Source

```json
{
  "sourceId": "src_01J...",
  "type": "MANUFACTURER_PAGE",
  "title": "Ficha técnica oficial",
  "publisher": "Fabricante",
  "url": "https://example.com/...",
  "retrievedAt": "2026-09-27T00:00:00Z",
  "publishedAt": null,
  "contentHash": "sha256:...",
  "archiveLocation": null,
  "reliabilityTier": 1,
  "locale": "es-US"
}
```

#### CommercialOffer

Separa hechos relativamente estables de información comercial volátil.

```json
{
  "offerId": "offer_01J...",
  "vehicleId": "veh_01J...",
  "price": {"amount": 25990, "currency": "USD"},
  "availability": "AVAILABLE",
  "promotionText": null,
  "financingText": null,
  "confirmedBy": "inventory-owner",
  "confirmedAt": "2026-09-27T00:00:00Z",
  "expiresAt": null,
  "status": "CONFIRMED"
}
```

Un dato comercial debe confirmarse nuevamente antes de publicación. La existencia de un registro anterior no autoriza a tratarlo como vigente.

#### Production

```json
{
  "productionId": "prd_01J...",
  "vehicleId": "veh_01J...",
  "title": "Ángulo editorial provisional",
  "state": "BORRADOR",
  "targetPlatforms": ["TIKTOK", "INSTAGRAM", "YOUTUBE", "FACEBOOK"],
  "targetDurationSeconds": 135,
  "createdBy": "technical-operator",
  "createdAt": "2026-09-27T00:00:00Z"
}
```

#### ArtifactVersion

Debe almacenar como mínimo:

- `artifactId`, `artifactType`, `version`, `parentVersion`.
- `productionId`.
- `workflowId`, `workflowVersion`, commit y runner.
- Input normalizado y ubicaciones de archivos.
- `lockedFactsHash` y lista de `vehicleFactId`.
- Autor, solicitante y motivo del cambio.
- Estado: `CANDIDATE`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `SUPERSEDED`.
- Fechas y aprobaciones asociadas.

#### Approval

Una aprobación se refiere a una versión exacta, nunca al concepto genérico de “guion” o “video”.

```json
{
  "approvalId": "apr_01J...",
  "productionId": "prd_01J...",
  "artifactId": "script",
  "artifactVersion": 3,
  "approvalType": "CREATIVE",
  "decision": "APPROVED",
  "decidedBy": "presenter",
  "decidedAt": "2026-09-27T00:00:00Z",
  "notes": null
}
```

Tipos mínimos: `FACTUAL`, `CREATIVE`, `COMMERCIAL`, `PUBLICATION`.

#### Publication y MetricSnapshot

`Publication` relaciona una versión de una pieza con plataforma, cuenta, identificador remoto, fecha, estado y paquete utilizado. `MetricSnapshot` registra métricas con fecha de captura; nunca sobrescribe el snapshot anterior.

### 28.2 Consultas mínimas del inventario

- Buscar por año, marca, modelo, versión, condición y disponibilidad.
- Recuperar todos los hechos verificados de una unidad.
- Recuperar fuentes de cada hecho.
- Identificar hechos contradictorios, vencidos o sin fuente.
- Mostrar cambios entre la última importación y el inventario actual.
- Obtener vehículos disponibles que todavía no tengan producción.
- Detectar una producción cuyo precio o disponibilidad cambiaron después de aprobar el guion.

## 29. Política de fuentes y verificación

### 29.1 Jerarquía inicial

1. Documentación oficial del fabricante correspondiente al año, versión y mercado.
2. Etiqueta, manual o documento oficial del vehículo específico.
3. Inventario autorizado o confirmación del responsable comercial para precio, kilometraje y disponibilidad.
4. Organismos públicos o bases regulatorias para seguridad, recalls o consumo cuando aplique.
5. Fuentes editoriales reputadas como apoyo secundario.

Una fuente secundaria no reemplaza una fuente oficial disponible. La IA puede encontrar candidatos, pero el operador confirma la correspondencia exacta entre fuente, mercado, año y versión.

### 29.2 Reglas de uso

- Cada afirmación cuantitativa debe referenciar al menos un `vehicleFactId`.
- Una comparación debe indicar contra qué vehículo, versión, año y criterio se realiza.
- No se transforma una ausencia de información en una afirmación negativa.
- Si dos fuentes confiables difieren, el hecho queda `CONFLICTED` y no pasa al guion como dato cerrado.
- Precio, disponibilidad, promoción, garantía y financiamiento requieren confirmación vigente en el gate comercial.
- Las URLs, títulos, publicadores y fechas de consulta se conservan aunque el contenido deje de estar disponible.
- La descripción de una publicación puede incluir fuentes cuando la plataforma lo permita, pero la trazabilidad interna siempre es obligatoria.

### 29.3 Freshness

La vigencia no se codifica inicialmente con un único número global. Cada tipo de hecho declara su política en configuración. Como regla operativa:

- Datos comerciales se reconfirman antes de publicar.
- Disponibilidad se reconfirma el día de publicación.
- Especificaciones técnicas se invalidan si cambia año, versión, mercado o fuente canónica.
- Hechos sin política explícita se consideran sujetos a revisión durante la aprobación factual.

## 30. Importación y mantenimiento del inventario

### 30.1 Flujo de importación

```text
Archivo recibido
-> copia inmutable del original
-> detección de tipo y encoding
-> mapeo de columnas
-> validación de filas
-> normalización
-> deduplicación
-> preview de cambios
-> aprobación del operador
-> upsert transaccional
-> reporte de importación
```

### 30.2 Carpetas de intercambio

```text
data/
├── imports/
│   ├── incoming/       # archivos aún no procesados
│   ├── archived/       # originales inmutables
│   └── rejected/       # archivos rechazados con reporte
├── mappings/           # mapeos versionados por proveedor
└── fixtures/           # datos ficticios sin información real
```

Estas carpetas no son el inventario. La base de datos es la fuente de verdad.

### 30.3 Contrato del importador

Input mínimo:

```yaml
source_system: dealer_csv
file_path: data/imports/incoming/inventory.csv
mapping_version: dealer_csv@1.0.0
mode: preview
requested_by: technical-operator
```

Output mínimo:

```yaml
import_id: imp_01J...
status: PREVIEW_READY
rows_total: 100
rows_valid: 96
rows_rejected: 4
creates: 10
updates: 82
unchanged: 4
warnings: []
error_report_path: artifacts/imports/imp_01J.../errors.csv
```

Ningún archivo real se confirma en modo `preview`. El modo `apply` exige el identificador del preview aprobado y su hash.

## 31. Flujo operativo end to end

| Paso | Estado resultante | Entrada | Resultado oficial | Responsable | Gate |
| --- | --- | --- | --- | --- | --- |
| 1. Selección | `BORRADOR` | Inventario consultable | Producción creada | Operador | Vehículo identificable |
| 2. Investigación | `INVESTIGANDO` | Vehículo y ángulo preliminar | Research bundle candidato | Instancia principal/subagente | Fuentes registradas |
| 3. Verificación | `DATOS_VERIFICADOS` | Hechos y fuentes | Fact set bloqueado | Operador | Aprobación factual |
| 4. Enfoque | `DATOS_VERIFICADOS` | Fact set y objetivo | Brief editorial | Operador + presentadora | Ángulo aceptado |
| 5. Guion | `GUION_GENERADO` | Brief y hechos | Guion candidato | Instancia principal | Schema válido |
| 6. Adaptación | `REVISION_PRESENTADORA` | Guion candidato | Revisión creativa | Presentadora | Hechos intactos |
| 7. Aprobación | `APROBADO` | Guion revisado | Guion aprobado | Presentadora + operador | Creativo y factual |
| 8. Preparación | `LISTO_PARA_GRABAR` | Guion aprobado | Plan de tomas | Operador/sistema | Checklist completo |
| 9. Grabación | `GRABADO` | Plan de tomas | Material registrado | Presentadora + operador | Ingesta completa |
| 10. Edición | `EDITADO` | Material y guion | Video principal candidato | Operador | QA técnico |
| 11. Clipping | `EDITADO` | Máster y estructura | Clips candidatos | Operador + IA | Cada clip tiene sentido propio |
| 12. Revisión final | `LISTO` | Máster, clips y captions | Paquete aprobado | Presentadora + operador | Gates creativo, factual y comercial |
| 13. Programación | `PROGRAMADO` | Paquete aprobado | Registros programados | Operador | Credenciales y horario |
| 14. Publicación | `PUBLICADO` | Programación | IDs y URLs remotas | Operador/herramienta aprobada | Confirmación remota |
| 15. Medición | `MEDIDO` | IDs remotos | Snapshots y análisis | Sistema + operador | Ventana registrada |

Una transición fallida no se salta. El sistema conserva el estado anterior y crea un evento de error.

## 32. Catálogo de workflows

| Workflow | Tipo | Entrada principal | Output principal | Delegación | Aprobación |
| --- | --- | --- | --- | --- | --- |
| `import-inventory` | Determinista | Archivo + mapping | Preview o import report | No | Operador |
| `research-vehicle` | IA + búsqueda | Vehicle + research brief | Research bundle | Sí, investigación | Operador |
| `validate-vehicle-data` | Híbrido | Research bundle | Verified fact set | Sí, verificación independiente | Operador |
| `select-content-angle` | IA asistida | Facts + audiencia | Editorial brief | Opcional | Ambos |
| `draft-vehicle-script` | IA | Brief + facts | Script draft | Sí, candidato nuevo | Operador |
| `draft-presenter-script` | IA guiada | Brief + hechos candidatos con fuentes | Vista previa de guion no oficial | No | Revisión técnica obligatoria; no publicable |
| `draft-promotional-script` | IA guiada | Identidad exacta + brief + investigación del vehículo con fuentes + oferta comercial opcional | Guion promocional con dos o tres hechos atractivos, marcadores comerciales inline y declaración de vigencia | No | Revisión comercial y factual obligatoria; no publicable |
| `adapt-presenter-script` | IA guiada | Script aprobado para revisión + preferencias | Script revision | Solo nueva investigación | Presentadora + operador |
| `create-shooting-plan` | IA guiada | Script aprobado | Shot list + checklist | Opcional | Operador |
| `ingest-footage` | Determinista | Upload manifest | Footage manifest | No | Operador |
| `propose-clips` | IA asistida | Transcript + timecodes | Clip plan | Sí, análisis acotado | Operador |
| `prepare-publication-package` | IA guiada | Approved assets + platform rules | Captions y metadata | Opcional | Operador |
| `publish-approved-content` | Determinista | Approved package | Publication records | No | Operador |
| `collect-performance` | Determinista | Publication IDs | Metric snapshots | No | Sistema |
| `analyze-performance` | IA | Snapshots + content metadata | Performance report | Sí, comparación | Operador |

Cada directorio de workflow contiene manifest, schemas, templates, prompt cuando corresponda, ejemplos y pruebas. Un workflow determinista no necesita un prompt vacío.

## 33. Contratos completos de guion

### 33.1 Input canónico de `draft-vehicle-script`

```yaml
production_id: prd_01J...
vehicle:
  vehicle_id: veh_01J...
  year: 2024
  make: Ejemplo
  model: Modelo X
  trim: Touring
  market: US
verified_facts:
  - fact_id: fact_01J...
    label: Potencia
    value: 250
    unit: hp
    source_ids: [src_01J...]
editorial_brief:
  audience: compradores que buscan un vehículo familiar
  angle: tres atributos útiles y una limitación honesta
  tone: claro, entretenido y natural
  target_duration_seconds: 135
  target_clip_count: 5
commercial_context:
  include_price: false
  include_availability: false
  include_financing: false
constraints:
  language: es
  format: vertical_video
  prohibited_claims: []
```

### 33.2 Output estructurado

```yaml
production_id: prd_01J...
workflow:
  id: draft-vehicle-script
  version: 1.0.0
script:
  title: Título interno
  target_duration_seconds: 135
  blocks:
    - id: hook
      target_range_seconds: [0, 5]
      spoken_text: Texto propuesto
      on_screen_text: Texto breve
      shot_intent: Presentación visual
      fact_refs: []
      clip_candidate: true
    - id: context
      target_range_seconds: [5, 20]
      spoken_text: Texto propuesto
      on_screen_text: null
      shot_intent: Identificar vehículo
      fact_refs: [fact_01J...]
      clip_candidate: false
  closing_cta:
    spoken_text: CTA aprobado para el piloto
    destination: PROFILE_OR_MAIN_VIDEO
fact_usage:
  - fact_id: fact_01J...
    used_in_blocks: [context]
source_notes:
  - source_id: src_01J...
    description_ready_text: Fuente oficial consultada
warnings: []
```

### 33.3 Invariantes del guion

- La suma de duraciones objetivo debe ser compatible con el rango aprobado.
- Cada bloque factual contiene `fact_refs` existentes y verificados.
- No se introducen precio, disponibilidad, promociones o financiamiento cuando los flags están en `false`.
- El hook puede ser creativo, pero no puede afirmar un hecho no sustentado.
- Cada clip candidato debe poder entenderse sin haber visto los bloques anteriores.
- El guion distingue limitaciones o incertidumbre cuando sean relevantes.

## 34. Contrato de adaptación por la presentadora

Input:

```yaml
production_id: prd_01J...
base_artifact:
  artifact_id: script
  version: 1
revision_request:
  requested_by: presenter
  instruction: Quiero que suene más natural y menos formal
  preferred_expressions: []
  phrases_to_avoid: []
editable_scope:
  - spoken_text
  - block_order
  - preferred_expressions
  - presenter_notes
locked_facts_hash: sha256:...
```

Output:

```yaml
base_version: 1
candidate_version: 2
changes:
  - block_id: context
    field: spoken_text
    before: Texto anterior
    after: Texto adaptado
    reason: naturalidad
locked_facts_hash: sha256:...
requires_technical_review: false
warnings: []
```

La skill debe presentar un resumen de cambios. Si el hash cambia, aparece un hecho nuevo o se solicita modificar un dato bloqueado, el resultado pasa a revisión técnica y no se oficializa.

## 35. Contratos de clipping y publicación

### 35.1 Clip plan

```yaml
production_id: prd_01J...
source_artifact:
  artifact_id: master_video
  version: 1
clips:
  - clip_id: clip_01
    start_timecode: "00:00:18.000"
    end_timecode: "00:00:43.000"
    purpose: atributo principal
    hook_text: Texto de entrada alternativo
    closing_text: Ver el video completo
    requires_pickup: true
    destination: main_video
    fact_refs: [fact_01J...]
    preferred_platforms: [TIKTOK, INSTAGRAM, YOUTUBE, FACEBOOK]
warnings: []
```

Los cuatro a seis clips son una meta editorial. El workflow puede devolver menos con una advertencia de calidad. No debe rellenar la cuota con fragmentos repetitivos o incompletos.

### 35.2 Publication package

```yaml
piece_id: clip_01
asset_version: 2
platform: INSTAGRAM
account_id: account_ref
caption: Texto adaptado
hashtags: []
cta:
  type: PROFILE_OR_RELATED_CONTENT
  target: main_video_ref
sources:
  - label: Ficha oficial
    url: https://example.com/...
disclosure:
  required: true
  text: Relación comercial claramente indicada
schedule:
  requested_at: null
approvals:
  creative: apr_...
  factual: apr_...
  commercial: apr_...
  publication: apr_...
```

El paquete es específico por plataforma. No se copia ciegamente el mismo caption, CTA, formato o audio.

## 36. Skills y contratos de interacción

### 36.1 Skills iniciales de la presentadora

#### `$generar-guion`

- Exige un paquete de investigación producido por `$investigar-vehiculo`, con identidad exacta, hechos candidatos y fuentes identificables.
- Convierte ese paquete en una vista previa mediante `draft-presenter-script`; no realiza investigación ni completa hechos faltantes.
- Selecciona dos o tres hechos pertinentes para la audiencia y el ángulo editorial, sin convertir el guion en una ficha técnica; si la investigación tiene menos de dos hechos utilizables, advierte que hace falta contexto.
- Si falta el paquete o la identidad exacta, indica que el operador debe completar `$investigar-vehiculo` y detiene la generación.
- Devuelve un documento Word en español con una tabla de cuatro columnas: tiempo/escena, guía visual breve, narración hablada y texto en pantalla. Las fuentes se presentan con nombres legibles, sin IDs internos.
- El JSON y los schemas son internos y no se muestran como respuesta a la presentadora.
- No guarda el input o el output, modifica inventario, verifica hechos, incluye claims comerciales ni oficializa artefactos.
- Exige revisión factual del operador y mantiene `publishable: false`.

#### `$generar-guion-promocional`

- Produce un borrador de venta separado del guion detallado y consume una investigación técnica previa de la unidad exacta.
- Selecciona solo dos o tres hechos atractivos y relevantes de la investigación para la audiencia y el ángulo promocional; no resume el paquete completo ni investiga hechos adicionales.
- No investiga ni confirma precios, promociones, disponibilidad, financiamiento, condiciones o vigencia. Puede usar literalmente información que la presentadora proporcione, con estado no verificado, para preparar el borrador.
- Coloca marcadores visibles en el texto hablado solo para campos faltantes o que la presentadora señale como inciertos. La vigencia se menciona en el cierre; cuando falte, usa `[VIGENCIA POR CONFIRMAR]` tanto en narración como en texto en pantalla.
- Conserva importes, fechas, condiciones y referencias de fuentes confirmadas sin alterarlos.
- Entrega un documento Word con las mismas cuatro columnas que la skill de reseñas detalladas. No muestra JSON, schemas, IDs de workflows, preguntas para la agencia ni anexos técnicos. Incluye una sola nota breve si quedan campos por confirmar.
- Requiere revisión comercial antes de grabar o publicar; siempre mantiene `publishable: false`.
- No persiste la oferta ni el borrador desde la skill.

#### `$adaptar-guion`

- Localiza la producción activa o solicita que la presentadora elija una.
- Muestra versión, estado y fecha del guion.
- Solicita únicamente preferencias de expresión o cambios creativos.
- Protege hechos, fuentes, claims y datos comerciales.
- Devuelve preview y resumen de diferencias.
- Requiere aprobación explícita antes de enviar el candidato a revisión.

#### `$preparar-grabacion`

- Exige un guion aprobado.
- Produce una vista simple por bloques: qué decir, qué mostrar y qué material capturar.
- Incluye entradas y cierres alternativos necesarios para clips.
- Permite marcar cada toma como pendiente, realizada o repetir.
- No modifica el guion ni inventa tomas que impliquen afirmaciones nuevas.

#### `$entregar-material`

- Solicita producción y tipo de material.
- Prepara cargas sin revelar credenciales.
- Calcula hash, tamaño, tipo y metadatos básicos.
- Confirma qué archivos quedaron asociados.
- Rechaza formatos, tamaños o producciones no permitidos con instrucciones claras.

### 36.2 Skills iniciales del operador

El plugin del operador debe ofrecer interfaces para:

- Importar y revisar inventario.
- Investigar un vehículo.
- Validar hechos y resolver conflictos.
- Seleccionar el ángulo editorial.
- Ejecutar el workflow técnico registrado `draft-vehicle-script` y revisar sus resultados; no ofrecer una skill genérica duplicada de generación de guiones a la presentadora.
- Generar planes de grabación.
- Registrar material, máster y clips.
- Preparar paquetes de publicación.
- Aprobar, programar y registrar publicaciones.
- Recopilar y analizar métricas.
- Inspeccionar trabajos fallidos y reintentos.

Los nombres definitivos de las skills pueden ajustarse antes de publicarlas, pero sus responsabilidades no deben agruparse en una skill genérica que dependa de prompts libres.

### 36.3 Formato de interacción

- Una skill pregunta solo por campos faltantes.
- Las preguntas deben ser cortas y comprensibles para el rol.
- La presentadora recibe documentos humanos en español y nunca recibe JSON crudo ni schemas; los contratos estructurados se conservan internamente para validación e indexación técnica.
- La skill muestra qué se modificará antes de ejecutar una acción irreversible.
- Errores deben indicar causa, elemento afectado y siguiente acción segura.
- La salida humana y la salida estructurada se generan desde el mismo resultado validado. Para la presentadora, el resultado estructurado se conserva internamente y la interfaz entrega el documento Word legible.

## 37. Política detallada de subagentes

### 37.1 Contrato de delegación

La instancia principal crea una solicitud acotada:

```yaml
delegation_id: del_01J...
production_id: prd_01J...
task_type: independent_fact_check
objective: Verificar un dato específico
allowed_inputs:
  fact_ids: [fact_01J...]
allowed_tools:
  - official_source_search
expected_output_schema: fact_check_delta@1.0.0
write_scope: none
deadline_or_budget: bounded
```

El subagente devuelve:

```yaml
delegation_id: del_01J...
status: COMPLETED
findings:
  - fact_id: fact_01J...
    conclusion: CONFIRMED
    source_candidates: [src_candidate_01]
proposed_changes: []
warnings: []
```

### 37.2 Reglas obligatorias

- Un subagente no sobrescribe el archivo oficial ni la versión vigente.
- Un subagente no modifica estados, no aprueba y no publica.
- Trabajos paralelos no escriben sobre el mismo artefacto.
- La instancia principal conserva el historial conversacional y resuelve contradicciones.
- Si el usuario pide modificar la salida de un subagente anterior, la instancia principal carga la salida previa del subagente, produce el diff y aplica la revisión.
- Solo la parte que requiere investigación independiente puede volver a delegarse.
- La instancia principal registra qué resultados de subagentes utilizó o descartó.
- La ausencia de soporte para subagentes no cambia el contrato; la instancia principal ejecuta la tarea localmente.

## 38. Proceso de revisión y modificación

1. Resolver la producción y la versión base exacta.
2. Clasificar la solicitud como creativa, factual, comercial, técnica o mixta.
3. Determinar campos editables y bloqueados.
4. Delegar únicamente investigación nueva e independiente, si aplica.
5. Generar un candidato nuevo sin sobrescribir la base.
6. Calcular diff estructurado y `lockedFactsHash`.
7. Validar schema, reglas de dominio y permisos.
8. Presentar cambios al aprobador correspondiente.
9. Persistir una nueva versión aprobada.
10. Marcar la versión anterior como `SUPERSEDED`, sin eliminarla.

Una instrucción como “hazlo más natural” no permite cambiar potencia, precio, disponibilidad, garantías ni afirmaciones comerciales. Una instrucción como “cambió el precio” requiere un nuevo dato comercial confirmado y vuelve a abrir los gates factual y comercial.

## 39. Producción audiovisual, clipping y distribución

### 39.1 Video principal

- Formato vertical como máster inicial.
- Duración de prueba: 120 a 150 segundos.
- El rango se valida con retención y puede ajustarse; no es una regla permanente.
- Guion modular: hook, contexto, bloques independientes y cierre.
- Grabar entradas y cierres alternativos cuando un bloque se pretenda reutilizar como clip.
- Subtítulos y textos en pantalla se verifican contra los mismos hechos del guion.

### 39.2 Clips

- Duración objetivo: 15 a 35 segundos.
- Cada clip tiene una idea completa y un motivo para consultar el principal.
- Puede reutilizar timecodes, pero necesita hook y cierre adecuados al contexto.
- No se agregan marcas de agua de otra plataforma.
- El número de clips depende del material; calidad prevalece sobre cuota.

### 39.3 Música y derechos

- El máster multiplataforma utiliza audio propio o con licencia compatible.
- Música disponible dentro de una plataforma no se presume reutilizable en otra.
- Se documentan licencia, origen y restricciones del audio utilizado.
- Se registran permisos de grabación y uso de imagen cuando aparezcan terceros, instalaciones o elementos identificables.

### 39.4 Publicación progresiva

- El piloto puede usar un programador comercial auditado y pasos manuales.
- No se promete publicación directa por API en todas las plataformas desde el primer día.
- Una integración propia necesita revisión separada de permisos, límites y auditorías de plataforma.
- La publicación manual debe registrar igualmente ID remoto, URL, fecha y paquete utilizado.
- “Estados” debe asociarse a una plataforma concreta; no se asume que todas permiten automatización oficial.

### 39.5 Gates previos

Antes de programar o publicar deben existir:

1. Aprobación creativa de la presentadora.
2. Aprobación factual del operador.
3. Confirmación comercial cuando haya precio, disponibilidad, promoción o financiamiento.
4. Verificación de derechos y divulgación comercial cuando corresponda.
5. Validación técnica del archivo y metadata.
6. Aprobación de publicación para esa versión y plataforma.

## 40. Métricas y atribución

El sistema registra por publicación:

- Vistas y reproducciones comprometidas cuando la plataforma las diferencie.
- Retención inicial y porcentaje promedio visto.
- Reproducciones completas.
- Compartidos, guardados, comentarios y visitas al perfil.
- Clics, mensajes, solicitudes de información y pruebas de manejo cuando sea medible.
- Tráfico desde historias o estados al video principal cuando exista mecanismo de atribución.
- Tiempo de investigación, guion, grabación, edición, clipping y publicación.

Las métricas deben conservar:

- Plataforma, cuenta, publicación y fecha de captura.
- Definición del indicador utilizada por la plataforma.
- Ventana desde publicación.
- Valor bruto y, cuando sea posible, denominador.

No se comparan directamente métricas con definiciones diferentes sin aclararlo. Los análisis de IA proponen interpretaciones; el operador decide cambios de formato.

## 41. Almacenamiento de archivos y convenciones

Estructura lógica de objetos:

```text
productions/{productionId}/
├── research/{artifactVersion}/
├── scripts/{artifactVersion}/
├── shooting-plans/{artifactVersion}/
├── footage/{uploadId}/
├── masters/{artifactVersion}/
├── clips/{clipId}/{artifactVersion}/
├── publication-packages/{platform}/{artifactVersion}/
└── reports/{artifactVersion}/
```

Reglas:

- Los nombres visibles pueden cambiar; IDs y claves canónicas no.
- Los originales no se sobrescriben.
- Cada archivo conserva hash, tamaño, MIME type, creador y fecha.
- No se usa el nombre del archivo como identificador único.
- La política de retención permanece pendiente, pero borrar debe ser una operación explícita y auditable.
- Backups y versionado de objetos se activan antes de almacenar material irremplazable.

## 42. API y permisos por rol

### 42.1 Recursos lógicos

```text
/inventory-imports
/vehicles
/vehicle-facts
/productions
/artifacts
/approvals
/uploads
/jobs
/publications
/metrics
```

Los endpoints concretos se derivan de estos recursos después de validar el flujo local. No se implementan endpoints genéricos que permitan ejecutar comandos o prompts arbitrarios.

### 42.2 Matriz mínima

| Acción | Presentadora | Operador | Worker local | Sistema |
| --- | --- | --- | --- | --- |
| Consultar producción asignada | Sí | Sí | Limitado | Sí |
| Investigar vehículo y entregar paquete de fuentes candidato | No | Sí | No | Valida |
| Solicitar vista previa no oficial con hechos candidatos enlazados a fuentes | Sí | Sí | No | Valida |
| Adaptar campos creativos | Sí | Sí | No | Valida |
| Modificar hechos | No | Sí, con evidencia | No | Valida |
| Aprobar creativo | Sí | Sí | No | Registra |
| Aprobar factual/comercial | No | Sí | No | Registra |
| Solicitar upload | Sí | Sí | No | Autoriza |
| Reclamar trabajo | No | No | Sí | Autoriza lease |
| Oficializar artefacto | No directo | Sí | No | Persiste |
| Programar/publicar | No directo | Sí | Solo workflow autorizado | Registra |
| Administrar workflows | No | Sí | No | Valida versión |

## 43. Confiabilidad, observabilidad y runbooks

### 43.1 Eventos mínimos

- Trabajo creado, reclamado, iniciado, validado, completado o fallido.
- Lease expirado.
- Reintento programado.
- Artefacto generado, aprobado, rechazado o superado.
- Hecho creado, verificado, marcado conflictivo o vencido.
- Upload solicitado, completado o rechazado.
- Publicación programada, confirmada o fallida.
- Cambio de permisos, workflow o configuración.

### 43.2 Alertas iniciales

- Crecimiento de dead-letter queue.
- Trabajo sin completar más allá del umbral configurado.
- Error repetido de validación de schema.
- Intento de usar workflow no aprobado.
- Presupuesto acercándose al límite.
- Upload inesperadamente grande o de tipo no permitido.
- Publicación con aprobación faltante.

### 43.3 Runbooks requeridos

```text
docs/runbooks/
├── failed-job.md
├── expired-lease.md
├── invalid-ai-output.md
├── stale-commercial-data.md
├── failed-upload.md
├── failed-publication.md
├── credential-rotation.md
└── restore-artifact.md
```

Cada runbook debe incluir síntomas, diagnóstico, acción segura, datos que no deben borrarse y criterio de cierre.

## 44. Estrategia de pruebas

### 44.1 Contratos

- Todos los ejemplos válidos pasan el schema.
- Fixtures inválidos fallan con error tipado.
- Templates incluyen todos los campos requeridos.
- Manifests referencian archivos existentes.

### 44.2 Dominio

- Transiciones permitidas y prohibidas.
- Bloqueo de hechos y verificación de hashes.
- Creación de versiones y preservación de padres.
- Idempotencia y deduplicación.
- Roles y permisos.

### 44.3 Workflows de IA

- Golden tests con datasets ficticios.
- Casos con datos faltantes.
- Casos con fuentes contradictorias.
- Intentos de cambiar un hecho mediante adaptación creativa.
- Outputs mal formados o incompletos.
- Variación controlada del tono sin pérdida factual.

### 44.4 Integración local

- Importar inventario ficticio.
- Crear producción.
- Investigar y verificar hechos.
- Generar y adaptar guion.
- Crear plan de grabación.
- Simular entrega de material y clipping.
- Preparar paquete sin publicar.
- Reconstruir auditoría completa.

### 44.5 Seguridad

- Prompt injection dentro de datos importados o transcripciones.
- Path traversal y nombres de archivo hostiles.
- Tipos MIME falsos.
- Intentos de usar shell o workflow no permitido.
- Acceso de presentadora a campos o endpoints de operador.
- Secretos en logs o artefactos.

## 45. CI y control de cambios

Un pull request no puede integrarse si falla cualquiera de estos checks:

1. Formato y tipos de TypeScript.
2. Validación de JSON Schema, YAML y manifests.
3. Referencias internas y versiones.
4. Pruebas de contratos y dominio.
5. Pruebas de permisos.
6. Detección de secretos.
7. Revisión de `CODEOWNERS` cuando se modifican rutas protegidas.

Los cambios incompatibles de contrato requieren versión mayor y nota de migración. Un cambio de prompt que pueda alterar comportamiento incrementa versión del workflow aunque el schema no cambie.

## 46. Contenido mínimo de AGENTS.md

`AGENTS.md` debe indicar al agente:

- Leer esta especificación antes de implementar.
- Inspeccionar el worktree y preservar cambios ajenos.
- No desplegar ni conectar servicios sin autorización explícita.
- Usar contratos y templates; no introducir prompts libres en código.
- Mantener a la presentadora fuera de detalles técnicos.
- Aplicar revisiones de outputs previos en la instancia principal.
- Delegar solo tareas acotadas y sin escritura oficial.
- Validar hechos y conservar fuentes.
- Ejecutar pruebas pertinentes antes de declarar terminado un cambio.
- Actualizar documentación y ADR cuando una decisión cambie.
- No almacenar secretos, videos reales o datos sensibles en Git.
- Tratar esta especificación como fuente de verdad hasta una revisión aprobada.

## 47. Incrementos concretos de implementación

### Incremento A — Bootstrap verificable

Entregables:

- Workspace `pnpm` funcional.
- `AGENTS.md`, README, estructura de docs y CI básica.
- Paquetes `contracts` y `domain` compilables.
- Plugins con manifests y skills vacías pero válidas.
- Sin llamadas reales a AWS o redes sociales.

### Incremento B — Inventario local

Entregables:

- Schemas de `Vehicle`, `VehicleFact`, `Source`, `CommercialOffer` e import report.
- Importador CSV en modo preview y apply.
- Persistencia local reemplazable detrás de repositorios.
- Fixture ficticio y pruebas de deduplicación.
- Consulta de vehículos y hechos verificados.

### Incremento C — Primer flujo de IA

Entregables:

- `research-vehicle`, `validate-vehicle-data` y `draft-vehicle-script` completos.
- Templates de input y output.
- Ejemplos, golden tests y validación.
- Runner local limitado a workflows registrados.

### Incremento D — Experiencia de presentadora

Entregables:

- `$investigar-vehiculo` del operador para preparar el paquete investigado y su handoff en español.
- `$generar-guion` de la presentadora para convertir únicamente ese paquete en una vista previa no oficial, con revisión factual obligatoria.
- `$adaptar-guion`, `$preparar-grabacion` y `$entregar-material`.
- Manejo de preguntas faltantes.
- Diffs y protección de campos bloqueados.
- Prueba de uso sin JSON, Git, AWS, n8n ni credenciales.

### Incremento E — Orquestación local

Entregables:

- n8n mediante Docker Compose.
- Polling o endpoint local controlado.
- Jobs, leases, reintentos e idempotencia simulados.
- Producción ficticia end to end sin publicación.

### Incremento F — AWS mínimo

Solo después de aprobación:

- Budget y alertas primero.
- Infraestructura mediante CDK.
- S3, DynamoDB, SQS, DLQ, Lambda, API Gateway y logs.
- Integración con el worker local.
- Pruebas de recuperación.

## 48. Definición de terminado por fase

Una fase no termina porque exista código. Requiere:

- Entregables presentes y documentados.
- Schemas y ejemplos válidos.
- Pruebas automáticas aprobadas.
- Sin secretos o datos reales no autorizados.
- Decisiones nuevas registradas.
- Instrucciones de ejecución verificadas desde un checkout limpio.
- Limitaciones conocidas y trabajo pendiente visibles.
- Aprobación del operador cuando la fase modifica contratos o infraestructura.

## 49. Registro consolidado de riesgos

| Riesgo | Impacto | Control |
| --- | --- | --- |
| IA inventa datos | Alto | Hechos bloqueados, fuentes y aprobación factual |
| Datos comerciales vencidos | Alto | Confirmación previa a publicación y estado `STALE` |
| La presentadora necesita prompts técnicos | Alto | Skills guiadas y templates humanos |
| Subagentes pierden contexto o sobrescriben | Alto | Candidatos inmutables; integración solo por instancia principal |
| Publicación duplicada | Alto | Idempotencia y registro de identificador remoto |
| APIs de redes bloquean automatización | Medio/alto | Scheduler aprobado y pasos manuales durante piloto |
| Sesenta piezas se confunden con sesenta posts | Medio | Distinguir pieza de publicación en dominio y métricas |
| Cuatro a seis clips reducen calidad | Medio | Meta no obligatoria y gate editorial |
| Equipo local apagado | Medio | Cola y estado persistentes; worker intermitente |
| Credenciales expuestas | Alto | Secrets fuera de Git y runner no público |
| Costos AWS o almacenamiento crecen | Medio | Serverless, budgets, lifecycle y medición |
| Una sola persona concentra operación | Medio | Runbooks, contratos, auditoría y recuperación |
| Música o imagen sin derechos | Alto | Registro de licencias, permisos y revisión final |
| Métricas incomparables | Medio | Snapshots con definición y ventana |

## 50. Decisiones confirmadas, pendientes y prohibiciones de inferencia

### 50.1 Confirmado

- El proyecto se ejecutará; no está en fase de decidir si se hace.
- La presentadora es imagen y voz; puede adaptar, reordenar, acortar o reescribir su texto.
- La presentadora puede solicitar vistas previas de guion no oficiales; no puede verificar hechos ni oficializar el resultado.
- El operador conserva control técnico, factual, de publicación e integración.
- Todo flujo textual de IA usa input y output definidos, templates y schemas.
- La presentadora trabajará principalmente mediante skills.
- Los subagentes sirven para tareas nuevas y acotadas; revisiones se integran en la instancia principal.
- El inventario será una fuente de verdad consultable, no una carpeta por vehículo.
- Los hechos guardan fuente y fecha de verificación.
- El piloto es un video principal de 120 a 150 segundos con objetivo de cuatro a seis clips.
- La meta inicial posterior es cuatro principales y 16 a 24 clips; sesenta piezas es capacidad futura.
- La capacidad futura de sesenta piezas se modela como 10 videos principales + 50 clips, no como sesenta videos principales.
- La automatización y publicación se introducen progresivamente con aprobación humana.
- La arquitectura objetivo es híbrida: skills, ejecución local controlada y persistencia serverless en AWS.
- El presupuesto mensual máximo conciliado para herramientas, IA e infraestructura es USD 120/mes, salvo aprobación posterior.

### 50.2 Pendiente y no inferible

- Nombre comercial y nombre definitivo del repositorio.
- Región y cuenta AWS.
- Proveedor de programación social.
- Política de retención.
- Identidad técnica de la presentadora.
- CTA, recepción y tratamiento de contactos.
- Primer vehículo o dataset del piloto.
- Cuentas sociales y permisos disponibles.
- Música o proveedor de licencias.

### 50.3 Prohibido asumir

- Que una API permitirá publicación pública sin auditoría o aprobación.
- Que todo video producirá seis clips útiles.
- Que una fuente encontrada por IA es verdadera por sí sola.
- Que un precio o vehículo siguen disponibles por aparecer en una importación anterior.
- Que una aprobación de una versión cubre versiones posteriores.
- Que la presentadora manejará Git, JSON, credenciales, AWS o n8n.
- Que un subagente puede modificar el artefacto oficial.
- Que “60 piezas” significa 60 videos principales o solo 60 acciones de publicación.
- Que el repositorio está limpio o que puede renombrarse.

## 51. Matriz de trazabilidad de acuerdos

| Acuerdo | Secciones |
| --- | --- |
| Inputs y outputs obligatorios para IA textual | 12, 32, 33, 34, 35 |
| Presentadora limitada a skills guiadas | 13, 36, 42 |
| Guion promocional con términos y vigencia explícitos | 32, 36, 42, 44 |
| Delegación por propósito | 14, 32, 37 |
| Revisión de outputs anteriores por instancia principal | 14, 37, 38 |
| Inventario canónico y hechos con fuentes | 28, 29, 30 |
| Flujo end to end y responsabilidades | 5, 9, 31 |
| Guion modular y clipping | 3, 33, 35, 39 |
| Aprobación humana | 4, 28, 31, 39 |
| Arquitectura local más AWS | 6, 7, 16, 47 |
| Versionado y hechos bloqueados | 15, 34, 38 |
| Seguridad y permisos | 17, 19, 42, 44, 45 |
| Métricas y aprendizaje | 31, 40 |
| Presupuesto máximo | 20, 49, 50 |
| Estado de ejecución y reanudación | 1, 22, 47, 52 |

## 52. Instrucción exacta para el agente que recibe este archivo

El agente debe comenzar así:

1. Leer este documento completo; no resumirlo como sustituto de su lectura.
2. Inspeccionar el repositorio y reportar diferencias entre estado real y estructura objetivo.
3. Crear una checklist de los incrementos A y B.
4. Identificar decisiones pendientes que realmente bloqueen el siguiente cambio; no preguntar por las que no bloquean.
5. Implementar el incremento más pequeño verificable, empezando por bootstrap y contratos de inventario.
6. No desplegar infraestructura externa, conectar cuentas, crear credenciales reales ni publicar contenido real sin autorización explícita.
7. Al terminar cada incremento, entregar:
   - archivos modificados;
   - pruebas ejecutadas y resultados;
   - decisiones tomadas o pendientes;
   - riesgos detectados;
   - punto exacto de reanudación.

Si una parte de la especificación parece ambigua, el agente debe citar la sección afectada, explicar las interpretaciones posibles y detener únicamente la decisión bloqueada. No debe reconstruir el diseño desde cero ni sustituir silenciosamente una decisión ya documentada.
