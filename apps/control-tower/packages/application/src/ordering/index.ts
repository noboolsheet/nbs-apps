import { and, eq, inArray } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { Database } from '@ct/db';
import {
  strategicAreas,
  goals,
  projects,
  projectPhases,
  deliverables,
  tasks,
  portfolioItems,
} from '@ct/db/schema';
import { reorderSchema } from '@ct/validation';
import { AppError } from '@ct/shared';
import { requireCan, orgEq, type OrgContext } from '../auth/index';
import { recordAudit } from '../audit/index';
import { mapDbError } from '../errors';

/**
 * E-12 — **orden manual de filas** (arrastrar, o mover con ↑/↓).
 *
 * Sólo tiene sentido donde el orden *lo decide la persona*: un área estratégica va antes que otra porque ella lo
 * dice, no porque se creara antes. En el resto de listas el orden es un criterio (vencimiento, fecha, nombre) y un
 * orden manual competiría con él; por eso esto es una **allowlist corta** y no una capacidad de todas las tablas.
 *
 * Dos cosas que no son cosméticas:
 *  - **`parent`**: los hijos se reordenan *dentro de su padre*. Sin comprobarlo, un payload podría mezclar
 *    entregables de dos proyectos y dejar los dos órdenes revueltos.
 *  - **`org` / `parentScope`**: `project_phases` **no tiene `organization_id`** (se acota por su proyecto, doc 5
 *    §17). Si se asumiera que todas las tablas la tienen, el filtro de organización de esa entidad sería un
 *    `undefined` silencioso — es decir, ninguna barrera. Cuando no hay columna propia, el aislamiento se
 *    comprueba contra el padre.
 */
interface ReorderableMeta {
  table: PgTable;
  /** Columna `sort_order` (la que usan las consultas para ordenar). */
  sort: AnyPgColumn;
  /** Columna del padre: todos los ids reordenados tienen que compartirla (y no ser null). */
  parent?: AnyPgColumn;
  /** `organization_id` de la tabla, si la tiene. */
  org?: AnyPgColumn;
  /** Cuando NO hay `org`: por dónde se comprueba el aislamiento (la tabla del padre). */
  parentScope?: { table: PgTable; id: AnyPgColumn; org: AnyPgColumn };
  /** entityType con el que se audita (para `subtask` es `task`, que es lo que son sus filas). */
  auditEntity: string;
}

export const REORDERABLE: Record<string, ReorderableMeta> = {
  strategic_area: {
    table: strategicAreas,
    sort: strategicAreas.sortOrder,
    org: strategicAreas.organizationId,
    auditEntity: 'strategic_area',
  },
  portfolio_item: {
    table: portfolioItems,
    sort: portfolioItems.sortOrder,
    org: portfolioItems.organizationId,
    auditEntity: 'portfolio_item',
  },
  goal: {
    table: goals,
    sort: goals.sortOrder,
    parent: goals.strategicAreaId,
    org: goals.organizationId,
    auditEntity: 'goal',
  },
  deliverable: {
    table: deliverables,
    sort: deliverables.sortOrder,
    parent: deliverables.projectId,
    org: deliverables.organizationId,
    auditEntity: 'deliverable',
  },
  // Las tareas de proyecto y la vista global se ordenan por vencimiento; el orden manual es cosa de las SUBtareas
  // dentro de su padre. De ahí que la clave sea `subtask` y no `task`.
  subtask: {
    table: tasks,
    sort: tasks.sortOrder,
    parent: tasks.parentTaskId,
    org: tasks.organizationId,
    auditEntity: 'task',
  },
  project_phase: {
    table: projectPhases,
    sort: projectPhases.sortOrder,
    parent: projectPhases.projectId,
    // Sin `organization_id` propia: el aislamiento va por el proyecto.
    parentScope: { table: projects, id: projects.id, org: projects.organizationId },
    auditEntity: 'project_phase',
  },
};

function meta(entityType: string): ReorderableMeta {
  const m = REORDERABLE[entityType];
  if (!m) {
    throw new AppError({
      code: 'NOT_REORDERABLE',
      kind: 'VALIDATION',
      message: `La lista de «${entityType}» no se ordena a mano`,
    });
  }
  return m;
}

function invalid(code: string, message: string): AppError {
  return new AppError({ code, kind: 'VALIDATION', message });
}

/**
 * Guarda el orden nuevo: `sort_order` = posición en `ids` (1..n). Recibe la lista **completa y en orden** de la
 * sección reordenada, no un movimiento: así el resultado no depende del estado de la pantalla de quien arrastró
 * (dos pestañas abiertas no se dejan un orden a medias).
 *
 * Comprueba **antes de escribir** que los ids existen, son de esta organización y comparten padre. Si algo no
 * cuadra no escribe nada: media lista reordenada es peor que ninguna.
 */
export async function reorderRecords(
  db: Database,
  ctx: OrgContext,
  input: unknown,
): Promise<{ reordered: number }> {
  requireCan(ctx.role, 'write');
  const { entityType, ids } = reorderSchema.parse(input);
  if (new Set(ids).size !== ids.length) throw invalid('REORDER_DUPLICATE_IDS', 'La lista trae ids repetidos');
  const m = meta(entityType);
  const t = m.table as unknown as { id: AnyPgColumn };

  const scoped = m.org ? orgEq(m.org, ctx) : undefined;
  const rows = (await db
    .select({ id: t.id, parent: m.parent ?? t.id })
    .from(m.table)
    .where(scoped ? and(inArray(t.id, ids), scoped) : inArray(t.id, ids))) as {
    id: string;
    parent: string | null;
  }[];

  if (rows.length !== ids.length) {
    throw invalid('REORDER_MISMATCH', 'La lista a reordenar no coincide con los registros que existen');
  }

  let parentId: string | null = null;
  if (m.parent) {
    const parents = new Set(rows.map((r) => r.parent));
    if (parents.size !== 1 || rows.some((r) => r.parent === null)) {
      throw invalid('REORDER_MIXED_PARENTS', 'Sólo se puede reordenar dentro de una misma lista');
    }
    parentId = rows[0]!.parent;
  }

  // Tabla sin `organization_id`: el aislamiento se comprueba contra el padre, o no se comprueba en absoluto.
  if (!m.org) {
    if (!m.parentScope || !parentId) {
      throw invalid('REORDER_UNSCOPED', 'No se puede comprobar a qué organización pertenece esta lista');
    }
    const [owner] = await db
      .select({ id: m.parentScope.id })
      .from(m.parentScope.table)
      .where(and(eq(m.parentScope.id, parentId), orgEq(m.parentScope.org, ctx)));
    if (!owner) throw invalid('REORDER_MISMATCH', 'La lista a reordenar no es de esta organización');
  }

  try {
    await db.transaction(async (tx) => {
      for (const [i, id] of ids.entries()) {
        await tx
          .update(m.table)
          .set({ sortOrder: i + 1 })
          .where(scoped ? and(eq(t.id, id), scoped) : eq(t.id, id));
      }
      // UNA entrada de auditoría por el gesto, no una por fila: son n updates que son un solo movimiento. Sin
      // `entityId` a propósito — lo que cambió es la lista, y pasar el id del padre haría que el push a Notion
      // (que se dispara cuando hay `entityId`) apuntara a la entidad equivocada.
      await recordAudit(tx, ctx, {
        action: 'REORDER',
        entityType: m.auditEntity,
        metadata: { count: ids.length, parentId, order: ids },
      });
    });
  } catch (e) {
    throw mapDbError(e, { entity: entityType });
  }
  return { reordered: ids.length };
}

/** Entidades reordenables (para la UI y para los tests que atan ambas listas). */
export function reorderableEntities(): string[] {
  return Object.keys(REORDERABLE);
}
