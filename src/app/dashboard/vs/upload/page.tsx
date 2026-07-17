"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { firestore, storage } from "@/firebase";

// Tipos de tracks padrão para VS
const TRACK_SLOTS = [
  { id: "click", label: "Clique (Metrônomo)", defaultPan: -1.0, description: "Track de marcação de tempo. Pan 100% esquerda." },
  { id: "guide", label: "Guia (Voz Principal)", defaultPan: 1.0, description: "Voz guia para o músico. Pan 100% direita." },
  { id: "backing", label: "Instrumental / Backing", defaultPan: 0.0, description: "Base musical completa. Pan centro." },
  { id: "extra1", label: "Faixa Extra 1 (opcional)", defaultPan: 0.0, description: "Percussão, cordas, ou qualquer extra." },
];

type TrackUpload = {
  slotId: string;
  label: string;
  defaultPan: number;
  defaultVolume: number;
  file: File | null;
  progress: number;
  url: string;
  storagePath: string;
  status: "idle" | "uploading" | "done" | "error";
};

export default function VsUploadPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [bpm, setBpm] = useState("");
  const [key, setKey] = useState("");
  const [timeSignature, setTimeSignature] = useState("4/4");
  const [notes, setNotes] = useState("");

  const [tracks, setTracks] = useState<TrackUpload[]>(
    TRACK_SLOTS.map((slot) => ({
      slotId: slot.id,
      label: slot.label,
      defaultPan: slot.defaultPan,
      defaultVolume: 1.0,
      file: null,
      progress: 0,
      url: "",
      storagePath: "",
      status: "idle",
    }))
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleFileChange(idx: number, file: File | null) {
    setTracks((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, file, status: "idle", progress: 0, url: "", storagePath: "" } : t))
    );
  }

  function handlePanChange(idx: number, pan: number) {
    setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, defaultPan: pan } : t)));
  }

  function handleVolumeChange(idx: number, vol: number) {
    setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, defaultVolume: vol } : t)));
  }

  async function uploadTrackFile(track: TrackUpload, vsId: string, idx: number): Promise<{ url: string; storagePath: string }> {
    if (!track.file || !storage) return { url: "", storagePath: "" };

    const ext = track.file.name.split(".").pop();
    const storagePath = `vs/${vsId}/${track.slotId}.${ext}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, track.file!);
      uploadTask.on(
        "state_changed",
        (snap) => {
          const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
          setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, progress, status: "uploading" } : t)));
        },
        (err) => {
          setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, status: "error" } : t)));
          reject(err);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, url, storagePath, status: "done", progress: 100 } : t)));
          resolve({ url, storagePath });
        }
      );
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !firestore) return;
    setIsSubmitting(true);

    try {
      // Gera um ID amigável para o VS
      const vsId = title.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30) + "_" + Date.now();

      // Faz upload de cada track que tiver arquivo selecionado
      const uploadedTracks = [];
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        if (!track.file) continue;

        const { url, storagePath } = await uploadTrackFile(track, vsId, i);
        uploadedTracks.push({
          trackId: track.slotId,
          label: track.label,
          storagePath,
          downloadUrl: url,
          defaultPan: track.defaultPan,
          defaultVolume: track.defaultVolume,
        });
      }

      if (uploadedTracks.length === 0) {
        alert("Selecione pelo menos um arquivo de áudio.");
        setIsSubmitting(false);
        return;
      }

      // Salva os metadados no Firestore
      const docRef = await addDoc(collection(firestore, "vs_catalog"), {
        title,
        artist,
        bpm: parseInt(bpm) || 0,
        key,
        timeSignature,
        notes,
        tracks: uploadedTracks,
        status: "active",
        createdAt: serverTimestamp(),
      });

      setSuccessId(docRef.id);
    } catch (err) {
      console.error("Erro ao criar VS:", err);
      alert("Erro ao salvar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (successId) {
    return (
      <div className="vs-success">
        <div className="vs-success-card">
          <div className="vs-success-icon">🎉</div>
          <h2>VS Cadastrada com Sucesso!</h2>
          <p>A música já está disponível no catálogo do Oiko Live.</p>
          <p className="vs-success-id">ID: <code>{successId}</code></p>
          <div className="vs-success-actions">
            <button onClick={() => { setSuccessId(null); setTitle(""); setArtist(""); setBpm(""); setKey(""); setNotes(""); setTracks(TRACK_SLOTS.map(s => ({ slotId: s.id, label: s.label, defaultPan: s.defaultPan, defaultVolume: 1.0, file: null, progress: 0, url: "", storagePath: "", status: "idle" as const }))); }}>
              + Cadastrar Outra VS
            </button>
            <button onClick={() => router.push("/dashboard/vs")} className="secondary">
              Ver Catálogo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vs-upload-page">
      <div className="vs-upload-header">
        <h1>📤 Upload de Virtual Sound (VS)</h1>
        <p>Cadastre uma nova música no catálogo do Oiko Live para os músicos carregarem no app.</p>
      </div>

      <form onSubmit={handleSubmit} className="vs-form">
        {/* Metadados da Música */}
        <section className="vs-section">
          <h2>🎵 Informações da Música</h2>
          <div className="vs-grid-2">
            <div className="vs-field">
              <label>Título da Música *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Oceans (Where Feet May Fail)" required />
            </div>
            <div className="vs-field">
              <label>Artista / Banda</label>
              <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Ex: Hillsong United" />
            </div>
            <div className="vs-field">
              <label>BPM</label>
              <input type="number" value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder="Ex: 68" min={40} max={280} />
            </div>
            <div className="vs-field">
              <label>Tonalidade</label>
              <select value={key} onChange={(e) => setKey(e.target.value)}>
                <option value="">Selecione...</option>
                {["C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B"].map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div className="vs-field">
              <label>Compasso</label>
              <select value={timeSignature} onChange={(e) => setTimeSignature(e.target.value)}>
                <option value="4/4">4/4</option>
                <option value="3/4">3/4</option>
                <option value="6/8">6/8</option>
                <option value="2/4">2/4</option>
              </select>
            </div>
            <div className="vs-field">
              <label>Observações</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas para os músicos..." />
            </div>
          </div>
        </section>

        {/* Upload das Faixas */}
        <section className="vs-section">
          <h2>🎛️ Faixas de Áudio (Stems)</h2>
          <p className="vs-section-desc">Formatos aceitos: MP3, WAV, AAC, FLAC. Pelo menos uma faixa é obrigatória.</p>

          <div className="vs-tracks-list">
            {tracks.map((track, idx) => (
              <div key={track.slotId} className={`vs-track-card ${track.status === "done" ? "done" : track.status === "error" ? "error" : ""}`}>
                <div className="vs-track-header">
                  <div className="vs-track-info">
                    <span className="vs-track-name">{track.label}</span>
                    <span className="vs-track-desc">{TRACK_SLOTS[idx]?.description}</span>
                  </div>
                  <div className="vs-track-status">
                    {track.status === "done" && <span className="badge-done">✓ Enviado</span>}
                    {track.status === "error" && <span className="badge-error">✗ Erro</span>}
                    {track.status === "uploading" && <span className="badge-uploading">↑ {Math.round(track.progress)}%</span>}
                  </div>
                </div>

                <div className="vs-track-body">
                  <div
                    className={`vs-dropzone ${track.file ? "has-file" : ""}`}
                    onClick={() => fileRefs.current[idx]?.click()}
                  >
                    <input
                      ref={(el) => { fileRefs.current[idx] = el; }}
                      type="file"
                      accept="audio/*"
                      style={{ display: "none" }}
                      onChange={(e) => handleFileChange(idx, e.target.files?.[0] ?? null)}
                    />
                    {track.file ? (
                      <span>🎵 {track.file.name} ({(track.file.size / 1024 / 1024).toFixed(1)} MB)</span>
                    ) : (
                      <span>📁 Clique para selecionar o arquivo de áudio</span>
                    )}
                  </div>

                  {track.status === "uploading" && (
                    <div className="vs-progress-bar">
                      <div className="vs-progress-fill" style={{ width: `${track.progress}%` }} />
                    </div>
                  )}

                  <div className="vs-track-controls">
                    <div className="vs-control">
                      <label>Volume padrão: {Math.round(track.defaultVolume * 100)}%</label>
                      <input type="range" min={0} max={1} step={0.05} value={track.defaultVolume}
                        onChange={(e) => handleVolumeChange(idx, parseFloat(e.target.value))} />
                    </div>
                    <div className="vs-control">
                      <label>
                        Pan padrão: {track.defaultPan < -0.05 ? `L${Math.round(-track.defaultPan * 100)}%` : track.defaultPan > 0.05 ? `R${Math.round(track.defaultPan * 100)}%` : "Centro"}
                      </label>
                      <input type="range" min={-1} max={1} step={0.1} value={track.defaultPan}
                        onChange={(e) => handlePanChange(idx, parseFloat(e.target.value))} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="vs-submit">
          <button type="submit" disabled={isSubmitting || !title} className="vs-submit-btn">
            {isSubmitting ? (
              <span>⏳ Enviando... aguarde</span>
            ) : (
              <span>🚀 Publicar VS no Oiko Live</span>
            )}
          </button>
        </div>
      </form>

      <style jsx>{`
        .vs-upload-page { max-width: 860px; margin: 0 auto; padding: 24px 16px 48px; }
        .vs-upload-header { margin-bottom: 32px; }
        .vs-upload-header h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 8px; }
        .vs-upload-header p { color: #666; }
        .vs-form { display: flex; flex-direction: column; gap: 32px; }
        .vs-section { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; }
        .vs-section h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: 16px; }
        .vs-section-desc { color: #888; font-size: 0.85rem; margin-bottom: 16px; }
        .vs-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 600px) { .vs-grid-2 { grid-template-columns: 1fr; } }
        .vs-field label { display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 6px; color: #555; text-transform: uppercase; letter-spacing: 0.05em; }
        .vs-field input, .vs-field select { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--background); font-size: 0.95rem; }
        .vs-tracks-list { display: flex; flex-direction: column; gap: 16px; }
        .vs-track-card { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; transition: border-color 0.2s; }
        .vs-track-card.done { border-color: #22c55e; }
        .vs-track-card.error { border-color: #ef4444; }
        .vs-track-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(0,0,0,0.03); border-bottom: 1px solid var(--border); }
        .vs-track-name { font-weight: 600; font-size: 0.95rem; display: block; }
        .vs-track-desc { font-size: 0.78rem; color: #888; display: block; }
        .badge-done { background: #dcfce7; color: #166534; padding: 3px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
        .badge-error { background: #fee2e2; color: #991b1b; padding: 3px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
        .badge-uploading { background: #dbeafe; color: #1d4ed8; padding: 3px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
        .vs-track-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .vs-dropzone { border: 2px dashed var(--border); border-radius: 8px; padding: 16px; text-align: center; cursor: pointer; font-size: 0.9rem; color: #888; transition: all 0.2s; }
        .vs-dropzone:hover { border-color: var(--primary); color: var(--primary); }
        .vs-dropzone.has-file { border-style: solid; border-color: #22c55e; color: #166534; background: #f0fdf4; }
        .vs-progress-bar { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
        .vs-progress-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 3px; transition: width 0.3s; }
        .vs-track-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 500px) { .vs-track-controls { grid-template-columns: 1fr; } }
        .vs-control label { font-size: 0.78rem; font-weight: 600; display: block; margin-bottom: 4px; color: #555; }
        .vs-control input[type=range] { width: 100%; }
        .vs-submit { display: flex; justify-content: flex-end; }
        .vs-submit-btn { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; padding: 14px 36px; border-radius: 10px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
        .vs-submit-btn:hover:not(:disabled) { opacity: 0.9; }
        .vs-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .vs-success { display: flex; align-items: center; justify-content: center; min-height: 60vh; }
        .vs-success-card { text-align: center; background: var(--card); border: 1px solid #22c55e; border-radius: 16px; padding: 48px; max-width: 480px; }
        .vs-success-icon { font-size: 3rem; margin-bottom: 16px; }
        .vs-success-card h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 8px; }
        .vs-success-card p { color: #666; margin-bottom: 8px; }
        .vs-success-id { font-size: 0.8rem; color: #888; }
        .vs-success-actions { display: flex; gap: 12px; justify-content: center; margin-top: 24px; }
        .vs-success-actions button { padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; background: #6366f1; color: white; }
        .vs-success-actions button.secondary { background: transparent; border: 1px solid var(--border); color: var(--foreground); }
      `}</style>
    </div>
  );
}
