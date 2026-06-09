"use client";
import { Component } from "react";

// Catches any render/runtime error in the tree and shows a readable message
// instead of a white screen or an endless "Loading…".
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("[CareerOS] render error:", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ fontFamily: "system-ui", maxWidth: 440, margin: "0 auto", padding: 28, color: "#18211C" }}>
          <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: "#6C766C", lineHeight: 1.5 }}>
            The app hit an error while rendering. This is usually a missing environment variable or a
            backend that's unreachable. Open the browser console for details.
          </p>
          <pre style={{ background: "#F4F0E7", border: "1px solid #ECE6DA", borderRadius: 10, padding: 12,
            fontSize: 12, whiteSpace: "pre-wrap", overflow: "auto" }}>{String(this.state.error?.message || this.state.error)}</pre>
          <button onClick={() => { this.setState({ error: null }); location.reload(); }}
            style={{ marginTop: 12, padding: "10px 16px", borderRadius: 12, border: "none",
              background: "#0E5C4A", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
