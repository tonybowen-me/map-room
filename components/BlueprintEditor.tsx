"use client";

import { useState, useEffect, useRef } from "react";
import RoomModal from "./RoomModal";
import { loadRooms, saveRooms } from "@/lib/storage";
import { uuid } from "@/lib/uuid";

export default function BlueprintEditor() {
  const [img, setImg] = useState("/default-blueprint.png");
  const [rooms, setRooms] = useState<any[]>([]);
  const [drawingMode, setDrawingMode] = useState<"rect" | "poly" | null>(null);
  const [currentPoints, setCurrentPoints] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newRoomShape, setNewRoomShape] = useState<any>(null);

  // Load rooms + saved blueprint
  useEffect(() => {
    setRooms(loadRooms());

    const saved = localStorage.getItem("blueprintImage");
    if (saved) setImg(saved);
  }, []);

  const handleBlueprintUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const base64 = await toBase64(file);
    localStorage.setItem("blueprintImage", base64);
    setImg(base64);
  };

  const handleClick = (e: any) => {
    if (!drawingMode) return;

	const svg = e.currentTarget; // always the <svg>
	const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // POLYGON MODE
    if (drawingMode === "poly") {
      // If close to first point → close polygon
      if (currentPoints.length > 2) {
        const [fx, fy] = currentPoints[0];
        const dist = Math.hypot(fx - x, fy - y);

        if (dist < 25) {
          setNewRoomShape({ type: "polygon", points: [...currentPoints] });
          setModalOpen(true);
          setCurrentPoints([]);
          return;
        }
      }

      setCurrentPoints([...currentPoints, [x, y]]);
      return;
    }

    // RECT MODE
    if (drawingMode === "rect") {
      if (currentPoints.length === 1) {
        const [x1, y1] = currentPoints[0];

        const rectShape = {
          type: "rect",
          x: Math.min(x1, x),
          y: Math.min(y1, y),
          width: Math.abs(x - x1),
          height: Math.abs(y - y1),
        };

        setNewRoomShape(rectShape);
        setModalOpen(true);
        setCurrentPoints([]);
      } else {
        setCurrentPoints([[x, y]]);
      }
    }
  };

  const saveRoom = (meta: any) => {
    const roomId = uuid();

    const newRoom = {
      id: roomId,
      shape: newRoomShape,
      ...meta,
    };

    const updated = [...rooms, newRoom];
    setRooms(updated);
    saveRooms(updated);

    setModalOpen(false);
    setNewRoomShape(null);
  };
const clearAllRooms = () => {
  if (!confirm("Are you sure you want to delete ALL rooms and shapes?")) {
    return;
  }

  // Clear localStorage
  localStorage.removeItem("rooms");
  localStorage.removeItem("documents");

  // Reset component state
  setRooms([]);
  
  alert("All rooms have been cleared.");
};
  return (
    <div className="relative w-full">
      {/* TOOLBAR */}
      <div className="flex gap-4 mb-4">
	  <button
		onClick={clearAllRooms}
		className="p-2 bg-red-600 text-white rounded"
		>
		Clear All Rooms
		</button>

        <button
          onClick={() => setDrawingMode("rect")}
          className="p-2 bg-blue-600 text-white rounded"
        >
          Rectangle
        </button>

        <button
          onClick={() => setDrawingMode("poly")}
          className="p-2 bg-green-600 text-white rounded"
        >
          Polygon
        </button>

        <button
          onClick={() => setDrawingMode(null)}
          className="p-2 bg-gray-600 text-white rounded"
        >
          Stop
        </button>

        <input
          type="file"
          accept="image/*"
          onChange={handleBlueprintUpload}
          className="p-2 bg-white text-black rounded"
        />
      </div>

      {/* BLUEPRINT */}
      <div className="relative inline-block">
        <img src={img} alt="Blueprint" className="max-w-full" />

        <svg
          onClick={handleClick}
          className="absolute top-0 left-0 pointer-events-auto"
          style={{ width: "100%", height: "100%" }}
        >
          {/* SAVED ROOMS */}
          {rooms.map((r: any) =>
            r.shape.type === "polygon" ? (
              <polygon
                key={r.id}
                points={r.shape.points.map((p: any) => p.join(",")).join(" ")}
                fill="rgba(255,0,0,0.2)"
                stroke="red"
                strokeWidth="2"
                onClick={() => (window.location.href = `/rooms/${r.id}`)}
                style={{ cursor: "pointer" }}
              />
            ) : (
              <rect
                key={r.id}
                x={r.shape.x}
                y={r.shape.y}
                width={r.shape.width}
                height={r.shape.height}
                fill="rgba(255,0,0,0.2)"
                stroke="red"
                strokeWidth="2"
                onClick={() => (window.location.href = `/rooms/${r.id}`)}
                style={{ cursor: "pointer" }}
              />
            )
          )}

          {/* IN-PROGRESS POLYGON */}
          {currentPoints.length > 1 && (
            <polyline
              points={currentPoints.map((p: any) => p.join(",")).join(" ")}
              fill="none"
              stroke="blue"
              strokeWidth="2"
            />
          )}
        </svg>
      </div>

      {modalOpen && (
        <RoomModal
          onSave={saveRoom}
          onCancel={() => setModalOpen(false)}
        />
      )}
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
