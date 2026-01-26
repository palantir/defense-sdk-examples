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
} from "../features/osdk/osdk.selectors";
import {
  loadTargets,
  setSelectedTargetBoard,
  setTargets,
} from "../features/osdk/osdk.slice";
import AddObservation from "./modals/AddObservation";
import CreateTarget from "./modals/CreateTarget";

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

// Create a function to get a dynamic marker icon with the current theme color
const createDiamondIcon = (): L.DivIcon => {
  // Get the marker color from CSS variables
  const markerColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--marker-color")
    .trim();

  // Create a div icon with inline SVG using the current theme color
  return L.divIcon({
    html: `
      <svg 
        width="25" 
        height="25" 
        viewBox="0 0 16 16" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          fill="${markerColor}" 
          fill-rule="evenodd" 
          clip-rule="evenodd" 
          d="M12,8.01c0-0.19-0.07-0.36-0.16-0.51l0.01-0.01l-3-5L8.84,2.5C8.67,2.21,8.36,2.01,8,2.01
          S7.33,2.21,7.16,2.5L7.14,2.49l-3,5L4.16,7.5C4.07,7.65,4,7.82,4,8.01s0.07,0.36,0.16,0.51L4.14,8.52l3,5
          l0.01-0.01C7.33,13.8,7.64,14.01,8,14.01s0.67-0.2,0.84-0.49l0.01,0.01l3-5l-0.01-0.01
          C11.93,8.36,12,8.2,12,8.01z"
        />
      </svg>
    `,
    className: "diamond-marker",
    iconSize: [25, 25],
    iconAnchor: [12.5, 12.5],
  });
};

interface TargetMapProps {
  setSelectedTarget: (target: any) => void;
  setModalContent: (content: string | null) => void;
  modalContent: string | null;
  selectedTarget: any;
  setTargetsWithoutLocation: (targets: any[]) => void;
  setContextMenuLocation: (
    location: { lat: number; lon: number } | null,
  ) => void;
}

const TargetMap: React.FC<TargetMapProps> = ({
  setSelectedTarget,
  setModalContent,
  modalContent,
  selectedTarget,
  setTargetsWithoutLocation,
}) => {
  const dispatch = useDispatch();
  const selectedBoard = useSelector(selectLoadedTargetBoard);
  const targets = useSelector(selectTargetBoardTargets);

  const [map, setMap] = useState<L.Map | null>(null);
  const [markers, setMarkers] = useState<L.Marker[]>([]);
  const [cursorLocation, setCursorLocation] = useState<{
    lat: number;
    lon: number;
  }>({ lat: 37.9474, lon: -122.454 });
  const [zoomLevel, setZoomLevel] = useState<number>(9);
  const [contextMenuLocation, setContextMenuLocationState] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [inputValue, setInputValue] = useState<string>(selectedBoard || "");

  const mapRef = useRef<HTMLDivElement>(null);

  // Function to get the current tile URL from CSS variables
  const getMapTileUrl = (): string => {
    const tileUrl = getComputedStyle(document.documentElement)
      .getPropertyValue("--map-tile-url")
      .trim()
      .replace(/['"]+/g, ""); // Remove any quotes
    return tileUrl;
  };

  // Function to get a diamond marker that updates with the theme
  const getDiamondIcon = () => {
    return createDiamondIcon();
  };

  // Create a state to store the current icon
  const [diamondIcon, setDiamondIcon] = useState(getDiamondIcon());

  // Update the icon when theme changes
  useEffect(() => {
    const updateDiamondIcon = () => {
      setDiamondIcon(getDiamondIcon());
    };

    // Create a MutationObserver to watch for theme changes
    const observer = new MutationObserver(updateDiamondIcon);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    // Watch for media query changes too
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      // Use setTimeout to ensure CSS variables are updated first
      setTimeout(updateDiamondIcon, 100);
    };
    mediaQuery.addEventListener("change", handleChange);

    // Clean up
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

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

  const handleBoardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleBoardKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setSelectedTarget(null);
      dispatch(setTargets([]));
      dispatch(setSelectedTargetBoard(inputValue));
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
      const targetsWithoutValidLocation: any[] = [];

      targets.forEach((target) => {
        if (
          target.location &&
          target.location.latitude &&
          target.location.longitude
        ) {
          const marker = L.marker(
            [target.location.latitude, target.location.longitude],
            { icon: diamondIcon } as L.MarkerOptions,
          );
          marker.on("click", () => handleMarkerClick(target));
          marker.on("mouseover", () => marker.openPopup());
          marker.on("mouseout", () => marker.closePopup());

          marker.bindPopup(
            `<div><strong>${target.name}</strong><p>${target.column}</p></div>`,
          );
          marker.addTo(map);

          newMarkers.push(marker);
        } else {
          targetsWithoutValidLocation.push(target);
        }
      });

      setMarkers(newMarkers);
      setTargetsWithoutLocation(targetsWithoutValidLocation);
    }
  }, [map, selectedBoard, targets, diamondIcon]);

  return (
    <div className="map-container" style={{ marginTop: "20px" }}>
      <div className="target-board-selector-container">
        <div className="target-board-selector">
          <label htmlFor="target-board">Target Board RID:</label>
          <input
            type="text"
            id="target-board"
            onChange={handleBoardChange}
            onKeyPress={handleBoardKeyPress}
            value={inputValue}
            placeholder="Enter Target Board ID"
          />
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
