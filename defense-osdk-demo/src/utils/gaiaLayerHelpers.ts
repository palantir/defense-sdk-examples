import { LayersResponse } from "../types/geojson";
import { FETCH_GAIA_LAYERS } from "../store/features/gaia/gaiaSagas";

/**
 * Example action creator to load layers into the store
 * Call this when you receive layer data from an API
 */
export function loadGaiaLayers(layersResponse: LayersResponse) {
  return {
    type: FETCH_GAIA_LAYERS,
    payload: layersResponse,
  };
}

/**
 * Example layer data for testing
 */
export const exampleLayersResponse: LayersResponse = {
  layers: {
    "3uuyBHwRjNbpHAFAu": {
      id: "3uuyBHwRjNbpHAFAu",
      elements: [
        {
          id: "3Sk2rHMdj1gddCTpk",
          parentId: "3uuyBHwRjNbpHAFAu",
          features: [
            {
              geometry: {
                type: "LineString",
                coordinates: [
                  [-123.94474114979477, 38.12322888977234],
                  [-122.54491611379962, 38.12322888977234],
                ],
              },
              style: {
                label: {
                  text: "HACHI AOI\n",
                  textColor: "#111418",
                },
              },
            },
          ],
          label: "HACHI AOI",
          displayFields: [],
        },
        {
          id: "2trsAQhX1MmQF6SXZ",
          parentId: "3uuyBHwRjNbpHAFAu",
          features: [
            {
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [-123.63477989182454, 39.16187238312909],
                    [-123.99473490108026, 38.59365339080542],
                    [-122.50492111277177, 38.437184937938056],
                    [-122.67489986714232, 39.02218577790585],
                    [-123.63477989182454, 39.16187238312909],
                  ],
                ],
              },
              style: {
                fill: {
                  opacity: 0.5,
                  color: "rgba(0,0,0,0)",
                },
                stroke: {
                  width: 3,
                  opacity: 1.0,
                  color: "#2D72D2",
                },
                label: {
                  textColor: "#FFFFFF",
                },
              },
            },
          ],
          label: "Polygon",
          displayFields: [],
        },
        {
          id: "5PerWDQR7cT2Rwe6d",
          parentId: "3uuyBHwRjNbpHAFAu",
          features: [
            {
              geometry: {
                type: "Point",
                coordinates: [-121.92499359785981, 37.395882835754115],
              },
              style: {
                stroke: {
                  color: "#30404D",
                },
              },
            },
          ],
          label: "Placemark",
          displayFields: [],
        },
      ],
    },
    "5jR5cGUnErtEixgUR": {
      id: "5jR5cGUnErtEixgUR",
      elements: [],
    },
    nERXksUiSHWxQqTtrf: {
      id: "nERXksUiSHWxQqTtrf",
      elements: [],
    },
  },
};
