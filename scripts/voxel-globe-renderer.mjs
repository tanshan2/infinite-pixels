export const LAND_LIFT = 1.045;

export async function loadLandTopology({ loadGeoJson, loadTexture }) {
  try {
    return { source: 'geojson', data: await loadGeoJson() };
  } catch (geoJsonError) {
    try {
      return { source: 'texture', data: await loadTexture() };
    } catch {
      throw geoJsonError;
    }
  }
}

const LIGHT = (() => {
  const source = { x: -0.45, y: 0.62, z: 0.64 };
  const length = Math.hypot(source.x, source.y, source.z);
  return {
    x: source.x / length,
    y: source.y / length,
    z: source.z / length,
  };
})();

export function selectGridDensity(viewportWidth) {
  return viewportWidth <= 480
    ? { longitudeSegments: 160, latitudeSegments: 80 }
    : { longitudeSegments: 256, latitudeSegments: 128 };
}

export function voxelVariation(column, row) {
  let seed = Math.imul((column + 1) ^ 0x9e3779b9, 374761393);
  seed = Math.imul(seed ^ Math.imul(row + 1, 668265263), 1274126177);
  seed ^= seed >>> 13;
  seed = Math.imul(seed, 1274126177);
  seed ^= seed >>> 16;
  return (((seed >>> 0) / 4294967295) - 0.5) * 0.08;
}

function unitVector(lon, lat) {
  const cosLat = Math.cos(lat);
  return {
    x: cosLat * Math.sin(lon),
    y: Math.sin(lat),
    z: cosLat * Math.cos(lon),
  };
}

export function createVoxelGrid({ longitudeSegments, latitudeSegments, isLand }) {
  const lonStep = Math.PI * 2 / longitudeSegments;
  const latStep = Math.PI / latitudeSegments;
  const land = Array.from({ length: latitudeSegments }, (_, row) =>
    Array.from({ length: longitudeSegments }, (_, column) => {
      const lon = -Math.PI + (column + 0.5) * lonStep;
      const lat = -Math.PI / 2 + (row + 0.5) * latStep;
      return Boolean(isLand(lon, lat));
    }));

  return land.flatMap((rowValues, row) =>
    rowValues.map((isLandCell, column) => {
      const lon0 = -Math.PI + column * lonStep;
      const lon1 = lon0 + lonStep;
      const lat0 = -Math.PI / 2 + row * latStep;
      const lat1 = lat0 + latStep;
      const neighbor = (x, y) => land[
        Math.max(0, Math.min(latitudeSegments - 1, y))
      ][(x + longitudeSegments) % longitudeSegments];
      const coastEdges = isLandCell
        ? [
            ['north', neighbor(column, row + 1)],
            ['east', neighbor(column + 1, row)],
            ['south', neighbor(column, row - 1)],
            ['west', neighbor(column - 1, row)],
          ].filter(([, adjacentLand]) => !adjacentLand).map(([edge]) => edge)
        : [];
      const variation = voxelVariation(column, row);

      return {
        row,
        column,
        longitude: (lon0 + lon1) / 2,
        latitude: (lat0 + lat1) / 2,
        isLand: isLandCell,
        coastEdges,
        variation,
        center: unitVector((lon0 + lon1) / 2, (lat0 + lat1) / 2),
        corners: [
          unitVector(lon0, lat1),
          unitVector(lon1, lat1),
          unitVector(lon1, lat0),
          unitVector(lon0, lat0),
        ],
      };
    }));
}

export function rotateVector(vector, { yaw = 0, pitch = 0 }) {
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const x1 = vector.x * cosYaw - vector.z * sinYaw;
  const z1 = vector.x * sinYaw + vector.z * cosYaw;
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  return {
    x: x1,
    y: vector.y * cosPitch + z1 * sinPitch,
    z: -vector.y * sinPitch + z1 * cosPitch,
  };
}

function projectAtScale(vector, view, radiusScale) {
  const rotated = rotateVector(vector, view);
  return {
    x: view.center + rotated.x * view.radius * radiusScale,
    y: view.center - rotated.y * view.radius * radiusScale,
    depth: rotated.z,
  };
}

export function projectSurfacePoint(vector, view, isLand = false) {
  const rotated = rotateVector(vector, view);
  if (rotated.z <= 0.015) return null;
  const radiusScale = isLand ? LAND_LIFT : 1;

  return {
    x: view.center + rotated.x * view.radius * radiusScale,
    y: view.center - rotated.y * view.radius * radiusScale,
    depth: rotated.z,
    radiusScale,
  };
}

export function projectCell(cell, view) {
  const center = projectSurfacePoint(cell.center, view, cell.isLand);
  if (!center) return null;
  const radiusScale = cell.isLand ? LAND_LIFT : 1;

  return {
    ...center,
    normal: rotateVector(cell.center, view),
    top: cell.corners.map((corner) => projectAtScale(corner, view, radiusScale)),
    base: cell.corners.map((corner) => projectAtScale(corner, view, 1)),
  };
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function surfaceColor({
  isLand,
  normal,
  depth,
  variation = 0,
  side = false,
}) {
  const base = isLand ? [146, 151, 18] : [8, 82, 84];
  const diffuse = Math.max(
    0,
    normal.x * LIGHT.x + normal.y * LIGHT.y + normal.z * LIGHT.z,
  );
  const rim = 0.58 + 0.42 * Math.sqrt(Math.max(0, Math.min(1, depth)));
  const sideFactor = side ? 0.58 : 1;
  const brightness = Math.max(
    0.24,
    (0.42 + diffuse * 0.58 + variation) * rim,
  ) * sideFactor;

  return base.map((channel) => clampByte(channel * brightness));
}

export function rgbToCss([red, green, blue]) {
  return `rgb(${red} ${green} ${blue})`;
}
