// Small API client for backend auth/onboarding/profile.
// All requests send/receive JSON and include the httpOnly cookie automatically.

const API = {
  // Auth
  register: (body) => req("/api/auth/register", "POST", body),
  login: (body) => req("/api/auth/login", "POST", body),
  logout: () => req("/api/auth/logout", "POST"),

  // Me
  me: () => req("/api/me", "GET"),
  updateMe: (body) => req("/api/me", "PATCH", body),
};

export default API;

// -------------- internals --------------

async function req(url, method = "GET", body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin", // send/receive cookie "sid"
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const data = await safeJson(res);

  if (!res.ok) {
    const msg = data?.error || res.statusText || "Request failed";
    throw new Error(msg);
  }
  return data;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
