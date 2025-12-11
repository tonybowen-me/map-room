import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  const formData = await req.formData();

  const roomId = formData.get("roomId") as string;
  const file = formData.get("file") as File;

  if (!roomId || !file) {
    return NextResponse.json({ error: "Missing roomId or file" }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), "uploads", roomId);

  await mkdir(uploadsDir, { recursive: true });

  // Read file into buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const filePath = path.join(uploadsDir, file.name);

  await writeFile(filePath, buffer);

  return NextResponse.json({ success: true, path: `/uploads/${roomId}/${file.name}` });
}
