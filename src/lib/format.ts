export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-SG", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function roleLabel(role: string) {
  return role.replaceAll("_", " ");
}
