export function loadRooms() {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem("rooms") || "[]");
}

export function saveRooms(rooms: any[]) {
  localStorage.setItem("rooms", JSON.stringify(rooms));
}

export function loadDocuments() {
  if (typeof window === "undefined") return {};
  return JSON.parse(localStorage.getItem("documents") || "{}");
}

export function saveDocuments(docs: any) {
  localStorage.setItem("documents", JSON.stringify(docs));
}
