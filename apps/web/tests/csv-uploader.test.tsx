import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const upload = vi.hoisted(() => vi.fn());
const inspect = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/datasets", () => ({ uploadDataset: upload, inspectDataset: inspect }));
import { CsvUploader } from "@/features/upload/csv-uploader";
const analysis = {
  preview: {
    filename: "data.csv",
    file_size: 20,
    row_count: 1,
    column_count: 2,
    columns: ["ID", "Name"],
    rows: [["0012", "Alice"]],
    preview_limit: 100,
    truncated: false,
  },
  column_metadata: [
    {
      name: "ID",
      detected_type: "numeric",
      missing_count: 0,
      missing_percentage: 0,
      unique_count: 1,
      sample_values: ["0012"],
    },
    {
      name: "Name",
      detected_type: "text",
      missing_count: 0,
      missing_percentage: 0,
      unique_count: 1,
      sample_values: ["Alice"],
    },
  ],
};
const preparedUpload = {
  id: "dataset-id",
  path: "owner/project/dataset-id.csv",
  token: "signed-token",
  filename: "data.csv",
  size: 20,
};
beforeEach(() => {
  upload.mockReset();
  inspect.mockReset();
  inspect.mockResolvedValue({ preview: analysis.preview, upload: preparedUpload });
});
it("rejects unsupported files before upload", async () => {
  const user = userEvent.setup({ applyAccept: false });
  render(<CsvUploader projectId="p" maxBytes={100} view="data" />);
  await user.upload(screen.getByLabelText("Or choose a CSV file"), new File(["bad"], "data.xlsx"));
  expect(screen.getByRole("alert")).toHaveTextContent("Only .csv");
  expect(upload).not.toHaveBeenCalled();
});
it("uploads and displays the real returned preview and detected schema", async () => {
  const user = userEvent.setup();
  upload.mockResolvedValue(analysis);
  render(<CsvUploader projectId="p" maxBytes={100} view="data" />);
  await user.upload(
    screen.getByLabelText("Or choose a CSV file"),
    new File(["ID,Name\n0012,Alice"], "data.csv", { type: "text/csv" }),
  );
  await user.click(screen.getByRole("button", { name: "Inspect CSV" }));
  expect(await screen.findByText("Check before saving")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Analyze and save" }));
  expect(await screen.findByRole("table", { name: /Preview of data.csv/ })).toHaveTextContent(
    "0012",
  );
  expect(screen.getByRole("region", { name: "Detected column schema" })).toHaveTextContent(
    "Numeric",
  );
  expect(screen.getByText(/Saved privately to your project/)).toBeInTheDocument();
});
it("shows validation failures and permits a retry", async () => {
  const user = userEvent.setup();
  inspect.mockRejectedValue(new Error("This CSV contains duplicate column names."));
  render(<CsvUploader projectId="p" maxBytes={100} />);
  await user.upload(
    screen.getByLabelText("Or choose a CSV file"),
    new File(["A,A\n1,2"], "data.csv"),
  );
  await user.click(screen.getByRole("button", { name: "Inspect CSV" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("duplicate");
  expect(screen.getByRole("button", { name: "Inspect CSV" })).toBeEnabled();
});
it("rejects multiple dropped files", () => {
  render(<CsvUploader projectId="p" maxBytes={100} />);
  fireEvent.drop(screen.getByText("Drag and drop your CSV here"), {
    dataTransfer: { files: [new File(["a"], "a.csv"), new File(["b"], "b.csv")] },
  });
  expect(screen.getByRole("alert")).toHaveTextContent("one CSV");
});
it("disables resubmission and shows actual upload progress", async () => {
  const user = userEvent.setup();
  let finish: (value: typeof analysis) => void = () => {};
  upload.mockImplementation((_id, _file, progress) => {
    progress(45);
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  render(<CsvUploader projectId="p" maxBytes={100} />);
  await user.upload(screen.getByLabelText("Or choose a CSV file"), new File(["A\n1"], "data.csv"));
  await user.click(screen.getByRole("button", { name: "Inspect CSV" }));
  await user.click(screen.getByRole("button", { name: "Analyze and save" }));
  expect(screen.getByRole("button", { name: "Processing…" })).toBeDisabled();
  expect(screen.getByRole("progressbar")).toHaveAttribute("value", "45");
  await act(async () => finish(analysis));
});
