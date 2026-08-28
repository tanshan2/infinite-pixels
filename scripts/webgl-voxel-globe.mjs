export const OCEAN_BLOCK_HEIGHT = 0.011;
export const LAND_BLOCK_HEIGHT = 0.024;
export const LAND_HEIGHT_VARIATION = 0.05;

export const VOXEL_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec4 a_instance;

uniform vec2 u_yawPitch;
uniform vec2 u_cellStep;
uniform float u_zoom;

out vec3 v_viewNormal;
out float v_depth;
out float v_isLand;
out float v_variation;

vec3 rotateView(vec3 point) {
  float cy = cos(u_yawPitch.x);
  float sy = sin(u_yawPitch.x);
  vec3 yawed = vec3(
    point.x * cy - point.z * sy,
    point.y,
    point.x * sy + point.z * cy
  );
  float cp = cos(u_yawPitch.y);
  float sp = sin(u_yawPitch.y);
  return vec3(
    yawed.x,
    yawed.y * cp + yawed.z * sp,
    -yawed.y * sp + yawed.z * cp
  );
}

void main() {
  float longitude = a_instance.x;
  float latitude = a_instance.y;
  float isLand = a_instance.z;
  float variation = a_instance.w;
  float cosLatitude = cos(latitude);
  float sinLatitude = sin(latitude);
  float cosLongitude = cos(longitude);
  float sinLongitude = sin(longitude);

  vec3 radial = vec3(cosLatitude * sinLongitude, sinLatitude, cosLatitude * cosLongitude);
  vec3 east = vec3(cosLongitude, 0.0, -sinLongitude);
  vec3 north = vec3(-sinLatitude * sinLongitude, cosLatitude, -sinLatitude * cosLongitude);

  float globeRadius = 0.82;
  float cellWidth = globeRadius * u_cellStep.x * max(cosLatitude, 0.055) * 0.94;
  float cellHeight = globeRadius * u_cellStep.y * 0.94;
  float blockHeight = mix(${OCEAN_BLOCK_HEIGHT}, ${LAND_BLOCK_HEIGHT} + variation * ${LAND_HEIGHT_VARIATION}, isLand);

  vec3 worldPosition = radial * (globeRadius + a_position.z * blockHeight)
    + east * (a_position.x * cellWidth)
    + north * (a_position.y * cellHeight);
  vec3 worldNormal = normalize(
    east * a_normal.x
    + north * a_normal.y
    + radial * a_normal.z
  );
  vec3 viewPosition = rotateView(worldPosition);
  vec3 viewNormal = normalize(rotateView(worldNormal));

  gl_Position = vec4(viewPosition.xy * u_zoom, -viewPosition.z * 0.72, 1.0);
  v_viewNormal = viewNormal;
  v_depth = clamp(viewPosition.z / globeRadius, 0.0, 1.0);
  v_isLand = isLand;
  v_variation = variation;
}`;

export const VOXEL_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec3 v_viewNormal;
in float v_depth;
in float v_isLand;
in float v_variation;

uniform vec3 u_lightDirection;

out vec4 outColor;

void main() {
  vec3 normal = normalize(v_viewNormal);
  float diffuse = max(dot(normal, normalize(u_lightDirection)), 0.0);
  float rim = 0.48 + 0.52 * sqrt(v_depth);
  float shade = (0.33 + diffuse * 0.74 + v_variation * 0.64) * rim;
  vec3 ocean = vec3(0.018, 0.30, 0.305);
  vec3 land = vec3(0.56, 0.58, 0.04);
  vec3 color = mix(ocean, land, v_isLand) * shade;
  float warmHighlight = pow(diffuse, 4.0) * v_isLand;
  color += vec3(0.36, 0.25, 0.035) * warmHighlight;
  outColor = vec4(color, 1.0);
}`;

function normalize(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return vector.map((value) => value / length);
}

function faceNormal(a, b, c) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return normalize([
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ]);
}

export function createBeveledVoxelMesh(bevel = 0.12) {
  const clipped = Math.max(0.03, Math.min(0.18, bevel));
  const edge = 0.5 - clipped;
  const outer = [
    [-edge, -0.5], [edge, -0.5], [0.5, -edge], [0.5, edge],
    [edge, 0.5], [-edge, 0.5], [-0.5, edge], [-0.5, -edge],
  ];
  const insetScale = 1 - clipped * 2;
  const inner = outer.map(([x, y]) => [x * insetScale, y * insetScale]);
  const shoulderZ = 1 - clipped;
  const positions = [];
  const normals = [];

  const addTriangle = (a, b, c, suppliedNormal) => {
    const normal = suppliedNormal || faceNormal(a, b, c);
    for (const point of [a, b, c]) {
      positions.push(...point);
      normals.push(...normal);
    }
  };
  const addQuad = (a, b, c, d) => {
    const normal = faceNormal(a, b, c);
    addTriangle(a, b, c, normal);
    addTriangle(a, c, d, normal);
  };

  for (let index = 0; index < 8; index += 1) {
    const next = (index + 1) % 8;
    addTriangle(
      [0, 0, 1],
      [inner[index][0], inner[index][1], 1],
      [inner[next][0], inner[next][1], 1],
      [0, 0, 1],
    );
    addQuad(
      [outer[index][0], outer[index][1], shoulderZ],
      [outer[next][0], outer[next][1], shoulderZ],
      [inner[next][0], inner[next][1], 1],
      [inner[index][0], inner[index][1], 1],
    );
    addQuad(
      [outer[index][0], outer[index][1], 0],
      [outer[next][0], outer[next][1], 0],
      [outer[next][0], outer[next][1], shoulderZ],
      [outer[index][0], outer[index][1], shoulderZ],
    );
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    vertexCount: positions.length / 3,
  };
}

export function createVoxelInstanceData(cells) {
  const data = new Float32Array(cells.length * 4);
  cells.forEach((cell, index) => {
    const offset = index * 4;
    data[offset] = cell.longitude;
    data[offset + 1] = cell.latitude;
    data[offset + 2] = cell.isLand ? 1 : 0;
    data[offset + 3] = cell.variation;
  });
  return data;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || '着色器编译失败';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VOXEL_VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, VOXEL_FRAGMENT_SHADER);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || '渲染程序连接失败';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

export function createWebGlVoxelRenderer(canvas) {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    depth: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) return null;

  const mesh = createBeveledVoxelMesh();
  const program = createProgram(gl);
  const vertexArray = gl.createVertexArray();
  const positionBuffer = gl.createBuffer();
  const normalBuffer = gl.createBuffer();
  const instanceBuffer = gl.createBuffer();
  let instanceCount = 0;
  let density = { longitudeSegments: 256, latitudeSegments: 128 };

  gl.bindVertexArray(vertexArray);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(2, 1);
  gl.bindVertexArray(null);

  const uniforms = {
    yawPitch: gl.getUniformLocation(program, 'u_yawPitch'),
    cellStep: gl.getUniformLocation(program, 'u_cellStep'),
    zoom: gl.getUniformLocation(program, 'u_zoom'),
    lightDirection: gl.getUniformLocation(program, 'u_lightDirection'),
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = Math.max(1, Math.round(rect.height * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function setInstances(cells, nextDensity) {
    density = nextDensity;
    instanceCount = cells.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, createVoxelInstanceData(cells), gl.STATIC_DRAW);
  }

  function draw({ yaw, pitch, zoom }) {
    resize();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!instanceCount) return;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
    gl.useProgram(program);
    gl.uniform2f(uniforms.yawPitch, yaw, pitch);
    gl.uniform2f(
      uniforms.cellStep,
      Math.PI * 2 / density.longitudeSegments,
      Math.PI / density.latitudeSegments,
    );
    gl.uniform1f(uniforms.zoom, Math.min(1.12, zoom));
    gl.uniform3f(uniforms.lightDirection, -0.68, 0.56, 0.46);
    gl.bindVertexArray(vertexArray);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, mesh.vertexCount, instanceCount);
    gl.bindVertexArray(null);
  }

  function dispose() {
    gl.deleteBuffer(positionBuffer);
    gl.deleteBuffer(normalBuffer);
    gl.deleteBuffer(instanceBuffer);
    gl.deleteVertexArray(vertexArray);
    gl.deleteProgram(program);
  }

  return { draw, resize, setInstances, dispose, gl };
}
