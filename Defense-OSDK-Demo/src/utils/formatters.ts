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

export function formatPosition(position: GeoJSON.Point | undefined, fallback: string): string {
  if (position == null || position.coordinates.length < 2) {
    return fallback;
  }
  const [lng, lat] = position.coordinates;
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function formatTimestamp(timestamp: string | undefined, fallback: string): string {
  if (timestamp == null) {
    return fallback;
  }
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
}

export function formatDimensions(semiMajor: number | undefined, semiMinor: number | undefined, fallback: string): string {
  if (semiMajor === undefined || semiMinor === undefined) {
    return fallback;
  }
  return `${semiMajor.toFixed(0)}m × ${semiMinor.toFixed(0)}m`;
}
