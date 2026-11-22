import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import {
  UPLOAD_DIR,
  getUploadContentType,
  resolveSafeUploadPath,
} from "@/lib/uploads";

/**
 * Serve a validated file from `UPLOAD_DIR`.
 *
 * Names that fail the shared basename rules return `400`; valid names whose
 * file is absent return `404`. Responses are marked `nosniff` and cached
 * immutably because stored filenames include a random UUID.
 */

type RouteParams = { params: Promise<{ filename: string }> };

const TEXT_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
} as const;

function textResponse(body: string, status: 400 | 404): Response {
  return new Response(body, { status, headers: TEXT_HEADERS });
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { filename } = await params;
  const filePath = resolveSafeUploadPath(filename);

  if (!filePath) {
    return textResponse("Invalid filename.", 400);
  }

  // Derive the type from the resolved path so percent-encoded names match.
  const contentType = getUploadContentType(filePath);

  if (!contentType) {
    return textResponse("Unsupported file type.", 400);
  }

  let fileStats: Awaited<ReturnType<typeof stat>>;

  try {
    fileStats = await stat(filePath);
  } catch {
    return textResponse("Not found.", 404);
  }

  // Directories and special files are not uploads.
  if (!fileStats.isFile()) {
    return textResponse("Not found.", 404);
  }

  // A symlink inside `UPLOAD_DIR` must not expose a file elsewhere on disk.
  try {
    const [realRoot, realFile] = await Promise.all([
      realpath(path.resolve(UPLOAD_DIR)),
      realpath(filePath),
    ]);

    if (!realFile.startsWith(realRoot + path.sep)) {
      return textResponse("Not found.", 404);
    }
  } catch {
    return textResponse("Not found.", 404);
  }

  let bytes: Uint8Array<ArrayBuffer>;

  try {
    bytes = new Uint8Array(await readFile(filePath));
  } catch {
    return textResponse("Not found.", 404);
  }

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.byteLength),
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
