// js/index-intro.js
(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("getStartedBtn");
    if (!btn) return;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      // Tiny visual feedback
      btn.classList.add("ring-4", "ring-primary/50");
      setTimeout(() => btn.classList.remove("ring-4", "ring-primary/50"), 200);

      // Navigate to Register
      window.location.href = "register.html";
    });
  });
})();
