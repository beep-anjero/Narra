import type { DatasetPreview } from "./contracts";

export function PreviewTable({ preview }: { preview: DatasetPreview }) {
  const rows = preview.rows.slice(0, 10);
  return (
    <section className="mt-8" aria-labelledby="preview-title">
      <h2 id="preview-title" className="text-xl font-semibold">
        Dataset preview
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Validated {preview.row_count.toLocaleString()} data rows and {preview.column_count} columns.
        Showing the first {rows.length} rows.
      </p>
      <div
        className="mt-5 overflow-x-auto rounded-lg border focus-visible:outline-2 focus-visible:outline-ring"
        role="region"
        aria-label="CSV preview table"
        tabIndex={0}
      >
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Preview of {preview.filename}. Empty cells are labeled Empty.
          </caption>
          <thead className="bg-muted">
            <tr>
              {preview.columns.map((name, index) => (
                <th
                  key={index}
                  scope="col"
                  className="max-w-64 min-w-32 break-words px-4 py-3 font-medium"
                >
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t">
                {row.map((value, column) => (
                  <td key={column} className="max-w-64 break-words px-4 py-3">
                    {value === "" ? (
                      <span className="text-muted-foreground italic">Empty</span>
                    ) : (
                      value
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Original values are shown as text. Blank or whitespace-only cells count as missing in the
        schema summary. This preview is temporary and clears when you leave or reload the page.
      </p>
    </section>
  );
}
