"use client";

import { useState, useEffect, use } from "react";
import { loadRooms, loadDocuments, saveDocuments } from "@/lib/storage";

export default function RoomPage(props) {
  // Unwrap the params promise
  const { roomId } = use(props.params);

  const [room, setRoom] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);

  useEffect(() => {
    const allRooms = loadRooms();
    const found = allRooms.find((r: any) => r.id === roomId);
    setRoom(found);

    const allDocs = loadDocuments();
    setDocs(allDocs[roomId] || []);
  }, [roomId]);

const uploadDoc = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("roomId", roomId);
  formData.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData
  });

  const json = await res.json();
  if (!json.success) {
    alert("Upload failed");
    return;
  }

  // Refresh document list
  setDocs(prev => [...prev, { name: file.name, url: json.path }]);
};

  if (!room)
    return <div className="p-8 text-white">Room not found</div>;

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-2">
        {room.roomNumber}: {room.roomName}
      </h1>

      <p className="mb-4">{room.description}</p>

      <h2 className="text-xl font-semibold mb-2">Documents</h2>

      <input
        type="file"
        onChange={uploadDoc}
        className="mb-4"
      />

      <ul>
<ul>
  {docs.map((d, i) => (
    <li key={i} className="mb-2 underline text-blue-400">
      <a href={d.url} download>{d.name}</a>
    </li>
  ))}
</ul>

      </ul>
    </div>
  );
}

function toBase64(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
