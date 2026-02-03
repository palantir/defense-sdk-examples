/*
 * (c) Copyright 2024 Palantir Technologies Inc. All rights reserved.
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
import L from "leaflet";
import "leaflet-contextmenu";
import "leaflet/dist/leaflet.css";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  selectLoadedTargetBoard,
  selectTargetBoardTargets,
  selectTargetBoards,
  selectTargetBoardsLoading,
  selectTargetBoardsError,
} from "../store/features/targeting/targetingSelectors";
import { selectSelectedLayerGeoJSONElements } from "../store/features/gaia/gaiaSelectors";
import {
  loadTargets,
  setSelectedTargetBoard,
  setTargets,
  loadTargetBoards,
} from "../store/features/targeting/targetingSlice";
import AddObservation from "./modals/AddObservation";
import CreateTarget from "./modals/CreateTarget";
import { createDiamondIcon } from "./icons/DiamondIcon";

// Import CSS variables for map tiles
import "../_variables.scss";

// Extend the Leaflet Map type to include contextmenu properties
declare module "leaflet" {
  interface Map {
    contextmenu: {
      removeAllItems: () => void;
      addItem: (item: any) => void;
    };
  }
}

interface TargetMapProps {
  setSelectedTarget: (target: any) => void;
  setModalContent: (content: string | null) => void;
  modalContent: string | null;
  selectedTarget: any;
  setContextMenuLocation: (
    location: { lat: number; lon: number } | null,
  ) => void;
}

const TargetMap: React.FC<TargetMapProps> = ({
  setSelectedTarget,
  setModalContent,
  modalContent,
  selectedTarget,
}) => {
  const dispatch = useDispatch();
  const selectedBoard = useSelector(selectLoadedTargetBoard);
  const targets = useSelector(selectTargetBoardTargets);
  const geoJsonElements = useSelector(selectSelectedLayerGeoJSONElements);

  const [map, setMap] = useState<L.Map | null>(null);
  const [markers, setMarkers] = useState<L.Marker[]>([]);
  const [geoJsonLayers, setGeoJsonLayers] = useState<L.Layer[]>([]);
  const [cursorLocation, setCursorLocation] = useState<{
    lat: number;
    lon: number;
  }>({ lat: 37.9474, lon: -122.454 });
  const [zoomLevel, setZoomLevel] = useState<number>(9);
  const [contextMenuLocation, setContextMenuLocationState] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string>(
    selectedBoard || "",
  );
  const targetBoards = useSelector(selectTargetBoards);
  const loadingBoards = useSelector(selectTargetBoardsLoading);
  const boardsError = useSelector(selectTargetBoardsError);

  const mapRef = useRef<HTMLDivElement>(null);

  // Function to get the current tile URL from CSS variables
  const getMapTileUrl = (): string => {
    const tileUrl = getComputedStyle(document.documentElement)
      .getPropertyValue("--map-tile-url")
      .trim()
      .replace(/['"]+/g, ""); // Remove any quotes
    return tileUrl;
  };

  // Listen for changes to the color scheme preference
  useEffect(() => {
    if (!map) return;

    // Get the CSS variables observer to detect theme changes
    const observer = new MutationObserver(() => {
      // Update map tiles when CSS variables change
      map.eachLayer((layer) => {
        if ((layer as L.TileLayer).options.attribution?.includes("CARTO")) {
          map.removeLayer(layer);
        }
      });

      // Get the current tile URL from CSS variables
      const tileUrl = getMapTileUrl();

      L.tileLayer(tileUrl, {
        attribution:
          '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);
    });

    // Observe for changes to document's style attribute (dark/light mode changes)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    // Add listener for media query changes too
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      // This will force a refresh of the map tiles based on the new theme
      // We're using setTimeout to ensure CSS variables are updated first
      setTimeout(() => {
        map.eachLayer((layer) => {
          if ((layer as L.TileLayer).options.attribution?.includes("CARTO")) {
            map.removeLayer(layer);
          }
        });

        const tileUrl = getMapTileUrl();

        L.tileLayer(tileUrl, {
          attribution:
            '&copy; <a href="https://carto.com/attributions">CARTO</a>',
        }).addTo(map);
      }, 100);
    };

    // Add the listener
    mediaQuery.addEventListener("change", handleChange);

    // Clean up
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [map]);

  useEffect(() => {
    if (mapRef.current && !map) {
      // Define context menu items
      const contextmenuItems = [
        {
          text: "Create Target",
          callback: (e: L.ContextMenuItemClickEvent) => {
            setContextMenuLocationState({
              lat: e.latlng.lat,
              lon: e.latlng.lng,
            });
            setModalContent("createTarget");
          },
        },
      ];

      // Initialize map with context menu
      const initializedMap = L.map(mapRef.current, {
        center: [cursorLocation.lat, cursorLocation.lon],
        zoom: zoomLevel,
        contextmenu: true,
        contextmenuItems: contextmenuItems,
      }).setView([cursorLocation.lat, cursorLocation.lon], zoomLevel);

      // Get the current tile URL from CSS variables
      const tileUrl = getMapTileUrl();

      L.tileLayer(tileUrl, {
        attribution:
          '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(initializedMap);

      initializedMap.on("mousemove", (e: L.LeafletMouseEvent) => {
        setCursorLocation({ lat: e.latlng.lat, lon: e.latlng.lng });
      });

      initializedMap.on("zoomend", () => {
        setZoomLevel(initializedMap.getZoom());
      });

      setMap(initializedMap);
    }
  }, [mapRef, map, cursorLocation.lat, cursorLocation.lon, zoomLevel]);

  // Load target boards on component mount
  useEffect(() => {
    dispatch(loadTargetBoards());
  }, [dispatch]);

  // Handle board selection change
  const handleBoardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const boardId = e.target.value;
    setSelectedBoardId(boardId);

    if (boardId) {
      setSelectedTarget(null);
      dispatch(setTargets([]));
      dispatch(setSelectedTargetBoard(boardId));
      dispatch(loadTargets());
    }
  };

  const handleMarkerClick = (target: any) => {
    setSelectedTarget(target);
  };

  // Update context menu when selected target changes
  useEffect(() => {
    if (map) {
      // Clear all existing context menu items
      map.contextmenu.removeAllItems();

      // Add Create Target option (always available)
      map.contextmenu.addItem({
        text: "Create Target",
        callback: (e: L.ContextMenuItemClickEvent) => {
          setContextMenuLocationState({ lat: e.latlng.lat, lon: e.latlng.lng });
          setModalContent("createTarget");
        },
      });

      // Only add the Add Observation option if a target is selected
      if (selectedTarget) {
        map.contextmenu.addItem({
          text: "Add Observation",
          callback: (e: L.ContextMenuItemClickEvent) => {
            setContextMenuLocationState({
              lat: e.latlng.lat,
              lon: e.latlng.lng,
            });
            setModalContent("addObservation");
          },
        });
      }
    }
  }, [map, selectedTarget, setModalContent]);

  // Update markers when theme changes
  useEffect(() => {
    if (map && selectedBoard && targets.length > 0) {
      // Recreate markers with the new icon style
      markers.forEach((marker) => map.removeLayer(marker));
      setMarkers([]);

      const newMarkers: L.Marker[] = [];

      targets.forEach((target) => {
        if (
          target.location &&
          target.location.latitude &&
          target.location.longitude
        ) {
          const marker = L.marker(
            [target.location.latitude, target.location.longitude],
            { icon: createDiamondIcon() } as L.MarkerOptions,
          );
          marker.on("click", () => handleMarkerClick(target));
          marker.on("mouseover", () => marker.openPopup());
          marker.on("mouseout", () => marker.closePopup());

          marker.bindPopup(
            `<div><strong>${target.name}</strong><p>${target.column}</p></div>`,
          );
          marker.addTo(map);

          newMarkers.push(marker);
        }
      });

      setMarkers(newMarkers);
    }
  }, [map, selectedBoard, targets]);

  // Render GeoJSON layers
  useEffect(() => {
    if (!map || !geoJsonElements || geoJsonElements.length === 0) {
      // Clean up existing layers if no elements
      geoJsonLayers.forEach((layer) => map?.removeLayer(layer));
      setGeoJsonLayers([]);
      return;
    }

    console.log("Rendering GeoJSON elements:", geoJsonElements.length);

    // Remove existing GeoJSON layers
    geoJsonLayers.forEach((layer) => map.removeLayer(layer));
    const newLayers: L.Layer[] = [];

    geoJsonElements.forEach((element) => {
      if (!element.features) return;

      element.features.forEach((feature) => {
        try {
          // Create GeoJSON layer
          const geoJsonLayer = L.geoJSON(
            {
              type: "Feature",
              geometry: feature.geometry as any,
              properties: feature.properties || {},
            },
            {
              style: () => {
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
              },
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

                layer.bindPopup(content);

                // Add tooltip for labels
                if (feature.style?.label?.text) {
                  layer.bindTooltip(feature.style.label.text.trim(), {
                    permanent: false,
                    direction: "top",
                  });
                }
              },
            },
          );

          geoJsonLayer.addTo(map);
          newLayers.push(geoJsonLayer);
        } catch (error) {
          console.error(
            `Error rendering feature for element ${element.id}:`,
            error,
          );
        }
      });
    });

    setGeoJsonLayers(newLayers);

    // Fit map bounds to show all layers if there are any
    if (newLayers.length > 0) {
      const group = L.featureGroup(newLayers);
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }, [map, geoJsonElements]);

  return (
    <div className="map-container" style={{ marginTop: "20px" }}>
      <div className="target-board-selector-container">
        <div className="target-board-selector">
          <label htmlFor="target-board">Target Board:</label>
          {loadingBoards ? (
            <div className="loading-indicator">Loading target boards...</div>
          ) : boardsError ? (
            <div className="error-message">
              Error loading boards: {boardsError}
            </div>
          ) : (
            <select
              id="target-board"
              onChange={handleBoardChange}
              value={selectedBoardId}
              className="board-dropdown"
            >
              <option value="">Select a Target Board</option>
              {targetBoards.map((board) => (
                <option key={board.rid} value={board.rid}>
                  {board.title}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {selectedBoard && (
        <div className="map-instructions">
          <br></br>
          Right click on the map to create a new target for the loaded target
          board.
          <br></br>
          Select a target to view details and right click on the map to add a
          new observation for a selected target.
        </div>
      )}
      <div ref={mapRef} className="leaflet-map"></div>
      <div className="map-info">
        [{cursorLocation.lat.toFixed(4)}, {cursorLocation.lon.toFixed(4)}],
        zoom: {zoomLevel}
      </div>
      {modalContent === "createTarget" && (
        <CreateTarget
          selectedBoard={selectedBoard}
          onClose={() => setModalContent(null)}
          initialLat={contextMenuLocation?.lat}
          initialLon={contextMenuLocation?.lon}
        />
      )}
      {modalContent === "addObservation" &&
        selectedTarget &&
        contextMenuLocation && (
          <AddObservation
            selectedTarget={selectedTarget}
            onClose={() => setModalContent(null)}
            initialLat={contextMenuLocation.lat}
            initialLon={contextMenuLocation.lon}
          />
        )}
    </div>
  );
};

export default TargetMap;
