// js/modules/users.js
import { loadData, saveData } from "../core/storage.js";

/**
 * Get the currently logged in user object from localStorage
 */
export function getCurrentUser() {
  const data = loadData();
  return data.users.find((u) => u.id === data.currentUser) || null;
}

/**
 * Update the currently logged-in user's profile fields
 * Accepts an object with only the fields you want to update
 * e.g. updateCurrentUser({height: 180, bloodgroup: "O+"})
 */
export function updateCurrentUser(updates) {
  const data = loadData();
  const idx = data.users.findIndex((u) => u.id === data.currentUser);
  if (idx === -1) return;

  // Merge existing user with new updates
  data.users[idx] = { ...data.users[idx], ...updates };

  // Save back to localStorage
  saveData(data);

  return data.users[idx]; // return the updated user
}

/* New: helpers (non-breaking) */

/**
 * Get all users (array)
 */
export function getAllUsers() {
  const data = loadData();
  return data.users || [];
}

/**
 * List players filtered by sport (optional).
 * If sport is provided, returns only players with that sport.
 */
export function listPlayersBySport(sport) {
  const users = getAllUsers();
  return users.filter(
    (u) => u.role === "Player" && (sport ? u.sport === sport : true)
  );
}

/**
 * Find a user by id
 */
export function findUserById(id) {
  const users = getAllUsers();
  return users.find((u) => u.id === id) || null;
}
