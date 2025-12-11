import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(req: Request, { params }: any) {
  const filePath = path.join(process.cwd(), "uploads", ...params.path);

  try {
    const data = await readFile(filePath);
    return new NextResponse(data);
  } catch (e) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
