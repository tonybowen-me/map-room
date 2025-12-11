import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET(_req: Request, context: any) {
  const { roomId } = await context.params;

  try {
    const dir = path.join(process.cwd(), "public", "uploads", roomId);

    if (!fs.existsSync(dir)) {
      return NextResponse.json([]);
    }

    const files = fs.readdirSync(dir);

    const docs = files.map(file => ({
      url: `/uploads/${roomId}/${file}`,
      fileName: file,
    }));

    return NextResponse.json(docs);
  } catch (err) {
    console.error("LIST DOCS ERROR:", err);
    return NextResponse.json([]);
  }
}
