import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LAND_BLOCK_HEIGHT,
  LAND_HEIGHT_VARIATION,
  OCEAN_BLOCK_HEIGHT,
  VOXEL_FRAGMENT_SHADER,
  VOXEL_VERTEX_SHADER,
  createBeveledVoxelMesh,
  createVoxelInstanceData,
  createWebGlVoxelRenderer,
} from '../scripts/webgl-voxel-globe.mjs';

test('陆地厚度接近一个体素，避免斜视时出现多层台阶', () => {
  const cellHeight = 0.82 * (Math.PI / 128) * 0.94;

  assert.ok(LAND_BLOCK_HEIGHT <= cellHeight * 1.5);
  assert.ok(LAND_HEIGHT_VARIATION <= 0.05);
  assert.ok(OCEAN_BLOCK_HEIGHT < LAND_BLOCK_HEIGHT);
});

test('倒角体素包含顶面、倒角面和侧面，并使用单位法线', () => {
  const mesh = createBeveledVoxelMesh();

  assert.ok(mesh.vertexCount >= 96);
  assert.equal(mesh.positions.length, mesh.normals.length);
  assert.equal(mesh.positions.length, mesh.vertexCount * 3);
  assert.equal(mesh.positions.some((value, index) => index % 3 === 2 && value === 0), true);
  assert.equal(mesh.positions.some((value, index) => index % 3 === 2 && value === 1), true);

  for (let index = 0; index < mesh.normals.length; index += 3) {
    const length = Math.hypot(
      mesh.normals[index],
      mesh.normals[index + 1],
      mesh.normals[index + 2],
    );
    assert.ok(Math.abs(length - 1) < 1e-5);
  }
});

test('实例数据为每个体素保存经纬度、陆海标记和稳定变化值', () => {
  const data = createVoxelInstanceData([
    { longitude: -1, latitude: 0.5, isLand: false, variation: -0.02 },
    { longitude: 0.25, latitude: -0.5, isLand: true, variation: 0.06 },
  ]);

  assert.ok(data instanceof Float32Array);
  assert.equal(data.length, 8);
  assert.deepEqual([...data].map((value) => Number(value.toFixed(2))), [
    -1, 0.5, 0, -0.02,
    0.25, -0.5, 1, 0.06,
  ]);
});

test('着色器在 GPU 中展开实例并计算独立光照', () => {
  assert.match(VOXEL_VERTEX_SHADER, /a_instance/);
  assert.match(VOXEL_VERTEX_SHADER, /u_yawPitch/);
  assert.match(VOXEL_VERTEX_SHADER, /v_viewNormal/);
  assert.match(VOXEL_FRAGMENT_SHADER, /u_lightDirection/);
  assert.match(VOXEL_FRAGMENT_SHADER, /v_isLand/);
});

test('WebGL2 不可用时渲染器返回空值', () => {
  const canvas = { getContext: () => null };
  assert.equal(createWebGlVoxelRenderer(canvas), null);
});
