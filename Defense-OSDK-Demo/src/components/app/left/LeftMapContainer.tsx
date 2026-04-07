/*
 * (c) Copyright 2026 Palantir Technologies Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Spinner } from "@blueprintjs/core";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { intelligenceSubject } from "@defense-osdk/sdk";
import { useTheme } from "../../../context/ThemeContext";
import { useSelection } from "../../../context/SelectionContext";
import { useOsdkData } from "../../../context/OsdkDataContext";
import { isLoaded, isLoading } from "../../../types/AsyncLoaded";
import { Affiliations, CssVariables, OntologyLinkTypes } from "../../../constants";
import styles from "./LeftMapContainer.module.scss";

function getCssVariable(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function getMapTileUrl(): string {
  return getCssVariable(CssVariables.MAP_TILE_URL).replace(/^["']|["']$/g, '');
}

interface MapColors {
  collateralConcernColor: string;
  elintColor: string;
  unitFriendColor: string;
  unitHostileColor: string;
  unitOtherColor: string;
}

function getMapColors(): MapColors {
  return {
    collateralConcernColor: getCssVariable(CssVariables.COLLATERAL_CONCERN_COLOR),
    elintColor: getCssVariable(CssVariables.ELINT_COLOR),
    unitFriendColor: getCssVariable(CssVariables.UNIT_FRIEND_COLOR),
    unitHostileColor: getCssVariable(CssVariables.UNIT_HOSTILE_COLOR),
    unitOtherColor: getCssVariable(CssVariables.UNIT_OTHER_COLOR),
  };
}

function getUnitColor(affiliation: string | undefined, colors: MapColors): string {
  if (affiliation == null) {
    return colors.unitOtherColor;
  }
  const lowerAffiliation = affiliation.toLowerCase();
  if (lowerAffiliation === Affiliations.HOSTILE) {
    return colors.unitHostileColor;
  }
  if (lowerAffiliation.includes(Affiliations.FRIEND)) {
    return colors.unitFriendColor;
  }
  return colors.unitOtherColor;
}

const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Fetches primary keys of ELINTs linked to a hostile unit via the intelligence subject interface
async function getAssociatedElintPrimaryKeys(selectedUnit: any): Promise<Set<string>> {
  if (selectedUnit == null || selectedUnit.affiliation?.toLowerCase() !== Affiliations.HOSTILE) {
    return new Set();
  }

  try {
    const asIntelligenceSubject = selectedUnit.$as(intelligenceSubject);
    const link = asIntelligenceSubject.$link;

    if (link?.[OntologyLinkTypes.LINKED_INTELLIGENCE] == null) {
      return new Set();
    }

    const { data } = await link[OntologyLinkTypes.LINKED_INTELLIGENCE].fetchPage({
      $pageSize: 1000,
    });

    return new Set(data.map((elint: any) => elint.$primaryKey));
  } catch {
    return new Set();
  }
}

const LeftMapContainer: React.FC = () => {
  const { theme } = useTheme();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const ellipsesLayerRef = useRef<L.LayerGroup | null>(null);
  const collateralConcernsLayerRef = useRef<L.LayerGroup | null>(null);
  const unitsLayerRef = useRef<L.LayerGroup | null>(null);
  const hoverMarkerRef = useRef<L.CircleMarker | null>(null);

  const { selectUnit, selectElint, selectedUnit } = useSelection();
  const { mapData, elintAssociation } = useOsdkData();

  const elints = isLoaded(mapData) ? mapData.value.elints : [];
  const collateralConcerns = isLoaded(mapData) ? mapData.value.collateralConcerns : [];
  const unitLocations = isLoaded(mapData) ? mapData.value.unitLocations : [];
  const loadingMapData = isLoading(mapData);
  const associatingElint = isLoading(elintAssociation);

  const [associatedElintPrimaryKeys, setAssociatedElintPrimaryKeys] = useState<Set<string>>(new Set());

  const showHoverMarker = useCallback((center: [number, number], color: string) => {
    if (mapRef.current == null) {
      return;
    }

    if (hoverMarkerRef.current != null) {
      hoverMarkerRef.current.remove();
    }

    hoverMarkerRef.current = L.circleMarker(center, {
      color,
      fillColor: color,
      fillOpacity: 0.3,
      interactive: false,
      opacity: 0.7,
      radius: 15,
      weight: 2,
    }).addTo(mapRef.current);

    hoverMarkerRef.current.bringToFront();
  }, []);

  const hideHoverMarker = useCallback(() => {
    if (hoverMarkerRef.current != null) {
      hoverMarkerRef.current.remove();
      hoverMarkerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (mapContainerRef.current == null || mapRef.current != null) {
      return;
    }

    const tileUrl = getMapTileUrl();
    const map = L.map(mapContainerRef.current).setView([55.5, 18.0], 6);

    const tileLayer = L.tileLayer(tileUrl, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    ellipsesLayerRef.current = L.layerGroup().addTo(map);
    collateralConcernsLayerRef.current = L.layerGroup().addTo(map);
    unitsLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      if (hoverMarkerRef.current != null) {
        hoverMarkerRef.current.remove();
        hoverMarkerRef.current = null;
      }
      if (tileLayerRef.current != null) {
        tileLayerRef.current.remove();
        tileLayerRef.current = null;
      }
      if (mapRef.current != null) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update tile layer when theme changes
  useEffect(() => {
    if (mapRef.current == null || tileLayerRef.current == null) {
      return;
    }

    // Defer reading CSS variable to next tick to ensure computed styles are updated
    setTimeout(() => {
      if (mapRef.current == null || tileLayerRef.current == null) {
        return;
      }

      const tileUrl = getMapTileUrl();

      tileLayerRef.current.remove();

      const newTileLayer = L.tileLayer(tileUrl, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(mapRef.current);

      tileLayerRef.current = newTileLayer;
    }, 0);
  }, [theme]);

  useEffect(() => {
    if (associatingElint) {
      return;
    }

    getAssociatedElintPrimaryKeys(selectedUnit).then(setAssociatedElintPrimaryKeys);
  }, [selectedUnit, associatingElint]);

  useEffect(() => {
    if (mapRef.current == null || ellipsesLayerRef.current == null) {
      return;
    }

    ellipsesLayerRef.current.clearLayers();
    hideHoverMarker();

    const colors = getMapColors();

    elints.forEach((elintData) => {
      try {
        const isHostileSelected = selectedUnit != null && selectedUnit.affiliation?.toLowerCase() === Affiliations.HOSTILE;

        if (elintData.reportedPosition != null && elintData.reportedPosition.coordinates != null) {
          const center: [number, number] = [
            elintData.reportedPosition.coordinates[1],
            elintData.reportedPosition.coordinates[0]
          ];

          const elintPrimaryKey = String(elintData.$primaryKey);
          const isAssociated = associatedElintPrimaryKeys.has(elintPrimaryKey);

          if (isAssociated && isHostileSelected && ellipsesLayerRef.current != null) {
            L.circleMarker(center, {
              color: colors.unitHostileColor,
              fillColor: colors.unitHostileColor,
              fillOpacity: 0.2,
              interactive: false,
              radius: 10,
              weight: 2,
            }).addTo(ellipsesLayerRef.current);
          }

          if (ellipsesLayerRef.current != null) {
            const marker = L.circleMarker(center, {
              className: isHostileSelected ? 'elint-selectable' : '',
              color: colors.elintColor,
              fillColor: colors.elintColor,
              fillOpacity: 0.7,
              radius: 6,
              weight: 2,
            }).addTo(ellipsesLayerRef.current);

            if (isHostileSelected) {
              marker.on('mouseover', () => {
                showHoverMarker(center, colors.elintColor);
              });

              marker.on('mouseout', () => {
                hideHoverMarker();
              });

              marker.on('click', (e) => {
                e.originalEvent.stopPropagation();
                hideHoverMarker();
                selectElint(elintData);
              });
            }
          }
        }
      } catch {
        console.error("Malformed ELINT: ", elintData);
      }
    });
  }, [elints, selectedUnit, selectElint, associatedElintPrimaryKeys, hideHoverMarker, showHoverMarker]);

  useEffect(() => {
    if (mapRef.current == null || collateralConcernsLayerRef.current == null) {
      return;
    }

    collateralConcernsLayerRef.current.clearLayers();
    const colors = getMapColors();
    const layerGroup = collateralConcernsLayerRef.current;

    collateralConcerns.forEach((concern) => {
      try {
        const { geometry } = concern;

        if (geometry == null) {
          return;
        }

        if (geometry.type === "Polygon" && geometry.coordinates != null) {
          const coords = geometry.coordinates[0].map<[number, number]>((coord: number[]) => [coord[1], coord[0]]);
          L.polygon(coords, {
            color: colors.collateralConcernColor,
            fillOpacity: 0,
            weight: 4,
          }).addTo(layerGroup);
        } else if (geometry.type === "MultiPolygon" && geometry.coordinates != null) {
          geometry.coordinates.forEach((polygon: number[][][]) => {
            const coords = polygon[0].map<[number, number]>((coord: number[]) => [coord[1], coord[0]]);
            L.polygon(coords, {
              color: colors.collateralConcernColor,
              fillOpacity: 0,
              weight: 4,
            }).addTo(layerGroup);
          });
        } else if (geometry.type === "LineString" && geometry.coordinates != null) {
          const coords = geometry.coordinates.map<[number, number]>((coord: number[]) => [coord[1], coord[0]]);
          L.polyline(coords, {
            color: colors.collateralConcernColor,
            weight: 4,
          }).addTo(layerGroup);
        } else if (geometry.type === "Point" && geometry.coordinates != null) {
          const center: [number, number] = [geometry.coordinates[1], geometry.coordinates[0]];
          L.circle(center, {
            color: colors.collateralConcernColor,
            fillOpacity: 0,
            radius: 100,
            weight: 4,
          }).addTo(layerGroup);
        }
      } catch {
        console.error("Malformed collateral concern geometry: ", concern);
      }
    });
  }, [collateralConcerns]);

  useEffect(() => {
    if (mapRef.current == null || unitsLayerRef.current == null) {
      return;
    }

    unitsLayerRef.current.clearLayers();
    const colors = getMapColors();
    const layerGroup = unitsLayerRef.current;

    unitLocations.forEach((unitLocation) => {
      try {
        const { location, unit } = unitLocation;
        const unitColor = getUnitColor(unit.affiliation, colors);

        const marker = L.circleMarker([location.lat, location.lng], {
          color: unitColor,
          fillColor: unitColor,
          fillOpacity: 0.7,
          radius: 6,
          weight: 2,
        }).addTo(layerGroup);

        marker.bindPopup(
          `<strong>${unit.$title ?? 'Unit'}</strong><br/>
           ${unit.affiliation != null ? `Affiliation: ${unit.affiliation}<br/>` : ''}
           ${unit.allegiance != null ? `Allegiance: ${unit.allegiance}` : ''}`
        );

        marker.on('click', () => {
          selectUnit(unit);
        });
      } catch {
        console.error("Malformed unit data: ", unitLocation);
      }
    });
  }, [unitLocations, selectUnit]);

  useEffect(() => {
    if (
      mapRef.current == null ||
      ellipsesLayerRef.current == null ||
      collateralConcernsLayerRef.current == null ||
      unitsLayerRef.current == null ||
      (elints.length === 0 && collateralConcerns.length === 0 && unitLocations.length === 0)
    ) {
      return;
    }

    const bounds = L.latLngBounds([]);

    const extendBounds = (layer: any) => {
      if (layer.getBounds) {
        bounds.extend(layer.getBounds());
      } else if (layer.getLatLng) {
        bounds.extend(layer.getLatLng());
      }
    };

    ellipsesLayerRef.current.eachLayer(extendBounds);
    collateralConcernsLayerRef.current.eachLayer(extendBounds);
    unitsLayerRef.current.eachLayer(extendBounds);

    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [elints, collateralConcerns, unitLocations]);

  return (
    <div className={styles.mapWrapper}>
      <div ref={mapContainerRef} className={styles.mapContainer} />
      {loadingMapData && (
        <div className={styles.loadingOverlay}>
          <Spinner size={50} />
          <div className={styles.comicLoadingText} />
        </div>
      )}
    </div>
  );
};

export default LeftMapContainer;
