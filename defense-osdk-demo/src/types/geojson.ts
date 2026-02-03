// GeoJSON type definitions and type guards

export interface GeoJSONGeometry {
  type:
    | "Point"
    | "LineString"
    | "Polygon"
    | "MultiPoint"
    | "MultiLineString"
    | "MultiPolygon";
  coordinates: any; // Will be validated by type guard
}

export interface GeoJSONStyle {
  fill?: {
    opacity?: number;
    color?: string;
  };
  stroke?: {
    width?: number;
    opacity?: number;
    color?: string;
  };
  label?: {
    text?: string;
    textColor?: string;
  };
}

export interface GeoJSONFeature {
  geometry: GeoJSONGeometry;
  style?: GeoJSONStyle;
  properties?: Record<string, any>;
}

export interface LayerElement {
  id: string;
  parentId: string;
  label?: string;
  displayFields?: any[];
  features?: GeoJSONFeature[];
}

export interface Layer {
  id: string;
  elements: LayerElement[];
}

export interface LayersResponse {
  layers: Record<string, Layer>;
}

/**
 * Type guard to check if coordinates are valid
 */
function isValidCoordinates(coords: any, geometryType: string): boolean {
  if (!Array.isArray(coords)) return false;

  switch (geometryType) {
    case "Point":
      // [longitude, latitude]
      return (
        coords.length === 2 &&
        typeof coords[0] === "number" &&
        typeof coords[1] === "number"
      );

    case "LineString":
    case "MultiPoint":
      // [[lon, lat], [lon, lat], ...]
      return (
        coords.length >= 2 &&
        coords.every(
          (coord: any) =>
            Array.isArray(coord) &&
            coord.length === 2 &&
            typeof coord[0] === "number" &&
            typeof coord[1] === "number",
        )
      );

    case "Polygon":
    case "MultiLineString":
      // [[[lon, lat], [lon, lat], ...], ...]
      return (
        coords.length >= 1 &&
        coords.every(
          (ring: any) =>
            Array.isArray(ring) &&
            ring.length >= 3 &&
            ring.every(
              (coord: any) =>
                Array.isArray(coord) &&
                coord.length === 2 &&
                typeof coord[0] === "number" &&
                typeof coord[1] === "number",
            ),
        )
      );

    case "MultiPolygon":
      // [[[[lon, lat], ...]], ...]
      return (
        coords.length >= 1 &&
        coords.every(
          (polygon: any) =>
            Array.isArray(polygon) &&
            polygon.every(
              (ring: any) =>
                Array.isArray(ring) &&
                ring.length >= 3 &&
                ring.every(
                  (coord: any) =>
                    Array.isArray(coord) &&
                    coord.length === 2 &&
                    typeof coord[0] === "number" &&
                    typeof coord[1] === "number",
                ),
            ),
        )
      );

    default:
      return false;
  }
}

/**
 * Type guard to check if geometry is valid GeoJSON
 */
function isValidGeoJSONGeometry(geometry: any): geometry is GeoJSONGeometry {
  if (!geometry || typeof geometry !== "object") return false;

  const validTypes = [
    "Point",
    "LineString",
    "Polygon",
    "MultiPoint",
    "MultiLineString",
    "MultiPolygon",
  ];

  if (!validTypes.includes(geometry.type)) return false;
  if (!geometry.coordinates) return false;

  return isValidCoordinates(geometry.coordinates, geometry.type);
}

/**
 * Type guard to check if feature is valid GeoJSON feature
 */
export function isValidGeoJSONFeature(feature: any): feature is GeoJSONFeature {
  if (!feature || typeof feature !== "object") return false;

  return isValidGeoJSONGeometry(feature.geometry);
}

/**
 * Type guard to check if element has valid GeoJSON features
 */
export function hasValidGeoJSONFeatures(element: any): element is LayerElement {
  if (!element || typeof element !== "object") return false;
  if (!element.id || !element.parentId) return false;
  if (!Array.isArray(element.features)) return false;
  if (element.features.length === 0) return false;

  // All features must be valid GeoJSON
  return element.features.every(isValidGeoJSONFeature);
}

/**
 * Filter layer elements to only include those with valid GeoJSON features
 */
export function filterGeoJSONElements(layer: Layer): LayerElement[] {
  if (!layer || !Array.isArray(layer.elements)) return [];

  return layer.elements.filter((element) => {
    const isValid = hasValidGeoJSONFeatures(element);
    if (!isValid && element.id) {
      console.log(`Not plotting ${element.id} because it's not GeoJSON`);
    }
    return isValid;
  });
}
