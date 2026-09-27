export const productionStates = [
  "BORRADOR",
  "INVESTIGANDO",
  "DATOS_VERIFICADOS",
  "GUION_GENERADO",
  "REVISION_PRESENTADORA",
  "APROBADO",
  "LISTO_PARA_GRABAR",
  "GRABADO",
  "EDITADO",
  "LISTO",
  "PROGRAMADO",
  "PUBLICADO",
  "MEDIDO",
] as const;

export type ProductionState = (typeof productionStates)[number];

const transitions: Record<ProductionState, readonly ProductionState[]> = {
  BORRADOR: ["INVESTIGANDO"],
  INVESTIGANDO: ["DATOS_VERIFICADOS"],
  DATOS_VERIFICADOS: ["GUION_GENERADO"],
  GUION_GENERADO: ["REVISION_PRESENTADORA"],
  REVISION_PRESENTADORA: ["APROBADO"],
  APROBADO: ["LISTO_PARA_GRABAR"],
  LISTO_PARA_GRABAR: ["GRABADO"],
  GRABADO: ["EDITADO"],
  EDITADO: ["LISTO"],
  LISTO: ["PROGRAMADO"],
  PROGRAMADO: ["PUBLICADO"],
  PUBLICADO: ["MEDIDO"],
  MEDIDO: [],
};

export function canTransitionProductionState(from: ProductionState, to: ProductionState): boolean {
  return transitions[from].includes(to);
}

export function nextProductionStates(from: ProductionState): readonly ProductionState[] {
  return transitions[from];
}
