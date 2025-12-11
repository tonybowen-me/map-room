import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const roomId = formData.get("roomId") as string;

  if (!file || !roomId) {
    return NextResponse.json({ error: "Missing file or roomId" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // FINAL correct folder
  const uploadDir = path.join(process.cwd(), "public", "uploads", roomId);

  fs.mkdirSync(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, file.name);
  fs.writeFileSync(filePath, buffer);

  return NextResponse.json({ success: true });
}
