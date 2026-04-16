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

export type AsyncLoaded<V> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; value: V }
  | { status: "error"; error: Error };

export const IDLE: AsyncLoaded<never> = { status: "idle" };
export const LOADING: AsyncLoaded<never> = { status: "loading" };

export function loaded<V>(value: V): AsyncLoaded<V> {
  return { status: "loaded", value };
}

export function failed(error: unknown): AsyncLoaded<never> {
  return { status: "error", error: error instanceof Error ? error : new Error(String(error)) };
}

export function isIdle<V>(state: AsyncLoaded<V>): state is { status: "idle" } {
  return state.status === "idle";
}

export function isLoading<V>(state: AsyncLoaded<V>): state is { status: "loading" } {
  return state.status === "loading";
}

export function isLoaded<V>(state: AsyncLoaded<V>): state is { status: "loaded"; value: V } {
  return state.status === "loaded";
}

export function isError<V>(state: AsyncLoaded<V>): state is { status: "error"; error: Error } {
  return state.status === "error";
}
