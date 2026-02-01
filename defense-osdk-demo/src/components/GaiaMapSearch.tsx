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
import React, { useState, KeyboardEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Spinner } from "@blueprintjs/core";
import {
  searchGaiaMapsRequest,
  clearSearchResults,
} from "../store/features/gaia/gaiaSlice";
import {
  selectGaiaSearchResults,
  selectGaiaSearchLoading,
  selectGaiaSearchError,
} from "../store/features/gaia/gaiaSelectors";
import { GaiaMapMetadata } from "../store/features/gaia/gaiaSlice";

const GaiaMapSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const dispatch = useDispatch();

  // Get data from Redux store
  const searchResults = useSelector(selectGaiaSearchResults);
  const loading = useSelector(selectGaiaSearchLoading);
  const error = useSelector(selectGaiaSearchError);

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

  return (
    <div className="gaia-map-search">
      <h3>Search Gaia Maps</h3>

      <div className="search-container">
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter map name..."
          className="search-input"
          disabled={loading}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !searchQuery.trim()}
          className="search-button"
        >
          Search
        </button>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="loading-container">
          <Spinner size={20} />
          <p>Searching for maps...</p>
        </div>
      )}

      {/* Error message */}
      {error && !loading && (
        <div className="error-container">
          <p>Error: {error}</p>
        </div>
      )}

      {/* Search results */}
      {!loading && !error && searchResults.length > 0 && (
        <div className="results-container">
          <h4>Search Results:</h4>
          <div className="results-list">
            {searchResults.map((map: GaiaMapMetadata, index: number) => (
              <div key={map.mapRid || index} className="result-item">
                <h5>{map.name}</h5>
                {map.lastModified && (
                  <p>
                    Last Modified: {new Date(map.lastModified).toLocaleString()}
                  </p>
                )}
                <div className="result-metadata">
                  <span>RID: {map.mapRid}</span>
                  {map.numLayers !== undefined && (
                    <span>Layers: {map.numLayers}</span>
                  )}
                  {map.numElements !== undefined && (
                    <span>Elements: {map.numElements}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No results found */}
      {!loading &&
        !error &&
        searchResults.length === 0 &&
        searchQuery.trim() !== "" && (
          <div className="no-results">
            <p>No maps found matching your search criteria.</p>
          </div>
        )}
    </div>
  );
};

export default GaiaMapSearch;
