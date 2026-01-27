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
import React, { useState, useEffect } from "react";
import L from "leaflet";

// Import CSS variables for marker color
import "../../_variables.scss";

/**
 * Gets the current marker color from CSS variables
 */
export const getMarkerColor = (): string => {
  return getComputedStyle(document.documentElement)
    .getPropertyValue("--marker-color")
    .trim();
};

/**
 * Creates a Leaflet DivIcon with the diamond SVG using the current theme color
 * Used by TargetMap for map markers
 *
 * NOTE: This is exported separately from the React component because Leaflet maps
 * require a special L.DivIcon object, not a React component
 */
export const createDiamondIcon = (): L.DivIcon => {
  const markerColor = getMarkerColor();

  return L.divIcon({
    html: getDiamondSvgString(markerColor),
    className: "diamond-marker",
    iconSize: [25, 25],
    iconAnchor: [12.5, 12.5],
  });
};

/**
 * Returns the diamond SVG as a string with the specified color
 * @param color - The color to use for the diamond SVG
 */
export const getDiamondSvgString = (color: string): string => {
  return `
    <svg 
      width="25" 
      height="25" 
      viewBox="0 0 16 16" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        fill="${color}" 
        fill-rule="evenodd" 
        clip-rule="evenodd" 
        d="M12,8.01c0-0.19-0.07-0.36-0.16-0.51l0.01-0.01l-3-5L8.84,2.5C8.67,2.21,8.36,2.01,8,2.01
        S7.33,2.21,7.16,2.5L7.14,2.49l-3,5L4.16,7.5C4.07,7.65,4,7.82,4,8.01s0.07,0.36,0.16,0.51L4.14,8.52l3,5
        l0.01-0.01C7.33,13.8,7.64,14.01,8,14.01s0.67-0.2,0.84-0.49l0.01,0.01l3-5l-0.01-0.01
        C11.93,8.36,12,8.2,12,8.01z"
      />
    </svg>
  `;
};

/**
 * A hook that provides a diamond SVG that updates with theme changes
 * Returns a string containing the SVG markup that can be used with dangerouslySetInnerHTML
 */
export const useDiamondSvg = (): string => {
  const [diamondSvg, setDiamondSvg] = useState<string>(
    getDiamondSvgString(getMarkerColor()),
  );

  // Update the SVG when theme changes
  useEffect(() => {
    const updateDiamondSvg = () => {
      setDiamondSvg(getDiamondSvgString(getMarkerColor()));
    };

    // Create a MutationObserver to watch for theme changes
    const observer = new MutationObserver(updateDiamondSvg);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    // Watch for media query changes too
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      // Use setTimeout to ensure CSS variables are updated first
      setTimeout(updateDiamondSvg, 100);
    };
    mediaQuery.addEventListener("change", handleChange);

    // Clean up
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return diamondSvg;
};

/**
 * A React component that renders a diamond icon using the current theme color
 * For use in regular React components (not Leaflet maps)
 *
 * Usage notes:
 * 1. In regular React components, use this component directly:
 *    <DiamondIcon width={25} height={25} />
 *
 * 2. In Leaflet maps, use the createDiamondIcon() function instead:
 *    const marker = L.marker([lat, lng], { icon: createDiamondIcon() });
 *
 * The two different patterns exist because Leaflet requires a specific L.DivIcon
 * instance for its markers, not a React component.
 */
const DiamondIcon: React.FC<{
  width?: number;
  height?: number;
}> = ({ width = 25, height = 25 }) => {
  const diamondSvg = useDiamondSvg();

  return (
    <div
      style={{ width, height, display: "inline-block" }}
      dangerouslySetInnerHTML={{ __html: diamondSvg }}
    />
  );
};

export default DiamondIcon;
