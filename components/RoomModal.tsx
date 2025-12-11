"use client";

import { useState } from "react";

export default function RoomModal({ onSave, onCancel }) {
  const [roomNumber, setRoomNumber] = useState("");
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-96 text-black">
        <h2 className="text-xl font-bold mb-4">Room Details</h2>

        <input
          className="border p-2 w-full mb-2 rounded"
          placeholder="Room Number"
          value={roomNumber}
          onChange={(e) => setRoomNumber(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-2 rounded"
          placeholder="Room Name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />

        <textarea
          className="border p-2 w-full mb-4 rounded"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="p-2 bg-gray-300 rounded">
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                roomNumber,
                roomName,
                description,
              })
            }
            className="p-2 bg-blue-600 text-white rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
