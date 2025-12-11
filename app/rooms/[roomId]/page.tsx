"use client";

import { use, useEffect, useState } from "react";

export default function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  // unwrap next.js params (they are a Promise in client components)
  const { roomId } = use(params);

  const [room, setRoom] = useState<any>(null);
  const [docs, setDocs] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  //
  // LOAD ROOM DETAILS
  //
  useEffect(() => {
    const rooms = JSON.parse(localStorage.getItem("rooms") || "[]");
    const found = rooms.find((r: any) => r.id === roomId) || null;
    setRoom(found);
  }, [roomId]);

  //
  // LOAD DOCUMENT LIST
  //
  useEffect(() => {
    const fetchDocs = async () => {
      const res = await fetch(`/api/list-docs/${roomId}`);
      let data = [];
      try {
        data = await res.json();
      } catch {}
      setDocs(data);
    };

    fetchDocs();
  }, [roomId]);

  //
  // UPLOAD DOCUMENT
  //
  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("roomId", roomId);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      setFile(null);
      setUploading(false);

      // refresh doc listing
      const docsRes = await fetch(`/api/list-docs/${roomId}`);
      const docsJson = await docsRes.json();
      setDocs(docsJson);
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      setUploading(false);
    }
  };

  //
  // UI
  //
  if (!room) return <div>Room not found</div>;

  return (
    <div style={{ padding: 20, color: "white" }}>
      <h1>{room.roomName}</h1>

      <p>
        <strong>Room Number:</strong> {room.roomNumber}
      </p>

      <p>
        <strong>Description:</strong> {room.description}
      </p>

      <hr style={{ margin: "20px 0" }} />

      <h2>Upload Document</h2>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button
        onClick={handleUpload}
        disabled={uploading || !file}
        style={{
          marginLeft: 10,
          padding: "6px 12px",
          background: "dodgerblue",
          border: "none",
          cursor: "pointer",
        }}
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>

      <hr style={{ margin: "20px 0" }} />

<h3>Documents</h3>

{docs.length === 0 && <p>No documents uploaded yet.</p>}

<ul>
  {docs.map((doc, index) => (
    <li key={index}>
      <a 
        href={doc.url} 
        target="_blank" 
        rel="noopener noreferrer"
        style={{ color: "#4af", textDecoration: "underline" }}
      >
        {doc.fileName}
      </a>
    </li>
  ))}
</ul>

    </div>
  );
}
