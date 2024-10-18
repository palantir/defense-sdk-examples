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
import { Icon, Intent, Position, Toaster } from '@blueprintjs/core';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectLayerId, selectLoadLayerError, selectLoadLayerResponse, selectMapId } from '../features/mapApiGateway/mapApiGateway.selectors';
import { LayerElement, loadLayer, setLayerId } from '../features/mapApiGateway/mapApiGateway.slice';

interface LayerViewProps {}

const useLoadLayerIfValid = () => {
  const dispatch = useDispatch();
  const mapId = useSelector(selectMapId);
  const loadLayerIfValid = () => {
    if (mapId !== null) {
      dispatch(loadLayer());
    }
  };

  return loadLayerIfValid;
};

const AppToaster = Toaster.create({
  className: 'recipe-toaster',
  position: Position.TOP,
});

const LayerView: React.FC<LayerViewProps> = () => {
  const dispatch = useDispatch();
  const layerId = useSelector(selectLayerId);
  const loadLayerResponse = useSelector(selectLoadLayerResponse);
  const loadLayerError = useSelector(selectLoadLayerError);
  const [inputLayerId, setInputLayerId] = useState<string>(layerId || '');
  const [layerElements, setLayerElements] = useState<LayerElement[]>([]);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const loadLayerIfValid = useLoadLayerIfValid();

  useEffect(() => {
    setInputLayerId(layerId || '');
  }, [layerId]);

  useEffect(() => {
    if (loadLayerResponse && loadLayerResponse.layers) {
      const layers = loadLayerResponse.layers;
      const elements: LayerElement[] = Object.values(layers).flatMap((layer: any) => layer.elements);
      setLayerElements(elements);
    }
  }, [loadLayerResponse]);

  const handleDrop = (event: React.DragEvent<HTMLInputElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const dataString = event.dataTransfer.getData('gaia-app/layers-list');

    try {
      const data = JSON.parse(dataString);

      if (data.type === 'layers' && data.id) {
        setInputLayerId(data.id);
        dispatch(setLayerId(data.id));
        loadLayerIfValid();
      } else {
        AppToaster.show({
          message: "Invalid drag payload. Payload must contain 'gaia-app/layers-list'. Drag a Gaia map from the title.",
          intent: Intent.DANGER,
        });
      }
    } catch (error) {
      AppToaster.show({
        message: "Invalid drag payload. Payload must contain 'gaia-app/layers-list'. Drag a Gaia map from the title.",
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputLayerId(e.target.value);
  };

  const handleInputBlur = () => {
    dispatch(setLayerId(inputLayerId));
    loadLayerIfValid();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      dispatch(setLayerId(inputLayerId));
      loadLayerIfValid();
    }
  };

  const getIconForGeometryType = (type: string) => {
    switch (type) {
      case 'Point':
        return 'map-marker';
      case 'LineString':
        return 'minus';
      case 'Polygon':
        return 'polygon-filter';
      default:
        return 'layer-outline';
    }
  };

  const renderLayerElements = (elements: LayerElement[]) => {
    return elements.map((element) => (
      <div key={element.id} className="layer-element">
        <h3 className="layer-element-label">{element.label}</h3>
        <ul className="features-list">
          {element.features.map((feature, index) => (
            <li key={index} className="feature-item">
              <div>
                {feature.style?.symbol?.symbol.sidc && (
                  <span>
                    {`${feature.style.symbol.symbol.sidc}`}
                  </span>
                )}
              </div>
              <div>
                <Icon icon={getIconForGeometryType(feature.geometry.type)} />
                <span>
                  {feature.geometry.type}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    ));
  };

  return (
    <div className="layer-view-container" style={{ marginTop: '20px' }}>
      <div className="gaia-map-selector-container">
        <div className="gaia-map-selector">
          <label htmlFor="layer-input">Layer ID:</label>
          <input
            type="text"
            id="layer-input"
            value={inputLayerId}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyPress={handleKeyPress}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={isDragOver ? 'drag-over' : ''}
            placeholder="Drag a layer from the map!"
          />
        </div>
      </div>
      <div className="layer-info">
        {layerElements.length > 0 && renderLayerElements(layerElements)}
        {loadLayerError && <p>Error: {loadLayerError.message}</p>}
      </div>
    </div>
  );
};

export default LayerView;