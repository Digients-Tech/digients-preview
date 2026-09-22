import { test } from "node:test";
import assert from "node:assert/strict";
import { poseFrame, HAND_EDGES } from "../web/src/spatial.ts";
test("pose frame follows the presented video timestamp and clamps exact end/negative seeks", () => {
  assert.equal(poseFrame(-1, 20, 330), 0);
  assert.equal(poseFrame(3.499, 20, 330), 69);
  assert.equal(poseFrame(3.5, 20, 330), 70);
  assert.equal(poseFrame(16.5, 20, 330), 329);
  assert.equal(poseFrame(100, 20, 330), 329);
  assert.equal(HAND_EDGES.length, 20);
});
