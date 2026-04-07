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

// Ontology link type identifiers
export const OntologyLinkTypes = {
  LINKED_INTELLIGENCE: "com.palantir.ontology.defense-types.linkedIntelligence",
  TRACKED_ENTITY: "com.palantir.core.ontology.types.trackedEntity",
  HIERARCHY_PARENT_ID: "com.palantir.core.ontology.types.hierarchyNodeRelationshipParentId",
  HIERARCHY_CHILD_ID: "com.palantir.core.ontology.types.hierarchyNodeRelationshipChildId",
} as const;

// Ontology action parameter identifiers
export const OntologyActionParams = {
  INTELLIGENCE_SUBJECT: "com.palantir.ontology.defense-types.intelligenceSubject",
  INTELLIGENCE: "com.palantir.ontology.defense-types.intelligence",
} as const;

// Unit affiliation values
export const Affiliations = {
  HOSTILE: "hostile",
  FRIEND: "friend",
} as const;

// CSS custom property names used to read theme colors from computed styles
export const CssVariables = {
  MAP_TILE_URL: "--map-tile-url",
  COLLATERAL_CONCERN_COLOR: "--collateral-concern-color",
  ELINT_COLOR: "--elint-color",
  UNIT_FRIEND_COLOR: "--unit-friend-color",
  UNIT_HOSTILE_COLOR: "--unit-hostile-color",
  UNIT_OTHER_COLOR: "--unit-other-color",
} as const;

// Theme persistence
export const THEME_STORAGE_KEY = "app-theme";
export const THEME_DATA_ATTRIBUTE = "data-theme";
