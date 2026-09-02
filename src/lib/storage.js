import { LIBRARY_KEY, STORAGE_KEY } from "../constants";
import { blankCalendar, withRowIds } from "./calendar";

export function loadCalendar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return withRowIds(raw ? JSON.parse(raw) : blankCalendar());
  } catch {
    return withRowIds(blankCalendar());
  }
}

export function saveCalendar(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearCalendarStorage() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LIBRARY_KEY);
}
