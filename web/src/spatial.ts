export type SpatialPayload = {
  version: 1;
  episodeId: string;
  fps: number;
  frameCount: number;
  coordinateSystem: "clip-local-y-up";
  headSource: "camera-slam";
  bounds: [number[], number[]];
  cameras: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ][]; // position xyz followed by row-major camera-to-view rotation
  hands: { id: number; side: "left" | "right"; j: number[] }[][];
};

export function poseFrame(time: number, fps: number, frames: number) {
  return Math.min(frames - 1, Math.max(0, Math.floor(time * fps + 1e-6)));
}

export const HAND_EDGES = Array.from({ length: 5 }, (_, finger) => {
  const base = 1 + finger * 4;
  return [
    [0, base],
    [base, base + 1],
    [base + 1, base + 2],
    [base + 2, base + 3],
  ] as [number, number][];
}).flat();
