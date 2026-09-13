# Coordinación entre Claude Code y Codex

## Intercambio periódico preparado el 2026-09-11

El procedimiento vigente de intercambio está en `task/coordinacion-automatica.md`, con buzones separados en `task/intercambio/`. Codex tiene un heartbeat activo cada dos minutos. La activación de `/loop` en Claude queda pendiente de su acuse con ID real. Los mensajes tienen identificadores para no ejecutar dos veces un encargo; cuando no hay novedades, se permanece en silencio. Este mecanismo sustituye la retransmisión manual después de esa activación inicial.

## Actualización de responsabilidades del 2026-09-11

Por petición expresa del usuario, Codex pasa a dirigir el análisis, priorización, diseño técnico y revisión; Claude Code ejecuta la implementación, verificaciones e integración. Este reparto sustituye las asignaciones anteriores que daban a Codex implementación de frentes nuevos. Se conservan los propietarios de archivos, el turno único de verificación y la documentación a cargo de Claude.

Encargo actual: `task/coordinacion-direccion-codex-2026-09-11.md`. Claude debe acusar recepción y entregar evidencia en su propio registro antes del siguiente frente. La publicación de un archivo no equivale a que la sesión de Claude lo haya leído.

Fecha: 2026-09-10. Estado: aprobado por el usuario y aceptado por Claude Code con ajustes publicados en `task/coordinacion-inicio-claude.md`, leídos por Codex. El canal compartido son estos archivos; no existe notificación automática.

## Acuerdo activado

Claude conserva F20, sus archivos reservados y el turno de verificación. Codex acepta como primera tarea la revisión de solo lectura del rango fijo `d29da8e..403bd29`; su ejecución y entrega están pendientes. No se revisará el árbol mutable como si perteneciera a ese rango.

El resello de `scripts/home-js-baseline.json` y `BASELINE_DIGEST` corresponde exclusivamente al integrador. P4 es un candidato posterior, todavía sin reservar. Claude conserva también la escritura del plan, las lecciones y el registro del vault; Codex le entrega las entradas propuestas mediante su registro. El registro inicial en el vault ya se había completado antes de leer esta reserva.

Claude advierte de diferencias entre los manuales del repositorio. Su aviso no cambia por sí solo la precedencia de las instrucciones: antes de implementar, se contrastarán los archivos vigentes y cualquier conflicto vinculante se resolverá conforme a las reglas del usuario.

Las secciones siguientes conservan el procedimiento general. Los pasos iniciales de comunicación y aceptación ya se han cumplido; las reservas vigentes se consultan en los registros de cada agente.

## Objetivo y punto de partida

Dividir el trabajo sin sobrescribir cambios, duplicar arreglos ni contaminar las mediciones. Este protocolo complementa AGENTS.md y RULES.md; no cambia los criterios de aceptación ni autoriza publicaciones adicionales.

Fuentes consultadas: `task/todo.md`, `task/lessons.md`, `RULES.md` y el estado real de Git. En la inspección, la rama era `feature/general-refactoring` y HEAD era `403bd2935ad9b42f64e3905bd58164c3fd0fb5df`, con cambios sin commit. Esta referencia es una fotografía, no una base estable para implementar.

El plan registra F20, P3b-2, P5 y P4 pendientes, interferencias entre gates y una pausa hasta que el dueño libere la máquina. No se puede confirmar desde esos archivos qué proceso está ejecutando Claude en este momento. La pausa y el orden vigente se respetan hasta su actualización explícita.

## Reparto inicial

| Responsabilidad | Responsable propuesto | Límite |
| --- | --- | --- |
| Mejora en curso, F20 y frentes ya abiertos | Claude Code | Conserva la ejecución y los archivos que ya tiene en curso. |
| Plan maestro `task/todo.md` | Claude Code | Un único editor; Codex entrega propuestas por separado. |
| Revisión de cambios, requisitos y riesgos | Codex | Lectura del diff acordado; hallazgos con archivo, evidencia y criterio de aceptación. |
| Arreglos nuevos de Codex | Codex, tras asignación aceptada | Lista explícita de archivos y base Git acordada; no tomar pendientes unilateralmente. |
| Integración, commits y actualización de graphify | Claude Code | Integra únicamente entregas aceptadas; conserva las autorizaciones vigentes de commit/push. |
| Gate completo y mediciones de navegador | Un ejecutor por turno | El integrador concede el turno; nadie lanza otro gate, build o servidor concurrente. |
| Cambios de alcance y resolución de desacuerdos | Usuario | Recibe opciones concretas con evidencia cuando los agentes no convergen. |

Hasta que Claude acepte el reparto, Codex solo prepara documentación y revisiones de lectura. Los archivos modificados o nuevos existentes se consideran ocupados, sin atribuir su autoría a partir de Git.

## Canal compartido y reserva de tareas

El canal es el sistema de archivos compartido. Cada agente lee los registros antes de empezar y al entregar; no hay notificaciones ni sondeo automático. El usuario solo necesita transmitir el mensaje inicial si Claude no conoce este documento.

Para cada tarea, crear dos archivos locales en `task/`: `coordinacion-<id>-claude.md` y `coordinacion-<id>-codex.md`. Cada agente escribe únicamente su archivo. `task/` está ignorado salvo `lessons.md`: estos registros se comparten entre sesiones del mismo árbol, no mediante Git.

Cada registro incluye:

```text
ID y fecha/hora con zona:
Estado: propuesto | aceptado | en curso | bloqueado | entregado | integrado
Objetivo y criterio de aceptación:
Responsable:
Ruta absoluta del checkout:
Rama y HEAD base:
Archivos reservados (lista exacta):
Archivos compartidos que se necesitan:
Dependencias y exclusiones:
Turno de verificación: solicitado | concedido | ocupado | liberado
Evidencia: comandos, salida, código de salida y rutas de logs
Entrega: commit o parche explícito; nunca “todo el árbol”
Pendientes y riesgos:
Aceptación o rechazo de la entrega, con motivo:
```

Una propuesta no equivale a reserva: ambos registros deben reconocer la misma asignación antes de editar código. Si coinciden archivos, Claude reasigna o secuencia el trabajo. Una reserva no caduca por silencio ni por tiempo transcurrido; su propietario la libera o el usuario resuelve el bloqueo.

## Ejecución segura

1. Antes de editar, comprobar rama, HEAD y estado del árbol. Si la base cambió, revisar el cambio y actualizar la asignación antes de continuar.
2. Preferir un worktree para la implementación paralela de Codex. Crearlo desde un commit acordado: un worktree no contiene los cambios sin commit del árbol principal. Si la tarea depende de ellos, esperar a un punto de entrega estable.
3. Un solo escritor por archivo, también para tests, traducciones, baselines, documentación y lecciones. No hacer limpiezas, resets, stashes o formateos globales sobre trabajo ajeno.
4. Codex entrega los hallazgos al propietario del módulo; no arregla a la vez el mismo defecto. Cada hallazgo distingue hecho observado, hipótesis y verificación pendiente.
5. Antes de tests con mutación deliberada, reservar también el archivo afectado. Nunca inyectar un bug temporal en el árbol activo de otro agente.
6. Builds, gates, servidores y mediciones requieren un turno explícito, incluso en worktrees: el aislamiento de archivos no aísla CPU ni puertos. Declarar checkout, directorio de salida y puerto. No detener procesos ajenos.
7. Respetar los procesos de máximo 60 minutos documentados en el plan vigente. Si no cabe la verificación, registrar pendiente y dividir el frente; no declarar éxito parcial como tarea cerrada.

## Entrega e integración

Codex entrega un commit o parche acotado, resumen del cambio, archivos exactos, base, verificaciones ejecutadas y riesgos. Claude revisa y acepta o rechaza con motivo antes de integrar. El gate se repite sobre el resultado integrado; un verde anterior no certifica un árbol que cambió después.

Para código, el cierre mantiene los requisitos del proyecto: `pnpm run ci`, build y comprobaciones adicionales que requiera el frente, pruebas visuales cuando apliquen y `graphify update .`. Guardar la salida real y la identidad del árbol probado, incluyendo cualquier diff sin commit. No rebajar los candados para obtener verde.

Claude incorpora al plan maestro el resultado integrado. Las lecciones y el registro del vault se coordinan con un único escritor para cada nota. Para una tarea exclusivamente documental, declarar expresamente que tests de producto, build y graphify no aplican.

## Arranque inmediato

1. Claude lee este documento y publica su alcance activo, archivos reservados, pausa o ejecución vigente y aceptación o ajustes del reparto.
2. Codex propone una primera revisión independiente del diff de un frente que Claude declare listo. El alcance concreto queda por completar hasta recibir esa referencia.
3. Claude mantiene los frentes actuales; solo se abre implementación de Codex cuando existe una asignación sin solapamiento.

Mensaje inicial para Claude Code:

> Lee `docs/coordinacion-claude-codex.md`. Mantén la mejora e integración actuales. Publica tu frente activo, archivos reservados y estado del turno de verificación en `task/coordinacion-inicio-claude.md`; confirma o ajusta el reparto. Codex asumirá revisión independiente y solo implementará tareas con archivos y base acordados. Respeta la pausa vigente y evita gates o builds concurrentes. El protocolo está preparado, pero no presupone tu aceptación.
