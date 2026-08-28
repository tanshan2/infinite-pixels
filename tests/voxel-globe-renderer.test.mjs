import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVoxelGrid,
  loadLandTopology,
  projectCell,
  projectSurfacePoint,
  rgbToCss,
  rotateVector,
  selectGridDensity,
  surfaceColor,
  voxelVariation,
} from '../scripts/voxel-globe-renderer.mjs';

test('真实地理数据优先于带阴影的风格化图片', async () => {
  let textureLoads = 0;
  const geoJson = { type: 'FeatureCollection', features: [] };
  const result = await loadLandTopology({
    loadGeoJson: async () => geoJson,
    loadTexture: async () => {
      textureLoads += 1;
      return { width: 1774, height: 887 };
    },
  });

  assert.deepEqual(result, { source: 'geojson', data: geoJson });
  assert.equal(textureLoads, 0);
});

test('真实地理数据失败时才使用风格化图片回退', async () => {
  const texture = { width: 1774, height: 887 };
  const result = await loadLandTopology({
    loadGeoJson: async () => { throw new Error('地图数据不可用'); },
    loadTexture: async () => texture,
  });

  assert.deepEqual(result, { source: 'texture', data: texture });
});

test('桌面和手机使用已确认的体素密度', () => {
  assert.deepEqual(selectGridDensity(1280), {
    longitudeSegments: 256,
    latitudeSegments: 128,
  });
  assert.deepEqual(selectGridDensity(761), {
    longitudeSegments: 256,
    latitudeSegments: 128,
  });
  assert.deepEqual(selectGridDensity(760), {
    longitudeSegments: 256,
    latitudeSegments: 128,
  });
  assert.deepEqual(selectGridDensity(481), {
    longitudeSegments: 256,
    latitudeSegments: 128,
  });
  assert.deepEqual(selectGridDensity(480), {
    longitudeSegments: 160,
    latitudeSegments: 80,
  });
});

test('球面网格记录陆海类型、相邻海岸和稳定色差', () => {
  const options = {
    longitudeSegments: 8,
    latitudeSegments: 4,
    isLand: (lon) => lon >= 0,
  };
  const cells = createVoxelGrid(options);
  const rebuilt = createVoxelGrid(options);

  assert.equal(cells.length, 32);
  assert.equal(cells.some((cell) => cell.isLand), true);
  assert.equal(cells.some((cell) => !cell.isLand), true);
  assert.equal(cells.some((cell) => cell.isLand && cell.coastEdges.length > 0), true);
  assert.equal(cells.every((cell) => cell.variation >= -0.08 && cell.variation <= 0.08), true);
  assert.deepEqual(
    rebuilt.map((cell) => cell.variation),
    cells.map((cell) => cell.variation),
  );
  assert.equal(typeof cells[0].longitude, 'number');
  assert.equal(typeof cells[0].latitude, 'number');
});

test('陆地起伏使用二维散列，避免形成规则斜向条纹', () => {
  const cells = createVoxelGrid({
    longitudeSegments: 16,
    latitudeSegments: 16,
    isLand: () => true,
  });
  const row = cells.filter((cell) => cell.row === 4).map((cell) => cell.variation);
  const deltas = row.slice(1).map((value, index) => Number((value - row[index]).toFixed(5)));

  assert.ok(new Set(deltas).size >= 4);
  assert.ok(new Set(cells.map((cell) => cell.variation)).size >= 12);
  assert.equal(voxelVariation(7, 4), voxelVariation(7, 4));
});

test('背面体素被剔除且陆地比海洋抬高', () => {
  const view = { yaw: 0, pitch: 0, center: 180, radius: 150 };
  const frontVector = { x: 0, y: 0, z: 1 };
  const front = {
    center: frontVector,
    corners: Array(4).fill(frontVector),
    isLand: true,
  };
  const back = {
    ...front,
    center: { x: 0, y: 0, z: -1 },
  };

  assert.equal(projectCell(back, view), null);
  assert.equal(projectCell(front, view).radiusScale, 1.045);
  assert.deepEqual(projectSurfacePoint(frontVector, view, true), {
    x: 180,
    y: 180,
    depth: 1,
    radiusScale: 1.045,
  });
});

test('旋转使用与地点投影相同的偏航和俯仰约定', () => {
  const rotated = rotateVector(
    { x: 0, y: 0, z: 1 },
    { yaw: Math.PI / 2, pitch: 0 },
  );

  assert.ok(Math.abs(rotated.x + 1) < 1e-9);
  assert.ok(Math.abs(rotated.z) < 1e-9);
});

test('陆地为橄榄金色、海洋为深青色且侧面更暗', () => {
  const normal = { x: -0.45, y: -0.62, z: 0.64 };
  const landTop = surfaceColor({
    isLand: true,
    normal,
    depth: 0.9,
    variation: 0,
    side: false,
  });
  const landSide = surfaceColor({
    isLand: true,
    normal,
    depth: 0.9,
    variation: 0,
    side: true,
  });
  const ocean = surfaceColor({
    isLand: false,
    normal,
    depth: 0.9,
    variation: 0,
    side: false,
  });

  assert.ok(landTop[0] > landTop[2] && landTop[1] > landTop[2]);
  assert.ok(ocean[1] > ocean[0] && ocean[2] > ocean[0]);
  assert.ok(
    landSide.reduce((sum, value) => sum + value, 0)
      < landTop.reduce((sum, value) => sum + value, 0),
  );
  assert.equal(rgbToCss([12, 34, 56]), 'rgb(12 34 56)');
});

test('左上方表面明显亮于右下方表面', () => {
  const upperLeft = surfaceColor({
    isLand: true,
    normal: { x: -0.45, y: 0.62, z: 0.64 },
    depth: 0.9,
  });
  const lowerRight = surfaceColor({
    isLand: true,
    normal: { x: 0.45, y: -0.62, z: 0.64 },
    depth: 0.9,
  });
  const total = (rgb) => rgb.reduce((sum, channel) => sum + channel, 0);

  assert.ok(total(upperLeft) > total(lowerRight) * 1.25);
});
