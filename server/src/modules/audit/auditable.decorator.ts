const AUDITABLE_ENTITIES = new Set<Function>();

export function Auditable(): ClassDecorator {
  return (target) => {
    AUDITABLE_ENTITIES.add(target);
  };
}

export function isAuditableEntity(target: Function): boolean {
  return AUDITABLE_ENTITIES.has(target);
}
