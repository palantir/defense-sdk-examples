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
import { Intent, Position, Toaster } from '@blueprintjs/core';
import { Feature, FeatureCollection } from 'geojson';
import L from 'leaflet';
import 'leaflet-contextmenu';
import 'leaflet/dist/leaflet.css';
import ms from 'milsymbol';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectLayerId, selectLoadLayerResponse, selectMapId } from '../features/mapApiGateway/mapApiGateway.selectors';
import { LayerElement, loadLayer, setMapId } from '../features/mapApiGateway/mapApiGateway.slice';

interface LayerMapProps {}

const useLoadLayerIfValid = () => {
  const dispatch = useDispatch();
  const layerId = useSelector(selectLayerId);  
  const loadLayerIfValid = () => {
    if (layerId !== null) {
      dispatch(loadLayer());
    }
  };

  return loadLayerIfValid;
};

const getMil2525Icon = (sidc: string | null) => {
  if (!sidc) {
    return L.divIcon({
      className: 'bullseye-icon',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  }

  const symbol = new ms.Symbol(sidc, {
    size: 40,
    fill: true,
  });

  const iconUrl = `data:image/svg+xml;base64,${btoa(symbol.asSVG())}`;

  return L.icon({
    iconUrl: iconUrl,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

const AppToaster = Toaster.create({
  position: Position.TOP,
});

const LayerMap: React.FC<LayerMapProps> = () => {
  const dispatch = useDispatch();
  const mapId = useSelector(selectMapId);
  const loadLayerResponse = useSelector(selectLoadLayerResponse);

  const [map, setMap] = useState<L.Map | null>(null);
  const [cursorLocation, setCursorLocation] = useState<{ lat: number; lon: number }>({ lat: 38.945072, lon: -77.060589 });
  const [zoomLevel, setZoomLevel] = useState<number>(10);
  const [inputMapId, setInputMapId] = useState<string>(mapId || '');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const mapRef = useRef<HTMLDivElement>(null);

  const loadLayerIfValid = useLoadLayerIfValid();

  useEffect(() => {
    if (mapRef.current && !map) {
      const initializedMap = L.map(mapRef.current, {
        center: [cursorLocation.lat, cursorLocation.lon],
        zoom: zoomLevel,
        contextmenu: false,
        contextmenuItems: [],
      }).setView([cursorLocation.lat, cursorLocation.lon], zoomLevel);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMapId(e.target.value);
  };

  const handleInputBlur = () => {
    dispatch(setMapId(inputMapId));
  };

  const handleDrop = (event: React.DragEvent<HTMLInputElement>) => {
    event.preventDefault();
    setIsDragOver(false); 
    const dataString = event.dataTransfer.getData('application/x-vnd.palantir.rid.gotham-artifact.artifact');

    try {
      const data = JSON.parse(dataString);

      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
        const mapId = data[0];
        setInputMapId(mapId);
        dispatch(setMapId(mapId));
        loadLayerIfValid();
      } else {
        AppToaster.show({
          message: "Invalid drag payload. Payload must contain 'application/x-vnd.palantir.rid.gotham-artifact.artifact'. Drag a Gaia map from the title.",
          intent: Intent.DANGER,
        });
      }
    } catch (error) {
      AppToaster.show({
        message: "Invalid drag payload. Payload must contain 'application/x-vnd.palantir.rid.gotham-artifact.artifact'. Drag a Gaia map from the title.",
        intent: Intent.DANGER,
      });
      console.error('Failed to parse drag data:', error);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLInputElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  useEffect(() => {
    if (map && loadLayerResponse && loadLayerResponse.layers) {
      const features: Feature[] = [];
      const layers = loadLayerResponse.layers;

      Object.values(layers).forEach((layer: any) => {
        if (layer?.elements) {
          layer.elements.forEach((element: LayerElement) => {
            element.features.forEach((feature) => {
              const icon = feature.style?.symbol?.symbol?.sidc
                ? getMil2525Icon(feature.style.symbol.symbol.sidc)
                : getMil2525Icon(null);

              features.push({
                type: 'Feature',
                geometry: feature.geometry,
                properties: {
                  ...feature.style,
                  id: element.id,
                  label: element.label,
                  icon,
                },
              });
            });
          });
        }
      });

      const geoJsonData: FeatureCollection = {
        type: 'FeatureCollection',
        features,
      };

      const geoJsonLayer = L.geoJSON(geoJsonData, {
        pointToLayer: (feature, latlng) => {
          const { icon, label } = feature.properties as { icon: L.Icon<L.IconOptions> | L.DivIcon; label: string };
          const marker = L.marker(latlng, { icon } as L.MarkerOptions);
          marker.bindTooltip(label, { permanent: false, direction: 'top' });
          return marker;
        },
        style: (feature) => {
          const { stroke, fill } = feature?.properties;
          return {
            color: stroke ? stroke.color : '#3388ff',
            weight: stroke ? stroke.width : 3,
            opacity: stroke ? stroke.opacity : 1,
            fillColor: fill ? fill.color : null,
            fillOpacity: fill ? fill.opacity : 0.2,
          };
        },
      });

      geoJsonLayer.addTo(map);
    }
  }, [map, loadLayerResponse]);

  return (
    <div className="map-container" style={{ marginTop: '20px' }}>
      <div className="gaia-map-selector-container">
        <div className="gaia-map-selector">
          <label htmlFor="gaia-map">Gaia Map ID:</label>
          <input
            type="text"
            id="gaia-map"
            value={inputMapId}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={isDragOver ? 'drag-over' : ''}
            placeholder="Drag the title of a Gaia map!"
          />
        </div>
      </div>
      <div ref={mapRef} className="leaflet-map"></div>
      <div className="map-info">
        [{cursorLocation.lat.toFixed(4)}, {cursorLocation.lon.toFixed(4)}], zoom: {zoomLevel}
      </div>
    </div>
  );
};

export default LayerMap;