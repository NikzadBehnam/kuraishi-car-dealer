"use client";
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="de">
      <body>
        <main
          style={{
            padding: "4rem",
            fontFamily: "sans-serif",
            textAlign: "center",
          }}
        >
          <h1>Ein unerwarteter Fehler ist aufgetreten</h1>
          <p>Bitte laden Sie die Seite erneut.</p>
          <button onClick={reset}>Erneut versuchen</button>
        </main>
      </body>
    </html>
  );
}
