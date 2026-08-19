/**
 * Runs even if React never hydrates (e.g. stale .next chunk 404s).
 * If the session loading screen is still present after a few seconds:
 * 1st time → hard reload
 * 2nd time → clear storage and go to /login
 */
export function BootRecoveryScript() {
  const script = `
(function () {
  var FLAG = "gra_boot_reload";
  var TIMEOUT_MS = 5000;
  setTimeout(function () {
    if (document.documentElement.getAttribute("data-gra-booted") === "1") return;
    if (!document.querySelector("[data-session-loading]")) return;
    try {
      if (sessionStorage.getItem(FLAG) === "1") {
        sessionStorage.removeItem(FLAG);
        try { localStorage.clear(); } catch (e) {}
        window.location.replace("/login");
        return;
      }
      sessionStorage.setItem(FLAG, "1");
    } catch (e) {}
    window.location.reload();
  }, TIMEOUT_MS);
})();
`;

  return (
    <script
      id="gra-boot-recovery"
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
