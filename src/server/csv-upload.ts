export class UploadError extends Error {}

export async function readCsvUpload(formData: FormData): Promise<string> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new UploadError("Choose a CSV file to import.");
  return file.text();
}
