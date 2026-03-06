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

import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Spinner } from "@blueprintjs/core";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RootState } from "../../../store/store";
import { loadMapData, selectUnit, selectElint } from "../../../store/features/osdk/osdkSlice";
import { intelligenceSubject } from "@defense-osdk/sdk";
import { useTheme } from "../../../context/ThemeContext";
import styles from "./LeftMapContainer.module.scss";

const LeftMapContainer: React.FC = () => {
  const { theme } = useTheme();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const ellipsesLayerRef = useRef<L.LayerGroup | null>(null);
  const collateralConcernsLayerRef = useRef<L.LayerGroup | null>(null);
  const unitsLayerRef = useRef<L.LayerGroup | null>(null);
  const hoverMarkerRef = useRef<L.CircleMarker | null>(null);

  const dispatch = useDispatch();
  const elints = useSelector((state: RootState) => state.osdk.elints);
  const collateralConcerns = useSelector((state: RootState) => state.osdk.collateralConcerns);
  const unitLocations = useSelector((state: RootState) => state.osdk.unitLocations);
  const loadingMapData = useSelector((state: RootState) => state.osdk.loadingMapData);
  const selectedUnit = useSelector((state: RootState) => state.osdk.selectedUnit);
  const associatingElint = useSelector((state: RootState) => state.osdk.associatingElint);

  const [associatedElintPrimaryKeys, setAssociatedElintPrimaryKeys] = useState<Set<string>>(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const prevAssociatingRef = useRef(associatingElint);

  // Get colors from CSS variables
  const getMapColors = () => {
    const rootStyles = getComputedStyle(document.documentElement);
    return {
      elintColor: rootStyles.getPropertyValue('--elint-color').trim(),
      collateralConcernColor: rootStyles.getPropertyValue('--collateral-concern-color').trim(),
      unitFriendColor: rootStyles.getPropertyValue('--unit-friend-color').trim(),
      unitHostileColor: rootStyles.getPropertyValue('--unit-hostile-color').trim(),
      unitOtherColor: rootStyles.getPropertyValue('--unit-other-color').trim(),
    };
  };

  const getUnitColor = (affiliation: string | undefined, colors: ReturnType<typeof getMapColors>) => {
    if (!affiliation) return colors.unitOtherColor;
    const lowerAffiliation = affiliation.toLowerCase();
    if (lowerAffiliation === 'hostile') return colors.unitHostileColor;
    if (lowerAffiliation.includes('friend')) return colors.unitFriendColor;
    return colors.unitOtherColor;
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const tileUrl = getComputedStyle(document.documentElement)
      .getPropertyValue('--map-tile-url')
      .trim()
      .replace(/^["']|["']$/g, '');

    const map = L.map(mapContainerRef.current).setView([55.5, 18.0], 6);

    const tileLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    ellipsesLayerRef.current = L.layerGroup().addTo(map);
    collateralConcernsLayerRef.current = L.layerGroup().addTo(map);
    unitsLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      if (hoverMarkerRef.current) {
        hoverMarkerRef.current.remove();
        hoverMarkerRef.current = null;
      }
      if (tileLayerRef.current) {
        tileLayerRef.current.remove();
        tileLayerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update tile layer when theme changes
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;

    // Defer reading CSS variable to next tick to ensure computed styles are updated
    setTimeout(() => {
      if (!mapRef.current || !tileLayerRef.current) return;

      const tileUrl = getComputedStyle(document.documentElement)
        .getPropertyValue('--map-tile-url')
        .trim()
        .replace(/^["']|["']$/g, '');

      // Remove old tile layer
      tileLayerRef.current.remove();

      // Add new tile layer with updated URL
      const newTileLayer = L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }).addTo(mapRef.current);

      tileLayerRef.current = newTileLayer;
    }, 0);
  }, [theme]);

  useEffect(() => {
    if (prevAssociatingRef.current === true && associatingElint === false) {
      setRefreshTrigger(prev => prev + 1);
    }
    prevAssociatingRef.current = associatingElint;
  }, [associatingElint]);

  useEffect(() => {
    const fetchAssociatedElints = async () => {
      if (!selectedUnit) {
        setAssociatedElintPrimaryKeys(new Set());
        return;
      }

      const affiliation = selectedUnit.affiliation?.toLowerCase();
      const isHostile = affiliation === 'hostile';

      if (!isHostile) {
        setAssociatedElintPrimaryKeys(new Set());
        return;
      }

      try {
        const asIntelligenceSubject = (selectedUnit as any).$as(intelligenceSubject);
        const link = (asIntelligenceSubject as any).$link;

        if (!link || !link["com.palantir.ontology.defense-types.linkedIntelligence"]) {
          setAssociatedElintPrimaryKeys(new Set());
          return;
        }

        const { data } = await link["com.palantir.ontology.defense-types.linkedIntelligence"].fetchPage({
          $pageSize: 1000,
        });

        const primaryKeys = new Set(data.map((elint: any) => elint.$primaryKey));
        setAssociatedElintPrimaryKeys(primaryKeys);
      } catch {
        setAssociatedElintPrimaryKeys(new Set());
      }
    };

    fetchAssociatedElints();
  }, [selectedUnit, refreshTrigger]);

  const showHoverMarker = (center: [number, number], color: string) => {
    if (!mapRef.current) return;

    if (hoverMarkerRef.current) {
      hoverMarkerRef.current.remove();
    }

    hoverMarkerRef.current = L.circleMarker(center, {
      radius: 15,
      color: color,
      fillColor: color,
      fillOpacity: 0.3,
      weight: 2,
      opacity: 0.7,
      interactive: false,
    }).addTo(mapRef.current);

    hoverMarkerRef.current.bringToFront();
  };

  const hideHoverMarker = () => {
    if (hoverMarkerRef.current) {
      hoverMarkerRef.current.remove();
      hoverMarkerRef.current = null;
    }
  };


  useEffect(() => {
    dispatch(loadMapData());
  }, [dispatch]);

  useEffect(() => {
    if (!mapRef.current || !ellipsesLayerRef.current) return;

    ellipsesLayerRef.current.clearLayers();
    hideHoverMarker();

    const colors = getMapColors();

    elints.forEach((elintData) => {
      try {
        const isHostileSelected = selectedUnit && selectedUnit.affiliation?.toLowerCase() === 'hostile';

        if (elintData.reportedPosition && elintData.reportedPosition.coordinates) {
          const center: [number, number] = [
            elintData.reportedPosition.coordinates[1],
            elintData.reportedPosition.coordinates[0]
          ];

          const elintPrimaryKey = (elintData as any).$primaryKey;
          const isAssociated = associatedElintPrimaryKeys.has(elintPrimaryKey);

          if (isAssociated && isHostileSelected) {
            L.circleMarker(center, {
              radius: 10,
              color: colors.unitHostileColor,
              fillColor: colors.unitHostileColor,
              fillOpacity: 0.2,
              weight: 2,
              interactive: false,
            }).addTo(ellipsesLayerRef.current!);
          }

          const marker = L.circleMarker(center, {
            radius: 6,
            color: colors.elintColor,
            fillColor: colors.elintColor,
            fillOpacity: 0.7,
            weight: 2,
            className: isHostileSelected ? 'elint-selectable' : '',
          }).addTo(ellipsesLayerRef.current!);

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
              dispatch(selectElint(elintData));
            });
          }
        }
      } catch {
        console.error("Malformed ELINT: ", elintData);
      }
    });
  }, [elints, selectedUnit, dispatch, associatedElintPrimaryKeys]);

  useEffect(() => {
    if (!mapRef.current || !collateralConcernsLayerRef.current) return;

    collateralConcernsLayerRef.current.clearLayers();

    const colors = getMapColors();

    collateralConcerns.forEach((concern) => {
      try {
        const geometry = concern.geometry;

        if (!geometry) return;

        if (geometry.type === "Polygon" && geometry.coordinates) {
          const coords = geometry.coordinates[0].map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
          L.polygon(coords, {
            color: colors.collateralConcernColor,
            fillOpacity: 0,
            weight: 4,
          }).addTo(collateralConcernsLayerRef.current!);
        } else if (geometry.type === "MultiPolygon" && geometry.coordinates) {
          geometry.coordinates.forEach((polygon: number[][][]) => {
            const coords = polygon[0].map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
            L.polygon(coords, {
              color: colors.collateralConcernColor,
              fillOpacity: 0,
              weight: 4,
            }).addTo(collateralConcernsLayerRef.current!);
          });
        } else if (geometry.type === "LineString" && geometry.coordinates) {
          const coords = geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
          L.polyline(coords, {
            color: colors.collateralConcernColor,
            weight: 4,
          }).addTo(collateralConcernsLayerRef.current!);
        } else if (geometry.type === "Point" && geometry.coordinates) {
          const center: [number, number] = [geometry.coordinates[1], geometry.coordinates[0]];
          L.circle(center, {
            radius: 100,
            color: colors.collateralConcernColor,
            fillOpacity: 0,
            weight: 4,
          }).addTo(collateralConcernsLayerRef.current!);
        }
      } catch {
        console.error("Malformed collateral concern geometry: ", concern)
      }
    });
  }, [collateralConcerns]);

  useEffect(() => {
    if (!mapRef.current || !unitsLayerRef.current) return;

    unitsLayerRef.current.clearLayers();

    const colors = getMapColors();

    unitLocations.forEach((unitLocation) => {
      try {
        const { location, unit } = unitLocation;
        const unitColor = getUnitColor(unit.affiliation, colors);

        const marker = L.circleMarker([location.lat, location.lng], {
          radius: 6,
          color: unitColor,
          fillColor: unitColor,
          fillOpacity: 0.7,
          weight: 2,
        }).addTo(unitsLayerRef.current!);

        marker.bindPopup(
          `<strong>${unit.$title || 'Unit'}</strong><br/>
           ${unit.affiliation ? `Affiliation: ${unit.affiliation}<br/>` : ''}
           ${unit.allegiance ? `Allegiance: ${unit.allegiance}` : ''}`
        );

        marker.on('click', () => {
          dispatch(selectUnit(unit));
        });
      } catch {
        console.error("Malformed unit data: ", unitLocation);
      }
    });
  }, [unitLocations]);

  useEffect(() => {
    if (!mapRef.current || !ellipsesLayerRef.current || !collateralConcernsLayerRef.current || !unitsLayerRef.current) return;
    if (elints.length === 0 && collateralConcerns.length === 0 && unitLocations.length === 0) return;

    const bounds = L.latLngBounds([]);

    ellipsesLayerRef.current.eachLayer((layer: any) => {
      if (layer.getBounds) {
        bounds.extend(layer.getBounds());
      } else if (layer.getLatLng) {
        bounds.extend(layer.getLatLng());
      }
    });

    collateralConcernsLayerRef.current.eachLayer((layer: any) => {
      if (layer.getBounds) {
        bounds.extend(layer.getBounds());
      } else if (layer.getLatLng) {
        bounds.extend(layer.getLatLng());
      }
    });

    unitsLayerRef.current.eachLayer((layer: any) => {
      if (layer.getBounds) {
        bounds.extend(layer.getBounds());
      } else if (layer.getLatLng) {
        bounds.extend(layer.getLatLng());
      }
    });

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
