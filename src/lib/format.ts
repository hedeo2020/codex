export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila"
  }).format(new Date(value));
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila"
  }).format(new Date(value));
}

export function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila"
  }).format(new Date(value));
}

export function roleLabel(role: string) {
  return role.replaceAll("_", " ");
}
