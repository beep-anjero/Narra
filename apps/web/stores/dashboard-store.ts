import { createStore } from "zustand/vanilla";
import type { FilterRequest } from "@/features/filters/contracts";

export type FilterDraft = {
  values: string[];
  minimum: string;
  maximum: string;
  start: string;
  end: string;
};
export const emptyDraft = (): FilterDraft => ({
  values: [],
  minimum: "",
  maximum: "",
  start: "",
  end: "",
});
type DashboardState = {
  selectedColumns: string[];
  draft: Record<string, FilterDraft>;
  activeFilters: FilterRequest["filters"];
  busy: boolean;
  error: string | null;
  addColumn: (column: string) => void;
  edit: (column: string, patch: Partial<FilterDraft>) => void;
  remove: (column: string) => void;
};
// One store per mounted dataset; no persisted tokens or cross-project state.
export function createDashboardStore() {
  return createStore<DashboardState>((set) => ({
    selectedColumns: [],
    draft: {},
    activeFilters: [],
    busy: false,
    error: null,
    addColumn: (column) =>
      set((state) => ({
        selectedColumns: state.selectedColumns.includes(column)
          ? state.selectedColumns
          : [...state.selectedColumns, column].slice(0, 20),
      })),
    edit: (column, patch) =>
      set((state) => ({
        draft: { ...state.draft, [column]: { ...(state.draft[column] ?? emptyDraft()), ...patch } },
      })),
    remove: (column) =>
      set((state) => ({
        selectedColumns: state.selectedColumns.filter((name) => name !== column),
      })),
  }));
}
