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
export const DOMAIN_INTERFACE_MAPPINGS = {
  "Targeting and Fires": [
    "attackGuidance",
    "attackGuidanceMatrix",
    "changeAssessment",
    "collateralConcernCandidate",
    "collateralConcernCandidateWithGeometry",
    "collateralConcernCandidatePoint",
    "collateralConcernList",
    "collateralDamageAssessment",
    "fireSupportCoordinationMeasure",
    "functionalAssessment",
    "highPayoffTargetList",
    "mil2525CSymbol",
    "munitionEffectivenessAssessment",
    "report",
    "reportObservation",
    "sourceSystemMetadata",
    "target",
    "targetAssessment",
    "targetEngagementAuthority",
    "targetPriority",
    "targetSelectionStandard",
    "targetSelectionStandardMatrix",
    "targetType",
    "targetingArea"
  ],
  "Protection": [
    "mil2525CSymbol",
    "report",
    "reportObservation",
    "sourceSystemMetadata"
  ],
  "Sustainment": [
    "equipmentType",
    "materielType",
    "mil2525CSymbol",
    "report",
    "reportObservation",
    "sourceSystemMetadata",
    "unit",
    "unitHierarchy",
    "unitHierarchyNodeRelationship",
    "unitHierarchyNodeRelationshipType",
    "unitType"
  ],
  "Mission Planning": [
    "mil2525CSymbol",
    "operation",
    "report",
    "reportObservation",
    "sourceSystemMetadata",
    "targetingOperation"
  ],
  "Order of Battle": [
    "ammunitionType",
    "defenseGeotemporalObservation",
    "defenseTrackedEntity",
    "equipmentType",
    "facility",
    "mil2525CSymbol",
    "report",
    "reportObservation",
    "sourceSystemMetadata",
    "unit",
    "unitHierarchy",
    "unitHierarchyNodeRelationship",
    "unitHierarchyNodeRelationshipType",
    "unitType"
  ],
  "Intelligence": [
    "comint",
    "elint",
    "geoint",
    "imint",
    "intelligence",
    "intelligenceProducer",
    "intelligenceReport",
    "intelligenceSubject",
    "mil2525CSymbol",
    "mti",
    "opir",
    "osint",
    "overheadImageDetection",
    "overheadSatelliteImage",
    "report",
    "reportObservation",
    "sigint",
    "sourceSystemMetadata"
  ]
} as const;

export type DomainInterfaceMappings = typeof DOMAIN_INTERFACE_MAPPINGS;
