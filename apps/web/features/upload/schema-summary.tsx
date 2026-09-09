import { ColumnTypeBadge } from "./column-type-badge";
import type { DatasetAnalysis } from "./contracts";

export function SchemaSummary({ columns }: { columns: DatasetAnalysis["column_metadata"] }) {
  return (
    <section className="mt-8" aria-labelledby="schema-title">
      <h2 id="schema-title" className="text-xl font-semibold">
        Detected schema
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Suggested types use every data row. Missing values are blank or whitespace-only cells;
        literal labels such as NA are preserved.
      </p>
      <div
        className="mt-5 overflow-x-auto rounded-lg border"
        role="region"
        aria-label="Detected column schema"
        tabIndex={0}
      >
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Detected types and data completeness for each column.
          </caption>
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Column
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Type
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Missing
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Unique
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Sample values
              </th>
            </tr>
          </thead>
          <tbody>
            {columns.map((column) => (
              <tr key={column.name} className="border-t">
                <th scope="row" className="max-w-56 break-words px-4 py-3 font-medium">
                  {column.name}
                </th>
                <td className="px-4 py-3">
                  <ColumnTypeBadge type={column.detected_type} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {column.missing_count.toLocaleString()} (
                  {column.missing_percentage.toLocaleString()}%)
                </td>
                <td className="px-4 py-3">{column.unique_count.toLocaleString()}</td>
                <td className="max-w-72 break-words px-4 py-3 text-muted-foreground">
                  {column.sample_values.length
                    ? column.sample_values.join(", ")
                    : "No non-empty values"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
