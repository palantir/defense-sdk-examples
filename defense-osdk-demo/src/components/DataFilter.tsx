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
import React, { useState, KeyboardEvent, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Spinner } from "@blueprintjs/core";
import {
  searchGaiaMapsRequest,
  clearSearchResults,
  selectMap,
  loadMapDataRequest,
  toggleLayerSelection,
  clearLayerSelections,
} from "../store/features/gaia/gaiaSlice";
import {
  selectGaiaSearchResults,
  selectGaiaSearchLoading,
  selectGaiaSearchError,
  selectSelectedMap,
  selectLoadedMapData,
  selectLoadedLayersData,
  selectSelectedLayerIds,
} from "../store/features/gaia/gaiaSelectors";
import {
  selectTargetBoards,
  selectTargetBoardsLoading,
  selectTargetBoardsError,
} from "../store/features/targeting/targetingSelectors";
import { GaiaMapMetadata } from "../store/features/gaia/gaiaSlice";

interface DataFilterProps {
  selectedBoardId: string;
  onBoardChange: (boardId: string) => void;
  selectedLayer: string;
  onLayerChange: (layer: string) => void;
}

const DataFilter: React.FC<DataFilterProps> = ({
  selectedBoardId,
  onBoardChange,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLayerDropdownOpen, setIsLayerDropdownOpen] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();

  // Target board selectors
  const targetBoards = useSelector(selectTargetBoards);
  const loadingBoards = useSelector(selectTargetBoardsLoading);
  const boardsError = useSelector(selectTargetBoardsError);

  // Gaia search selectors
  const searchResults = useSelector(selectGaiaSearchResults);
  const searchLoading = useSelector(selectGaiaSearchLoading);
  const searchError = useSelector(selectGaiaSearchError);

  // Gaia map and layers selectors
  const selectedMap = useSelector(selectSelectedMap);
  const loadedMapData = useSelector(selectLoadedMapData);
  const loadedLayersData = useSelector(selectLoadedLayersData);
  const selectedLayerIds = useSelector(selectSelectedLayerIds);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      dispatch(searchGaiaMapsRequest(searchQuery.trim()));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);

    // Clear results when input is cleared
    if (e.target.value.trim() === "") {
      dispatch(clearSearchResults());
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleBoardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onBoardChange(e.target.value);
  };

  const handleMapSelect = (map: GaiaMapMetadata) => {
    dispatch(selectMap(map));
    dispatch(loadMapDataRequest({ mapGid: map.mapGid }));
    dispatch(clearLayerSelections());
    setIsSearchDropdownOpen(false);
    dispatch(clearSearchResults());
  };

  const handleLayerToggle = (layerId: string) => {
    dispatch(toggleLayerSelection(layerId));
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsLayerDropdownOpen(false);
      }
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSearchDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Open search dropdown when search results arrive
  useEffect(() => {
    if (searchResults.length > 0 && !searchLoading) {
      setIsSearchDropdownOpen(true);
    }
  }, [searchResults, searchLoading]);

  const getSelectedLayersLabel = () => {
    if (selectedLayerIds.length === 0) {
      return "Select layers...";
    }
    if (selectedLayerIds.length === 1 && loadedMapData?.layers) {
      const layerId = selectedLayerIds[0];
      return loadedMapData.layers[layerId]?.label || layerId;
    }
    return `${selectedLayerIds.length} layers selected`;
  };

  return (
    <div className="data-filter-container">
      <div className="filter-row">
        {/* Target Board Selector */}
        <div className="filter-item target-board-selector">
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

        {/* Gaia Map Search */}
        <div className="filter-item gaia-search" ref={searchDropdownRef}>
          <label htmlFor="gaia-search">Gaia Map Search:</label>
          <div className="search-container">
            <input
              id="gaia-search"
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter map name..."
              className="search-input"
              disabled={searchLoading}
            />
            <button
              onClick={handleSearch}
              disabled={searchLoading || !searchQuery.trim()}
              className="search-button"
            >
              Search
            </button>
          </div>
          {/* Search results dropdown */}
          {isSearchDropdownOpen && searchResults.length > 0 && (
            <div className="search-dropdown-menu">
              {searchResults.map((map: GaiaMapMetadata, index: number) => (
                <div
                  key={map.mapGid || index}
                  className={`search-dropdown-item ${selectedMap?.mapGid === map.mapGid ? "selected" : ""}`}
                  onClick={() => handleMapSelect(map)}
                >
                  <div className="map-name">{map.name}</div>
                  <div className="map-metadata">
                    {map.numLayers !== undefined && (
                      <span>Layers: {map.numLayers}</span>
                    )}
                    {map.numElements !== undefined && (
                      <span> | Elements: {map.numElements}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Layer checkboxes dropdown - only show when layers are loaded */}
        {loadedLayersData && (
          <div className="filter-item layer-selector" ref={dropdownRef}>
            <label>Layers:</label>
            <div className="custom-dropdown">
              <button
                className="dropdown-button"
                onClick={() => setIsLayerDropdownOpen(!isLayerDropdownOpen)}
              >
                {getSelectedLayersLabel()}
                <span className="dropdown-arrow">▼</span>
              </button>
              {isLayerDropdownOpen && (
                <div className="dropdown-menu">
                  {Object.entries(loadedLayersData.layers).map(
                    ([layerId, layer]) => {
                      const layerMetadata = loadedMapData?.layers?.[layerId];
                      const elementCount = layer.elements?.length || 0;
                      return (
                        <label key={layerId} className="dropdown-item">
                          <input
                            type="checkbox"
                            checked={selectedLayerIds.includes(layerId)}
                            onChange={() => handleLayerToggle(layerId)}
                          />
                          <span className="layer-label">
                            {layerMetadata?.label || layerId}
                            <span className="layer-count">
                              ({elementCount} elements)
                            </span>
                          </span>
                        </label>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Gaia Search Loading indicator */}
      {searchLoading && (
        <div className="loading-container">
          <Spinner size={20} />
          <span>Searching for maps...</span>
        </div>
      )}

      {/* Gaia Search Error message */}
      {searchError && !searchLoading && (
        <div className="error-container">
          <p>Error: {searchError}</p>
        </div>
      )}

      {/* Selected Layers Display */}
      {selectedLayerIds.length > 0 && loadedMapData && (
        <div className="layer-info-container">
          <h4>Selected Layers:</h4>
          <div className="layer-details">
            <ul>
              {selectedLayerIds.map((layerId) => {
                const layerMetadata = loadedMapData.layers?.[layerId];
                return <li key={layerId}>{layerMetadata?.label || layerId}</li>;
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataFilter;
