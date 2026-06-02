/**
 * Phase 2A Bootstrap App
 *
 * Minimal UI demonstrating live API connectivity via React Query.
 * Full application UI to be built in subsequent phases.
 */

import { useProducts } from "./lib/queries";
import { useCreators } from "./lib/queries";
import { usePipeline } from "./lib/queries";

function App() {
  const products = useProducts();
  const creators = useCreators();
  const pipeline = usePipeline();

  const loading = products.isLoading || creators.isLoading || pipeline.isLoading;
  const error = products.error || creators.error || pipeline.error;

  return (
    <div style={{ fontFamily: "monospace", padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
        🚀 Influence Partner App — Phase 2A
      </h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        Backend foundation active. React Query connected. Full UI builds in Phase 2B+.
      </p>

      {loading && <p>Loading data from API...</p>}
      {error && (
        <p style={{ color: "red" }}>
          ⚠️ API error — is the server running on port 3001?
          <br />
          <code>{String(error)}</code>
        </p>
      )}

      {!loading && !error && (
        <div style={{ display: "grid", gap: "1.5rem" }}>

          <section>
            <h2 style={{ fontSize: "1rem", borderBottom: "1px solid #ddd", paddingBottom: "0.25rem" }}>
              ✅ Products ({products.data?.length ?? 0})
            </h2>
            <ul style={{ margin: "0.5rem 0", paddingLeft: "1.2rem" }}>
              {products.data?.map((p) => (
                <li key={p.id}>
                  <strong>{p.name}</strong> — {p.category} — ${p.price}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: "1rem", borderBottom: "1px solid #ddd", paddingBottom: "0.25rem" }}>
              ✅ Creators ({creators.data?.length ?? 0})
            </h2>
            <ul style={{ margin: "0.5rem 0", paddingLeft: "1.2rem" }}>
              {creators.data?.map((c) => (
                <li key={c.id}>
                  <strong>{c.name}</strong> {c.handle} — {c.platform} — {c.followerCount.toLocaleString()} followers
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: "1rem", borderBottom: "1px solid #ddd", paddingBottom: "0.25rem" }}>
              ✅ Pipeline ({pipeline.data?.length ?? 0} items)
            </h2>
            <ul style={{ margin: "0.5rem 0", paddingLeft: "1.2rem" }}>
              {pipeline.data?.map((item) => (
                <li key={item.id}>
                  [{item.status}] Product: {item.productId} ↔ Creator: {item.creatorId}
                  {item.notes && <span style={{ color: "#888" }}> — {item.notes}</span>}
                </li>
              ))}
            </ul>
          </section>

          <section style={{ background: "#f9f9f9", padding: "1rem", borderRadius: "4px", fontSize: "0.85rem" }}>
            <strong>API Endpoints Active:</strong>
            <ul style={{ marginTop: "0.5rem", paddingLeft: "1.2rem" }}>
              <li>GET /api/healthz</li>
              <li>GET/POST/PUT/DELETE /api/products</li>
              <li>GET/POST/PUT/DELETE /api/creators</li>
              <li>GET/POST/PUT/DELETE /api/pipeline</li>
              <li>GET/POST /api/pipeline/:id/messages</li>
            </ul>
          </section>

        </div>
      )}
    </div>
  );
}

export default App;
