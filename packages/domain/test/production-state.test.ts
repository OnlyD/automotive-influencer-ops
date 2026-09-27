import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionProductionState, nextProductionStates, productionStates } from "../src/production-state.js";

test("production state graph allows each documented forward transition", () => {
  for (let index = 0; index < productionStates.length - 1; index += 1) {
    assert.equal(canTransitionProductionState(productionStates[index], productionStates[index + 1]), true);
  }
});

test("production state graph rejects skipped and backward transitions", () => {
  assert.equal(canTransitionProductionState("BORRADOR", "DATOS_VERIFICADOS"), false);
  assert.equal(canTransitionProductionState("PUBLICADO", "LISTO"), false);
  assert.deepEqual(nextProductionStates("MEDIDO"), []);
});
