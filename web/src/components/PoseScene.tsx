import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Language } from "../l4-types.ts";
import { HAND_EDGES, poseFrame, type SpatialPayload } from "../spatial.ts";

export default function PoseScene({
  episodeId,
  time,
  lang,
  onSessionExpired,
}: {
  episodeId: string;
  time: number;
  lang: Language;
  onSessionExpired: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const draw = useRef<(time: number) => void>(() => {});
  const reset = useRef<() => void>(() => {});
  const changeView = useRef<() => void>(() => {});
  const [wholePath, setWholePath] = useState(false);
  const orbit = useRef<(x: number, y: number, zoom?: number) => void>(() => {});
  const currentTime = useRef(time);
  currentTime.current = time;
  const [data, setData] = useState<SpatialPayload | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const zh = lang === "zh";
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setData(null);
    fetch(`/api/l4/spatial/${encodeURIComponent(episodeId)}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (r.status === 401) {
          onSessionExpired();
          throw new Error("session");
        }
        if (!r.ok) throw new Error("data");
        const d = (await r.json()) as SpatialPayload;
        if (
          d.version !== 1 ||
          d.episodeId !== episodeId ||
          !(d.fps > 0) ||
          d.cameras.length !== d.frameCount ||
          d.hands.length !== d.frameCount
        )
          throw new Error("data");
        setData(d);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError("data");
      });
    return () => controller.abort();
  }, [episodeId, retry]);

  useEffect(() => {
    if (!data || !host.current) return;
    const container = host.current;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setError("webgl");
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x11171b);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.001, 200);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.enablePan = true;
    controls.minDistance = 0.15;
    controls.maxDistance = 80;
    const min = new THREE.Vector3(
      ...(data.bounds[0] as [number, number, number]),
    );
    const max = new THREE.Vector3(
      ...(data.bounds[1] as [number, number, number]),
    );
    const center = min.clone().add(max).multiplyScalar(0.5);
    const extent = Math.max(max.distanceTo(min), 0.65);
    const gridSize = Math.max(2, Math.ceil(extent * 1.7));
    const grid = new THREE.GridHelper(
      gridSize,
      Math.min(60, Math.ceil(gridSize / 0.1)),
      0x344046,
      0x222e34,
    );
    grid.position.set(center.x, min.y - 0.07, center.z);
    scene.add(grid, new THREE.HemisphereLight(0xffffff, 0x53616b, 2.5));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(2, 4, 3);
    scene.add(light);
    const head = new THREE.Group();
    const headGeometry = new THREE.SphereGeometry(0.047, 16, 12);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xc4c3ed,
      roughness: 0.5,
      metalness: 0.15,
    });
    const marker = new THREE.Mesh(headGeometry, headMaterial);
    marker.scale.set(0.88, 1.12, 0.95);
    head.add(marker);
    const frustumPoints = [
      [0, 0, 0],
      [-0.075, -0.044, 0.15],
      [0.075, -0.044, 0.15],
      [0, 0, 0],
      [0.075, -0.044, 0.15],
      [0.075, 0.044, 0.15],
      [0, 0, 0],
      [0.075, 0.044, 0.15],
      [-0.075, 0.044, 0.15],
      [0, 0, 0],
      [-0.075, 0.044, 0.15],
      [-0.075, -0.044, 0.15],
    ];
    const frustum = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(
        frustumPoints.map(
          (p) => new THREE.Vector3(...(p as [number, number, number])),
        ),
      ),
      new THREE.LineBasicMaterial({
        color: 0xa4a6d2,
        transparent: true,
        opacity: 0.75,
      }),
    );
    head.add(frustum);
    scene.add(head);
    const trajectoryGeometry = new THREE.BufferGeometry().setFromPoints(
      data.cameras.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    );
    const trajectory = new THREE.Line(
      trajectoryGeometry,
      new THREE.LineBasicMaterial({
        color: 0x6d7695,
        transparent: true,
        opacity: 0.5,
      }),
    );
    scene.add(trajectory);
    const maxHands = Math.max(1, ...data.hands.map((f) => f.length));
    const jointGeometry = new THREE.SphereGeometry(0.004, 8, 6);
    const boneGeometry = new THREE.CylinderGeometry(0.0023, 0.0023, 1, 6);
    const handMaterial = new THREE.MeshStandardMaterial({ roughness: 0.6 });
    const joints = new THREE.InstancedMesh(
      jointGeometry,
      handMaterial,
      maxHands * 21,
    );
    const bones = new THREE.InstancedMesh(
      boneGeometry,
      handMaterial,
      maxHands * 20,
    );
    joints.frustumCulled = bones.frustumCulled = false;
    joints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    bones.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(joints, bones);
    const dummy = new THREE.Object3D(),
      a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      direction = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0),
      color = new THREE.Color();
    const matrix = new THREE.Matrix4();
    function render() {
      renderer.render(scene, camera);
    }
    let overview = false;
    let lastHead = new THREE.Vector3();
    function resetView() {
      if (!data) return;
      const index = poseFrame(currentTime.current, data.fps, data.frameCount);
      const pose = data.cameras[index]!;
      const headPosition = new THREE.Vector3(pose[0], pose[1], pose[2]);
      lastHead.copy(headPosition);
      let target = center.clone(),
        span = extent;
      if (!overview) {
        const box = new THREE.Box3().expandByPoint(headPosition);
        for (const hand of data.hands[index] ?? [])
          for (let j = 0; j < 21; j++)
            box.expandByPoint(new THREE.Vector3().fromArray(hand.j, j * 3));
        target = box.getCenter(new THREE.Vector3());
        span = Math.max(0.65, box.getSize(new THREE.Vector3()).length());
      }
      const distance = span * (overview ? 1.25 : 1.05);
      camera.position
        .copy(target)
        .add(
          new THREE.Vector3(distance * 0.78, distance * 0.42, distance * 0.8),
        );
      controls.target.copy(target);
      controls.update();
      render();
    }
    changeView.current = () => {
      overview = !overview;
      setWholePath(overview);
      resetView();
    };
    setWholePath(false);
    draw.current = (t) => {
      const index = poseFrame(t, data.fps, data.frameCount);
      const pose = data.cameras[index];
      if (!pose) return;
      const headPosition = new THREE.Vector3(pose[0], pose[1], pose[2]);
      if (!overview) {
        const movement = headPosition.clone().sub(lastHead);
        camera.position.add(movement);
        controls.target.add(movement);
        controls.update();
      }
      lastHead.copy(headPosition);
      matrix.set(
        pose[3],
        pose[4],
        pose[5],
        pose[0],
        pose[6],
        pose[7],
        pose[8],
        pose[1],
        pose[9],
        pose[10],
        pose[11],
        pose[2],
        0,
        0,
        0,
        1,
      );
      head.matrixAutoUpdate = false;
      head.matrix.copy(matrix);
      let ji = 0,
        bi = 0;
      for (const hand of data.hands[index] ?? []) {
        color.set(hand.side === "left" ? 0xffcd59 : 0x67e2ab);
        for (let j = 0; j < 21; j++) {
          dummy.position.fromArray(hand.j, j * 3);
          dummy.quaternion.identity();
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          joints.setMatrixAt(ji, dummy.matrix);
          joints.setColorAt(ji++, color);
        }
        for (const [start, end] of HAND_EDGES) {
          a.fromArray(hand.j, start * 3);
          b.fromArray(hand.j, end * 3);
          direction.subVectors(b, a);
          dummy.position.copy(a).add(b).multiplyScalar(0.5);
          dummy.quaternion.setFromUnitVectors(
            up,
            direction.clone().normalize(),
          );
          dummy.scale.set(1, direction.length(), 1);
          dummy.updateMatrix();
          bones.setMatrixAt(bi, dummy.matrix);
          bones.setColorAt(bi++, color);
        }
      }
      joints.count = ji;
      bones.count = bi;
      joints.instanceMatrix.needsUpdate =
        bones.instanceMatrix.needsUpdate = true;
      if (joints.instanceColor) joints.instanceColor.needsUpdate = true;
      if (bones.instanceColor) bones.instanceColor.needsUpdate = true;
      trajectoryGeometry.setDrawRange(0, index + 1);
      container.dataset.frame = String(index);
      render();
    };
    orbit.current = (x, y, zoom = 1) => {
      const spherical = new THREE.Spherical().setFromVector3(
        camera.position.clone().sub(controls.target),
      );
      spherical.theta += x;
      spherical.phi = THREE.MathUtils.clamp(
        spherical.phi + y,
        0.05,
        Math.PI - 0.05,
      );
      spherical.radius = THREE.MathUtils.clamp(
        spherical.radius * zoom,
        0.15,
        80,
      );
      camera.position
        .copy(controls.target)
        .add(new THREE.Vector3().setFromSpherical(spherical));
      controls.update();
      render();
    };
    reset.current = resetView;
    controls.addEventListener("change", render);
    container.appendChild(renderer.domElement);
    const resize = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      resetView();
    });
    resize.observe(container);
    resetView();
    draw.current(currentTime.current);
    const lost = (e: Event) => {
      e.preventDefault();
      setError("webgl");
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      resize.disconnect();
      controls.dispose();
      draw.current = () => {};
      reset.current = () => {};
      changeView.current = () => {};
      orbit.current = () => {};
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        if (mesh.material)
          (Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]
          ).forEach((m) => m.dispose());
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [data, retry]);
  useEffect(() => {
    draw.current(time);
  }, [time]);
  const count =
    data?.hands[poseFrame(time, data.fps, data.frameCount)]?.length ?? 0;
  return (
    <section
      className="spatial-view"
      aria-label={zh ? "头手空间重建" : "Head and hands in 3D"}
    >
      <div className="spatial-label">
        <h2>{zh ? "头手空间重建" : "Head & hands · 3D"}</h2>
        <div className="pose-view-actions">
          <button
            className="text-button"
            onClick={() => changeView.current()}
            disabled={!data || !!error}
            aria-pressed={wholePath}
          >
            {wholePath
              ? zh
                ? "聚焦动作"
                : "Focus pose"
              : zh
                ? "整段轨迹"
                : "Whole path"}
          </button>
          <button
            className="text-button"
            onClick={() => reset.current()}
            disabled={!data || !!error}
          >
            {zh ? "重置" : "Reset"}
          </button>
        </div>
      </div>
      <div className="pose-picture">
        <div
          ref={host}
          className="pose-canvas"
          tabIndex={0}
          role="img"
          aria-label={
            zh
              ? "同步三维头手位姿。拖拽或方向键旋转，滚轮或加减键缩放。"
              : "Synchronized 3D head and hand poses. Drag or use arrow keys to orbit. Scroll or press plus/minus to zoom."
          }
          onKeyDown={(e) => {
            const moves: Record<string, [number, number, number?]> = {
              ArrowLeft: [-0.15, 0],
              ArrowRight: [0.15, 0],
              ArrowUp: [0, -0.15],
              ArrowDown: [0, 0.15],
              "+": [0, 0, 0.85],
              "=": [0, 0, 0.85],
              "-": [0, 0, 1.15],
            };
            const move = moves[e.key];
            if (move) {
              e.preventDefault();
              orbit.current(...move);
            }
            if (e.key.toLowerCase() === "r") reset.current();
          }}
        />
        {!data && !error && (
          <div className="media-status" role="status">
            {zh ? "正在载入三维位姿…" : "Loading spatial poses…"}
          </div>
        )}
        {error && (
          <div className="media-failure" role="alert">
            <strong>
              {error === "webgl"
                ? zh
                  ? "当前浏览器无法显示 3D"
                  : "3D could not start in this browser"
                : zh
                  ? "空间数据未能载入"
                  : "Spatial data could not load"}
            </strong>
            <p>
              {zh
                ? "原视频和标注仍可查看。"
                : "Video and annotations are still available."}
            </p>
            <button className="button" onClick={() => setRetry((r) => r + 1)}>
              {zh ? "重试" : "Try again"}
            </button>
          </div>
        )}
        {data && !error && (
          <>
            <div className="pose-legend">
              <span className="left-hand">{zh ? "左手" : "Left"}</span>
              <span className="right-hand">{zh ? "右手" : "Right"}</span>
              <span className="head-pose">
                {zh ? "头部 / 相机" : "Head / camera"}
              </span>
            </div>
            <span className="pose-hint">
              {count === 0
                ? zh
                  ? "当前帧无有效手部"
                  : "No valid hands at this frame"
                : zh
                  ? "拖拽旋转 · 滚轮缩放"
                  : "Drag to orbit · Scroll to zoom"}
            </span>
          </>
        )}
      </div>
    </section>
  );
}
