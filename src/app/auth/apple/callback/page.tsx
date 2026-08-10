// Apple's Sign in with Apple JS (popup mode) loads this registered Return URL
// inside the popup and hands the result back to the opener via the SDK. The page
// itself only needs to exist and render; the SDK closes the popup automatically.
// (No token handling happens here — the identity token is exchanged server-side
// by /api/auth/apple after the SDK resolves in the opener window.)
export const dynamic = "force-static";

export default function AppleCallbackPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b1526",
        color: "#c7d4e8",
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
      }}
    >
      Signing you in&hellip;
    </div>
  );
}
