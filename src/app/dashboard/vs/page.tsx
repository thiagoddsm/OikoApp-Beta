"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { firestore } from "@/firebase";

type VsEntry = {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  timeSignature: string;
  tracks: { trackId: string; label: string }[];
  status: string;
  createdAt: any;
};

export default function VsCatalogPage() {
  const [catalog, setCatalog] = useState<VsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCatalog() {
      if (!firestore) return;
      try {
        const q = query(collection(firestore, "vs_catalog"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as VsEntry));
        setCatalog(data);
      } catch (e) {
        console.error("Erro ao carregar catálogo:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchCatalog();
  }, []);

  async function handleDelete(id: string) {
    if (!firestore || !confirm("Remover esta VS do catálogo?")) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(firestore, "vs_catalog", id));
      setCatalog((prev) => prev.filter((vs) => vs.id !== id));
    } catch (e) {
      alert("Erro ao remover.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="vs-catalog-page">
      <div className="vs-catalog-header">
        <div>
          <h1>🎵 Catálogo de VS — Oiko Live</h1>
          <p>Gerencie as Virtual Sounds disponíveis para os músicos no app.</p>
        </div>
        <Link href="/dashboard/vs/upload" className="vs-new-btn">
          📤 Novo Upload de VS
        </Link>
      </div>

      {loading ? (
        <div className="vs-loading">
          <div className="vs-spinner" />
          <span>Carregando catálogo...</span>
        </div>
      ) : catalog.length === 0 ? (
        <div className="vs-empty">
          <div className="vs-empty-icon">📂</div>
          <h2>Nenhuma VS cadastrada ainda</h2>
          <p>Faça o upload da primeira música para os músicos poderem usar no Oiko Live.</p>
          <Link href="/dashboard/vs/upload" className="vs-new-btn">
            📤 Fazer Primeiro Upload
          </Link>
        </div>
      ) : (
        <div className="vs-grid">
          {catalog.map((vs) => (
            <div key={vs.id} className="vs-card">
              <div className="vs-card-header">
                <div>
                  <h3>{vs.title}</h3>
                  {vs.artist && <p className="vs-artist">{vs.artist}</p>}
                </div>
                <span className={`vs-status ${vs.status === "active" ? "active" : ""}`}>
                  {vs.status === "active" ? "Ativo" : vs.status}
                </span>
              </div>
              <div className="vs-card-meta">
                {vs.bpm > 0 && <span className="vs-badge">🎵 {vs.bpm} BPM</span>}
                {vs.key && <span className="vs-badge">🎹 {vs.key}</span>}
                {vs.timeSignature && <span className="vs-badge">⏱ {vs.timeSignature}</span>}
                {vs.tracks?.length > 0 && <span className="vs-badge">🎛 {vs.tracks.length} faixas</span>}
              </div>
              {vs.tracks?.length > 0 && (
                <div className="vs-tracks">
                  {vs.tracks.map((t) => (
                    <span key={t.trackId} className="vs-track-pill">
                      {t.label}
                    </span>
                  ))}
                </div>
              )}
              <div className="vs-card-actions">
                <button
                  onClick={() => handleDelete(vs.id)}
                  disabled={deletingId === vs.id}
                  className="vs-delete-btn"
                >
                  {deletingId === vs.id ? "Removendo..." : "🗑 Remover"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .vs-catalog-page { max-width: 960px; margin: 0 auto; padding: 24px 16px 48px; }
        .vs-catalog-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
        .vs-catalog-header h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 4px; }
        .vs-catalog-header p { color: #666; }
        .vs-new-btn { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 10px 20px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 0.9rem; transition: opacity 0.2s; }
        .vs-new-btn:hover { opacity: 0.9; }
        .vs-loading { display: flex; align-items: center; gap: 12px; padding: 48px; justify-content: center; color: #888; }
        .vs-spinner { width: 20px; height: 20px; border: 2px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .vs-empty { text-align: center; padding: 64px 24px; }
        .vs-empty-icon { font-size: 3rem; margin-bottom: 16px; }
        .vs-empty h2 { font-size: 1.3rem; font-weight: 600; margin-bottom: 8px; }
        .vs-empty p { color: #888; margin-bottom: 24px; }
        .vs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .vs-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .vs-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
        .vs-card-header h3 { font-size: 1rem; font-weight: 600; line-height: 1.3; }
        .vs-artist { font-size: 0.85rem; color: #888; margin-top: 2px; }
        .vs-status { font-size: 0.75rem; font-weight: 600; padding: 3px 10px; border-radius: 20px; white-space: nowrap; background: #f3f4f6; color: #374151; }
        .vs-status.active { background: #dcfce7; color: #166534; }
        .vs-card-meta { display: flex; flex-wrap: wrap; gap: 6px; }
        .vs-badge { font-size: 0.78rem; background: rgba(99,102,241,0.1); color: #6366f1; padding: 3px 10px; border-radius: 20px; font-weight: 500; }
        .vs-tracks { display: flex; flex-wrap: wrap; gap: 6px; }
        .vs-track-pill { font-size: 0.75rem; background: var(--muted); padding: 3px 10px; border-radius: 20px; color: var(--muted-foreground); }
        .vs-card-actions { margin-top: auto; padding-top: 8px; border-top: 1px solid var(--border); }
        .vs-delete-btn { font-size: 0.8rem; color: #ef4444; background: transparent; border: none; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
        .vs-delete-btn:hover { background: #fee2e2; }
        .vs-delete-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
