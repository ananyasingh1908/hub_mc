export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>HUBMC — Something went wrong</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext y='0.85em' font-size='24' font-weight='900' fill='%233ea2ff'%3EH%3C/text%3E%3C/svg%3E"/>
    <meta name="robots" content="noindex" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #050505; color: #e5e5e5; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; }
      .logo { font-size: 1.75rem; font-weight: 900; letter-spacing: -0.02em; }
      .logo b { color: #3ea2ff; } .logo i { color: #ff8a2a; }
      h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem; }
      p { color: #8a8a8a; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.75rem; font: inherit; font-weight: 600; cursor: pointer; text-decoration: none; border: none; }
      .primary { background: #ff8a2a; color: #000; }
      .secondary { background: rgba(255,255,255,0.06); color: #a0a0a0; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="logo"><b>HUB</b><i>MC</i></div>
      <h1>Something went wrong</h1>
      <p>This page didn't load. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
