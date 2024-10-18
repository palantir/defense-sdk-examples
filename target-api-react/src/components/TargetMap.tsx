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
import L from 'leaflet';
import 'leaflet-contextmenu';
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectLoadedTargetBoard, selectTargetBoardTargets } from '../features/targetApiGateway/targetApiGateway.selectors';
import { loadTargets, setSelectedTargetBoard, setTargets } from '../features/targetApiGateway/targetApiGateway.slice';
import AddObservation from './modals/AddObservation';
import CreateTarget from './modals/CreateTarget';

const redDiamondIcon = new L.Icon({
  iconUrl: '/symbol-diamond.svg',
  iconSize: [25, 25],
  iconAnchor: [12.5, 12.5],
});

interface TargetMapProps {
  setSelectedTarget: (target: any) => void;
  setModalContent: (content: string | null) => void;
  modalContent: string | null;
  selectedTarget: any;
  setTargetsWithoutLocation: (targets: any[]) => void;
  setContextMenuLocation: (location: { lat: number; lon: number } | null) => void;
}

const TargetMap: React.FC<TargetMapProps> = ({ setSelectedTarget, setModalContent, modalContent, selectedTarget, setTargetsWithoutLocation }) => {
  const dispatch = useDispatch();
  const selectedBoard = useSelector(selectLoadedTargetBoard);
  const targets = useSelector(selectTargetBoardTargets);

  const [map, setMap] = useState<L.Map | null>(null);
  const [markers, setMarkers] = useState<L.Marker[]>([]);
  const [cursorLocation, setCursorLocation] = useState<{ lat: number; lon: number }>({ lat: 37.9474, lon: -122.4540 });
  const [zoomLevel, setZoomLevel] = useState<number>(9);
  const [contextMenuLocation, setContextMenuLocationState] = useState<{ lat: number; lon: number } | null>(null);
  const [inputValue, setInputValue] = useState<string>(selectedBoard || '');

  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mapRef.current && !map) {
      const initializedMap = L.map(mapRef.current, {
        center: [cursorLocation.lat, cursorLocation.lon],
        zoom: zoomLevel,
        contextmenu: true,
        contextmenuItems: [
          {
            text: 'Create Target',
            callback: (e: L.ContextMenuItemClickEvent) => {
              setContextMenuLocationState({ lat: e.latlng.lat, lon: e.latlng.lng });
              setModalContent('createTarget');
            },
          },
          {
            text: 'Add Observation',
            callback: (e: L.ContextMenuItemClickEvent) => {
              setContextMenuLocationState({ lat: e.latlng.lat, lon: e.latlng.lng });
              setModalContent('addObservation');
            },
          },
        ],
      }).setView([cursorLocation.lat, cursorLocation.lon], zoomLevel);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(initializedMap);

      initializedMap.on('mousemove', (e: L.LeafletMouseEvent) => {
        setCursorLocation({ lat: e.latlng.lat, lon: e.latlng.lng });
      });

      initializedMap.on('zoomend', () => {
        setZoomLevel(initializedMap.getZoom());
      });

      setMap(initializedMap);
    }
  }, [mapRef, map, cursorLocation.lat, cursorLocation.lon, zoomLevel]);

  const handleBoardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleBoardKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setSelectedTarget(null);
      dispatch(setTargets([]));
      dispatch(setSelectedTargetBoard(inputValue));
      dispatch(loadTargets());
    }
  };

  const handleMarkerClick = (target: any) => {
    setSelectedTarget(target);
  };

  useEffect(() => {
    if (map && selectedBoard) {
      markers.forEach(marker => map.removeLayer(marker));
      setMarkers([]);

      const newMarkers: L.Marker[] = [];
      const targetsWithoutValidLocation: any[] = [];

      targets.forEach(target => {
        if (target.location && target.location.latitude && target.location.longitude) {
          const marker = L.marker(
            [target.location.latitude, target.location.longitude],
            { icon: redDiamondIcon } as L.MarkerOptions
          );
          marker.on('click', () => handleMarkerClick(target));
          marker.on('mouseover', () => marker.openPopup());
          marker.on('mouseout', () => marker.closePopup());

          marker.bindPopup(`<div><strong>${target.name}</strong><p>${target.column}</p></div>`);
          marker.addTo(map);

          newMarkers.push(marker);
        } else {
          targetsWithoutValidLocation.push(target);
        }
      });

      setMarkers(newMarkers);
      setTargetsWithoutLocation(targetsWithoutValidLocation);
    }
  }, [map, selectedBoard, targets]);

  return (
    <div className="map-container" style={{ marginTop: '20px' }}>
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
      <div ref={mapRef} className="leaflet-map"></div>
      <div className="map-info">
        [{cursorLocation.lat.toFixed(4)}, {cursorLocation.lon.toFixed(4)}], zoom: {zoomLevel}
      </div>
      {modalContent === 'createTarget' && contextMenuLocation && (
        <CreateTarget
          selectedBoard={selectedBoard}
          onClose={() => setModalContent(null)}
          initialLat={contextMenuLocation.lat}
          initialLon={contextMenuLocation.lon}
        />
      )}
      {modalContent === 'addObservation' && selectedTarget && contextMenuLocation && (
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