import React, { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { LayerElement, GeoJSONFeature } from "../types/geojson";

interface GeoJSONLayerProps {
  elements: LayerElement[];
}

/**
 * Convert hex color with optional alpha to rgba
 */
function parseColor(color: string, opacity: number = 1): string {
  if (color.startsWith("rgba(")) {
    return color;
  }

  if (color.startsWith("#")) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  return color;
}

/**
 * Create Leaflet style from GeoJSON feature style
 */
function createLeafletStyle(feature: GeoJSONFeature): L.PathOptions {
  const style = feature.style || {};

  const pathOptions: L.PathOptions = {};

  if (style.stroke) {
    pathOptions.color = style.stroke.color || "#3388ff";
    pathOptions.weight = style.stroke.width || 3;
    pathOptions.opacity = style.stroke.opacity ?? 1.0;
  }

  if (style.fill) {
    pathOptions.fillColor = style.fill.color || "#3388ff";
    pathOptions.fillOpacity = style.fill.opacity ?? 0.2;
  }

  return pathOptions;
}

/**
 * Create popup content for a feature
 */
function createPopupContent(
  element: LayerElement,
  feature: GeoJSONFeature,
): string {
  let content = `<div><strong>${element.label}</strong></div>`;

  if (feature.style?.label?.text) {
    content += `<div>${feature.style.label.text}</div>`;
  }

  if (feature.properties) {
    content += '<div style="margin-top: 8px;">';
    Object.entries(feature.properties).forEach(([key, value]) => {
      content += `<div><em>${key}:</em> ${value}</div>`;
    });
    content += "</div>";
  }

  return content;
}

/**
 * Component to render GeoJSON elements on a Leaflet map
 */
export const GeoJSONLayer: React.FC<GeoJSONLayerProps> = ({ elements }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !elements || elements.length === 0) return;

    const layers: L.Layer[] = [];

    elements.forEach((element) => {
      if (!element.features) return;

      element.features.forEach((feature) => {
        try {
          // Create GeoJSON layer
          const geoJsonLayer = L.geoJSON(
            {
              type: "Feature",
              geometry: feature.geometry,
              properties: feature.properties || {},
            },
            {
              style: () => createLeafletStyle(feature),
              pointToLayer: (geoJsonPoint, latlng) => {
                const style = feature.style;
                const markerOptions: L.CircleMarkerOptions = {
                  radius: 8,
                  fillColor: style?.stroke?.color || "#3388ff",
                  color: style?.stroke?.color || "#3388ff",
                  weight: style?.stroke?.width || 2,
                  opacity: style?.stroke?.opacity ?? 1,
                  fillOpacity: style?.fill?.opacity ?? 0.5,
                };
                return L.circleMarker(latlng, markerOptions);
              },
              onEachFeature: (geoJsonFeature, layer) => {
                const popupContent = createPopupContent(element, feature);
                layer.bindPopup(popupContent);

                // Add tooltip for labels
                if (feature.style?.label?.text) {
                  layer.bindTooltip(feature.style.label.text.trim(), {
                    permanent: false,
                    direction: "top",
                    className: "geojson-label",
                  });
                }
              },
            },
          );

          geoJsonLayer.addTo(map);
          layers.push(geoJsonLayer);
        } catch (error) {
          console.error(
            `Error rendering feature for element ${element.id}:`,
            error,
          );
        }
      });
    });

    // Fit map bounds to show all layers
    if (layers.length > 0) {
      const group = L.featureGroup(layers);
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }

    // Cleanup function to remove layers when component unmounts or elements change
    return () => {
      layers.forEach((layer) => {
        map.removeLayer(layer);
      });
    };
  }, [map, elements]);

  return null;
};
