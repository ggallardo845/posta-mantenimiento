import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://qfeikwswsuenujnpbjka.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZWlrd3N3c3VlbnVqbnBiamthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1ODIwNTMsImV4cCI6MjA5NTE1ODA1M30.D95gYEusRKnCkvi3ntZ30ltE625ue_sr1KGuR_szfXg";

async function sbFetch(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 204) { const err = await res.text(); throw new Error(err); }
  if (res.status === 204) return null;
  return res.json();
}

async function uploadFoto(file, taskId) {
  const ext = file.name.split(".").pop();
  const path = `task-${taskId}-${Date.now()}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/fotos/${path}`, {
    method: "POST",
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  return `${SUPABASE_URL}/storage/v1/object/public/fotos/${path}`;
}

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) + " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function diffHours(a, b) {
  if (!a || !b) return null;
  const diff = Math.abs(new Date(b) - new Date(a));
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

const TEAM = [
  { id: "daniel", name: "Daniel", role: "supervisor", color: "#C8963E", initials: "DA" },
  { id: "alexis", name: "Alexis", role: "mantenimiento", color: "#4A90A4", initials: "AL" },
  { id: "ezequiel", name: "Ezequiel", role: "mantenimiento", color: "#7B9E5E", initials: "EZ" },
  { id: "raul", name: "Raúl", role: "mantenimiento", color: "#9B6B9B", initials: "RA" },
  { id: "housekeeping", name: "Housekeeping", role: "housekeeping", color: "#E07B6A", initials: "HK" },
];

const SECTORS = ["Habitaciones", "SPA", "Exterior / Piletas", "Restaurante", "Recepción", "Cocina", "Administración", "Pasillos", "Aldaba", "General"];
const PRIORITY_CONFIG = { alta: { label: "Alta", color: "#E05555", bg: "#FFF0F0" }, media: { label: "Media", color: "#C8963E", bg: "#FFF8ED" }, baja: { label: "Baja", color: "#7B9E5E", bg: "#F0F7EC" } };
const STATUS_CONFIG = { pendiente: { label: "Pendiente", icon: "○", color: "#888" }, "en-proceso": { label: "En proceso", icon: "◐", color: "#C8963E" }, completada: { label: "Completada", icon: "●", color: "#7B9E5E" }, "no-realizada": { label: "No realizada", icon: "✕", color: "#E05555" } };

function getMember(id) { return TEAM.find(m => m.id === id); }
function dbToTask(r) { return { id: r.id, title: r.title, sector: r.sector, location: r.location, assignedTo: r.assigned_to, priority: r.priority, status: r.status, week: r.week, notes: r.notes || "", photo: r.photo, rejectionReason: r.rejection_reason, createdAt: r.created_at, startedAt: r.started_at, finishedAt: r.finished_at, escalated: r.escalated || false, createdBy: r.created_by || null }; }
function taskToDb(t) { return { title: t.title, sector: t.sector, location: t.location, assigned_to: t.assignedTo, priority: t.priority, status: t.status, week: t.week, notes: t.notes, photo: t.photo, rejection_reason: t.rejectionReason, created_at: t.createdAt, started_at: t.startedAt, finished_at: t.finishedAt, escalated: t.escalated, created_by: t.createdBy }; }

function Avatar({ memberId, size = 36 }) {
  const m = getMember(memberId);
  if (!m) return null;
  return <div style={{ width: size, height: size, borderRadius: "50%", background: m.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, fontFamily: "inherit", flexShrink: 0 }}>{m.initials}</div>;
}

function Badge({ type, value }) {
  const cfg = type === "priority" ? PRIORITY_CONFIG[value] : STATUS_CONFIG[value];
  if (!cfg) return null;
  return <span style={{ background: type === "priority" ? cfg.bg : "transparent", color: cfg.color, border: `1px solid ${cfg.color}30`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>{cfg.label}</span>;
}

// ─── COMENTARIOS ──────────────────────────────────────────────────────────────
function CommentsSection({ taskId, currentUser }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    sbFetch("GET", `comments?task_id=eq.${taskId}&order=created_at.asc`)
      .then(data => setComments(data || []))
      .catch(() => {});
  }, [taskId]);

  async function handleAdd() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const result = await sbFetch("POST", "comments", { task_id: taskId, author: currentUser, content: text.trim() });
      setComments(c => [...c, result[0]]);
      setText("");
    } catch(e) { alert("Error: " + e.message); } finally { setSaving(false); }
  }

  return (
    <div style={{ borderTop: "1px solid #EEE8DC", paddingTop: 20, marginTop: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", marginBottom: 12 }}>Comentarios</div>
      {comments.length === 0 && <div style={{ fontSize: 12, color: "#CCC", marginBottom: 12 }}>Sin comentarios aún</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        {comments.map(c => {
          const m = getMember(c.author);
          return (
            <div key={c.id} style={{ display: "flex", gap: 8 }}>
              <Avatar memberId={c.author} size={28} />
              <div style={{ flex: 1, background: "#F5F0E8", borderRadius: "0 12px 12px 12px", padding: "8px 12px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#999", marginBottom: 3 }}>{m?.name || c.author} · {formatDate(c.created_at)}</div>
                <div style={{ fontSize: 13, color: "#333" }}>{c.content}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Avatar memberId={currentUser} size={28} />
        <div style={{ flex: 1, display: "flex", gap: 6 }}>
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} placeholder="Escribí un comentario..." style={{ flex: 1, border: "1.5px solid #E0D8CC", borderRadius: 20, padding: "6px 12px", fontSize: 13, fontFamily: "inherit", background: "#FDFAF5", outline: "none" }} />
          <button onClick={handleAdd} disabled={saving || !text.trim()} style={{ background: "#1A1208", color: "#fff", border: "none", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Enviar</button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL TAREA ──────────────────────────────────────────────────────────────
function TaskModal({ task, onClose, onUpdate, onDelete, currentUser }) {
  const [status, setStatus] = useState(task.status);
  const [reason, setReason] = useState(task.rejectionReason || "");
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(task.photo || null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignTo, setAssignTo] = useState(task.assignedTo || "alexis");
  const fileRef = useRef();

  const isSupervisor = currentUser === "daniel";
  const isWorker = TEAM.find(m => m.id === currentUser)?.role === "mantenimiento";
  const canEdit = currentUser === task.assignedTo || isSupervisor;
  const member = getMember(task.assignedTo);
  const workers = TEAM.filter(m => m.role === "mantenimiento");

  function handleFotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (status === "no-realizada" && !reason.trim()) { alert("Por favor indicá el motivo."); return; }
    if (status === "completada" && !fotoPreview) { alert("Por favor cargá una foto."); return; }
    setSaving(true);
    try {
      let photoUrl = task.photo;
      if (fotoFile) photoUrl = await uploadFoto(fotoFile, task.id);
      const now = new Date().toISOString();
      let startedAt = task.startedAt;
      let finishedAt = task.finishedAt;
      if (status === "en-proceso" && !startedAt) startedAt = now;
      if (status === "completada") { if (!startedAt) startedAt = now; finishedAt = now; }
      if (status === "no-realizada") finishedAt = now;
      const updated = { ...task, status, rejectionReason: reason, photo: photoUrl, startedAt, finishedAt };
      await sbFetch("PATCH", `tasks?id=eq.${task.id}`, taskToDb(updated));
      onUpdate(updated); onClose();
    } catch(e) { alert("Error: " + e.message); } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar la tarea #${task.id} "${task.title}"?`)) return;
    setDeleting(true);
    try {
      await sbFetch("DELETE", `tasks?id=eq.${task.id}`);
      onDelete(task.id); onClose();
    } catch(e) { alert("Error al eliminar: " + e.message); } finally { setDeleting(false); }
  }

  async function handleEscalate() {
    if (!confirm("¿Elevar esta tarea a Daniel?")) return;
    setEscalating(true);
    try {
      const updated = { ...task, escalated: true, assignedTo: "daniel" };
      await sbFetch("PATCH", `tasks?id=eq.${task.id}`, taskToDb(updated));
      onUpdate(updated); onClose();
    } catch(e) { alert("Error: " + e.message); } finally { setEscalating(false); }
  }

  async function handleAssign() {
    setAssigning(true);
    try {
      const updated = { ...task, assignedTo: assignTo, status: "pendiente" };
      await sbFetch("PATCH", `tasks?id=eq.${task.id}`, taskToDb(updated));
      onUpdate(updated); onClose();
    } catch(e) { alert("Error: " + e.message); } finally { setAssigning(false); }
  }

  const respTime = diffHours(task.createdAt, task.startedAt);
  const execTime = diffHours(task.startedAt, task.finishedAt);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,8,5,0.75)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div style={{ background: "#FDFAF5", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", padding: "28px 24px 40px" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: "#DDD", borderRadius: 2, margin: "0 auto 20px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#999", textTransform: "uppercase" }}>{task.sector} · {task.location}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#C8963E", background: "#FFF3DC", borderRadius: 20, padding: "1px 8px" }}>#{task.id}</span>
              {task.escalated && <span style={{ fontSize: 10, fontWeight: 700, color: "#C8963E", background: "#FFF3DC", borderRadius: 20, padding: "1px 8px" }}>↑ Elevada</span>}
              {!task.assignedTo && <span style={{ fontSize: 10, fontWeight: 700, color: "#888", background: "#F0EDE8", borderRadius: 20, padding: "1px 8px" }}>Sin asignar</span>}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{task.title}</div>
          </div>
          <button onClick={onClose} style={{ background: "#F0EDE8", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#666" }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}><Badge type="priority" value={task.priority} /><Badge type="status" value={status} /></div>

        {task.assignedTo && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#F5F0E8", borderRadius: 12, marginBottom: 16 }}>
            <Avatar memberId={task.assignedTo} size={32} />
            <div><div style={{ fontSize: 10, color: "#999" }}>Asignado a</div><div style={{ fontSize: 14, fontWeight: 600 }}>{member?.name}</div></div>
          </div>
        )}

        {/* Asignar — solo Daniel cuando no tiene asignado */}
        {isSupervisor && !task.assignedTo && (
          <div style={{ background: "#FFF8ED", border: "1px solid #F0D9A8", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#C8963E", marginBottom: 10 }}>Asignar tarea</div>
            <div style={{ display: "flex", gap: 8 }}>
              <select value={assignTo} onChange={e => setAssignTo(e.target.value)} style={{ flex: 1, border: "1.5px solid #E0D8CC", borderRadius: 10, padding: "8px 12px", fontSize: 14, fontFamily: "inherit", background: "#FDFAF5" }}>
                {workers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button onClick={handleAssign} disabled={assigning} style={{ padding: "8px 16px", background: "#1A1208", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {assigning ? "..." : "Asignar"}
              </button>
            </div>
          </div>
        )}

        {(task.startedAt || task.finishedAt) && (
          <div style={{ background: "#F5F0E8", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
            {respTime && <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>⏱ Tiempo de respuesta: <strong>{respTime}</strong></div>}
            {execTime && <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>⚙️ Tiempo de ejecución: <strong>{execTime}</strong></div>}
            {task.startedAt && <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>🕐 Inicio: <strong>{formatDate(task.startedAt)}</strong></div>}
            {task.finishedAt && <div style={{ fontSize: 12, color: "#666" }}>🏁 Fin: <strong>{formatDate(task.finishedAt)}</strong></div>}
          </div>
        )}

        {task.notes && <div style={{ background: "#F5F0E8", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 13 }}>{task.notes}</div>}
        {task.photo && <img src={task.photo} alt="comprobante" style={{ width: "100%", borderRadius: 12, marginBottom: 16 }} />}
        {task.rejectionReason && <div style={{ background: "#FFF0F0", border: "1px solid #FFCCCC", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#C0392B", marginBottom: 16 }}><strong>Motivo:</strong> {task.rejectionReason}</div>}

        {canEdit && task.assignedTo && (
          <div style={{ borderTop: "1px solid #EEE8DC", paddingTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", marginBottom: 12 }}>Actualizar estado</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {["en-proceso","completada","no-realizada"].map(s => (
                <button key={s} onClick={() => setStatus(s)} style={{ padding: "8px 14px", borderRadius: 20, border: "2px solid", borderColor: status===s ? STATUS_CONFIG[s].color : "#DDD", background: status===s ? STATUS_CONFIG[s].color+"18" : "#fff", color: status===s ? STATUS_CONFIG[s].color : "#888", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
            {status === "en-proceso" && !task.startedAt && <div style={{ background: "#FFF8ED", border: "1px solid #F0D9A8", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#C8963E" }}>🕐 Al guardar se registrará la hora de inicio</div>}
            {status === "completada" && <div style={{ background: "#F0F7EC", border: "1px solid #C8E0B4", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#7B9E5E" }}>🏁 Al guardar se registrará la hora de finalización</div>}
            {status === "no-realizada" && <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#E05555", marginBottom: 6 }}>¿Por qué no se realizó? *</div>
              <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Ej: Falta material..." style={{ width: "100%", minHeight: 80, border: "1.5px solid #E0D8CC", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", resize: "none", boxSizing: "border-box" }} />
            </div>}
            {status === "completada" && <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#7B9E5E", marginBottom: 6 }}>Foto comprobante *</div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFotoChange} style={{ display: "none" }} />
              {fotoPreview
                ? <div style={{ position: "relative" }}><img src={fotoPreview} alt="foto" style={{ width: "100%", borderRadius: 12, maxHeight: 200, objectFit: "cover" }} /><button onClick={() => fileRef.current.click()} style={{ position: "absolute", bottom: 8, right: 8, background: "#1A1208", color: "#fff", border: "none", borderRadius: 20, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Cambiar</button></div>
                : <button onClick={() => fileRef.current.click()} style={{ width: "100%", padding: "14px", border: "2px dashed #CCC", borderRadius: 12, background: "#FAFAFA", color: "#AAA", fontSize: 14, cursor: "pointer" }}>📷 Tocar para sacar foto</button>
              }
            </div>}
            <button onClick={handleSave} disabled={saving} style={{ width: "100%", padding: "14px", background: saving ? "#CCC" : "#1A1208", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: saving ? "default" : "pointer" }}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            {isWorker && !task.escalated && (
              <button onClick={handleEscalate} disabled={escalating} style={{ width: "100%", padding: "12px", background: "transparent", color: "#C8963E", border: "1.5px solid #C8963E", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 10 }}>
                {escalating ? "Elevando..." : "↑ Elevar problema a Daniel"}
              </button>
            )}
          </div>
        )}

        {isSupervisor && (
          <button onClick={handleDelete} disabled={deleting} style={{ width: "100%", padding: "12px", background: "transparent", color: "#E05555", border: "1.5px solid #E05555", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: deleting ? "default" : "pointer", marginTop: 16 }}>
            {deleting ? "Eliminando..." : `🗑 Eliminar tarea #${task.id}`}
          </button>
        )}

        <CommentsSection taskId={task.id} currentUser={currentUser} />
      </div>
    </div>
  );
}

// ─── MODAL NUEVA TAREA ────────────────────────────────────────────────────────
function NewTaskModal({ onClose, onAdd, currentUser }) {
  const isHousekeeping = currentUser === "housekeeping";
  const [form, setForm] = useState({ title: "", sector: "Habitaciones", location: "", assignedTo: "alexis", priority: "media", notes: "" });
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const workers = TEAM.filter(m => m.role === "mantenimiento");

  function handleFotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  async function handleAdd() {
    if (!form.title.trim()) { alert("Ingresá el título"); return; }
    setSaving(true);
    try {
      const newTask = {
        ...form,
        assignedTo: isHousekeeping ? null : form.assignedTo,
        status: "pendiente",
        week: new Date().toISOString().slice(0, 10),
        photo: null,
        rejectionReason: null,
        createdAt: new Date().toISOString().slice(0, 10),
        startedAt: null, finishedAt: null,
        escalated: false, createdBy: currentUser
      };
      const result = await sbFetch("POST", "tasks", taskToDb(newTask));
      const savedId = result[0].id;
      let photoUrl = null;
      if (fotoFile) photoUrl = await uploadFoto(fotoFile, savedId);
      if (photoUrl) {
        await sbFetch("PATCH", `tasks?id=eq.${savedId}`, { photo: photoUrl });
        newTask.photo = photoUrl;
      }
      onAdd({ ...newTask, id: savedId }); onClose();
    } catch(e) { alert("Error: " + e.message); } finally { setSaving(false); }
  }

  const inp = { width: "100%", border: "1.5px solid #E0D8CC", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", background: "#FDFAF5", boxSizing: "border-box" };
  const lbl = { fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", display: "block", marginBottom: 5 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,8,5,0.75)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div style={{ background: "#FDFAF5", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", padding: "28px 24px 40px" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: "#DDD", borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ fontSize: 20, fontWeight: 800, color: "#1A1208", marginBottom: 6 }}>{isHousekeeping ? "Reportar problema" : "Nueva tarea"}</div>
        {isHousekeeping && <div style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>Daniel asignará esta tarea al equipo.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label style={lbl}>Título *</label><input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Ej: Canilla rota hab. 5" style={inp} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Sector</label><select value={form.sector} onChange={e => set("sector", e.target.value)} style={inp}>{SECTORS.map(s => <option key={s}>{s}</option>)}</select></div>
            <div><label style={lbl}>Ubicación</label><input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Ej: Hab. 12" style={inp} /></div>
          </div>
          {!isHousekeeping && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={lbl}>Asignar a</label><select value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)} style={inp}>{workers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
              <div><label style={lbl}>Prioridad</label><select value={form.priority} onChange={e => set("priority", e.target.value)} style={inp}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></div>
            </div>
          )}
          {isHousekeeping && <div><label style={lbl}>Prioridad</label><select value={form.priority} onChange={e => set("priority", e.target.value)} style={inp}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></div>}
          <div><label style={lbl}>Notas</label><textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Describí el problema..." style={{ ...inp, minHeight: 70, resize: "none" }} /></div>

          {/* Foto del problema */}
          <div>
            <label style={lbl}>Foto {isHousekeeping ? "del problema" : "(opcional)"}</label>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFotoChange} style={{ display: "none" }} />
            {fotoPreview
              ? <div style={{ position: "relative" }}><img src={fotoPreview} alt="foto" style={{ width: "100%", borderRadius: 12, maxHeight: 180, objectFit: "cover" }} /><button onClick={() => fileRef.current.click()} style={{ position: "absolute", bottom: 8, right: 8, background: "#1A1208", color: "#fff", border: "none", borderRadius: 20, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Cambiar</button></div>
              : <button onClick={() => fileRef.current.click()} style={{ width: "100%", padding: "14px", border: "2px dashed #CCC", borderRadius: 12, background: "#FAFAFA", color: "#AAA", fontSize: 14, cursor: "pointer" }}>📷 {isHousekeeping ? "Foto del problema" : "Agregar foto"}</button>
            }
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 14, background: "#F0EDE8", border: "none", borderRadius: 12, fontSize: 14, cursor: "pointer", color: "#666" }}>Cancelar</button>
          <button onClick={handleAdd} disabled={saving} style={{ flex: 2, padding: 14, background: saving ? "#CCC" : "#1A1208", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#fff" }}>{saving ? "Guardando..." : isHousekeeping ? "Reportar" : "Agregar tarea"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── MÉTRICAS ─────────────────────────────────────────────────────────────────
function MetricsView({ tasks }) {
  const workers = TEAM.filter(m => m.role === "mantenimiento");

  function getStats(memberId) {
    const mine = tasks.filter(t => t.assignedTo === memberId);
    const completadas = mine.filter(t => t.status === "completada");
    const noRealizadas = mine.filter(t => t.status === "no-realizada");
    const enProceso = mine.filter(t => t.status === "en-proceso");
    const respTimes = completadas.filter(t => t.createdAt && t.startedAt).map(t => new Date(t.startedAt) - new Date(t.createdAt));
    const execTimes = completadas.filter(t => t.startedAt && t.finishedAt).map(t => new Date(t.finishedAt) - new Date(t.startedAt));
    const avgResp = respTimes.length ? respTimes.reduce((a,b)=>a+b,0)/respTimes.length : null;
    const avgExec = execTimes.length ? execTimes.reduce((a,b)=>a+b,0)/execTimes.length : null;
    function fmtMs(ms) {
      if (!ms) return "—";
      const h = Math.floor(ms/3600000); const m = Math.floor((ms%3600000)/60000);
      if (h===0) return `${m}min`; if (m===0) return `${h}h`; return `${h}h ${m}min`;
    }
    return { total: mine.length, completadas: completadas.length, noRealizadas: noRealizadas.length, enProceso: enProceso.length, pendientes: mine.length-completadas.length-enProceso.length-noRealizadas.length, avgResp: fmtMs(avgResp), avgExec: fmtMs(avgExec) };
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Métricas del equipo</div>
      {workers.map(w => {
        const s = getStats(w.id);
        const pct = s.total > 0 ? Math.round((s.completadas/s.total)*100) : 0;
        return (
          <div key={w.id} style={{ background: "#fff", borderRadius: 14, padding: "16px", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <Avatar memberId={w.id} size={36} />
              <div><div style={{ fontSize: 15, fontWeight: 700 }}>{w.name}</div><div style={{ fontSize: 11, color: "#999" }}>{s.total} tareas asignadas</div></div>
              <div style={{ marginLeft: "auto", fontSize: 22, fontWeight: 800, color: pct>=70?"#7B9E5E":pct>=40?"#C8963E":"#E05555" }}>{pct}%</div>
            </div>
            <div style={{ background: "#F0EDE8", borderRadius: 20, height: 6, marginBottom: 14, overflow: "hidden" }}>
              <div style={{ background: pct>=70?"#7B9E5E":pct>=40?"#C8963E":"#E05555", height: "100%", width: `${pct}%`, borderRadius: 20 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              {[{label:"Completadas",value:s.completadas,color:"#7B9E5E"},{label:"En proceso",value:s.enProceso,color:"#C8963E"},{label:"No realizadas",value:s.noRealizadas,color:"#E05555"},{label:"Pendientes",value:s.pendientes,color:"#888"}].map(stat => (
                <div key={stat.label} style={{ textAlign: "center", background: "#F5F0E8", borderRadius: 10, padding: "8px 4px" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: 9, color: "#999", fontWeight: 600 }}>{stat.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ background: "#F5F0E8", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#999", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>T. Respuesta</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1208" }}>{s.avgResp}</div>
                <div style={{ fontSize: 10, color: "#BBB" }}>creación → inicio</div>
              </div>
              <div style={{ background: "#F5F0E8", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "#999", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>T. Ejecución</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1208" }}>{s.avgExec}</div>
                <div style={{ fontSize: 10, color: "#BBB" }}>inicio → fin</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── VISTA SUPERVISOR ─────────────────────────────────────────────────────────
function SupervisorView({ tasks, onTaskUpdate, onTaskDelete, onNewTask }) {
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState("tareas");
  const [selectedTask, setSelectedTask] = useState(null);

  const unassigned = tasks.filter(t => !t.assignedTo);

  const filtered = (() => {
    if (filter === "unassigned") return tasks.filter(t => !t.assignedTo);
    if (filter === "all") return tasks;
    return tasks.filter(t => t.assignedTo === filter || t.status === filter);
  })();

  const stats = {
    total: tasks.length,
    completadas: tasks.filter(t => t.status === "completada").length,
    pendientes: tasks.filter(t => t.status === "pendiente").length,
    noRealizadas: tasks.filter(t => t.status === "no-realizada").length,
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["tareas","metricas"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "none", background: tab===t ? "#1A1208" : "#F0EDE8", color: tab===t ? "#fff" : "#666", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {t === "tareas" ? "📋 Tareas" : "📊 Métricas"}
          </button>
        ))}
      </div>

      {tab === "metricas" ? <MetricsView tasks={tasks} /> : (
        <div>
          {unassigned.length > 0 && (
            <div onClick={() => setFilter(filter === "unassigned" ? "all" : "unassigned")} style={{ background: filter==="unassigned" ? "#F0D9A8" : "#FFF8ED", border: "1px solid #F0D9A8", borderRadius: 14, padding: "12px 16px", marginBottom: 16, cursor: "pointer" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#C8963E" }}>⏳ {unassigned.length} tarea{unassigned.length!==1?"s":""} sin asignar de Housekeeping</div>
              <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{filter==="unassigned" ? "Tocá para ver todas" : "Tocá para filtrar"}</div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
            {[{label:"Total",value:stats.total,color:"#1A1208"},{label:"Listas",value:stats.completadas,color:"#7B9E5E"},{label:"Pend.",value:stats.pendientes,color:"#C8963E"},{label:"No real.",value:stats.noRealizadas,color:"#E05555"}].map(s => (
              <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "12px 8px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "#999", fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 16 }}>
            {[{id:"all",label:"Todos"},...TEAM.filter(m=>m.role==="mantenimiento").map(m=>({id:m.id,label:m.name})),{id:"no-realizada",label:"⚠ Sin hacer"}].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: "6px 14px", borderRadius: 20, border: "1.5px solid", borderColor: filter===f.id ? "#1A1208" : "#E0D8CC", background: filter===f.id ? "#1A1208" : "#fff", color: filter===f.id ? "#fff" : "#666", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{f.label}</button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(task => {
              const member = getMember(task.assignedTo); const st = STATUS_CONFIG[task.status];
              return (
                <div key={task.id} onClick={() => setSelectedTask(task)} style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", cursor: "pointer", borderLeft: `4px solid ${PRIORITY_CONFIG[task.priority]?.color||"#ccc"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "#AAA" }}>{task.sector} · {task.location}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#C8963E", background: "#FFF3DC", borderRadius: 20, padding: "1px 6px" }}>#{task.id}</span>
                        {task.escalated && <span style={{ fontSize: 10, fontWeight: 700, color: "#C8963E", background: "#FFF3DC", borderRadius: 20, padding: "1px 6px" }}>↑ Elevada</span>}
                        {!task.assignedTo && <span style={{ fontSize: 10, fontWeight: 700, color: "#888", background: "#F0EDE8", borderRadius: 20, padding: "1px 6px" }}>Sin asignar</span>}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1208", marginBottom: 8 }}>{task.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {task.assignedTo ? <><Avatar memberId={task.assignedTo} size={22} /><span style={{ fontSize: 12, color: "#666" }}>{member?.name}</span></> : <span style={{ fontSize: 12, color: "#C8963E", fontWeight: 600 }}>HK → Sin asignar</span>}
                        <span style={{ color: st?.color, fontSize: 12, fontWeight: 600 }}>{st?.icon} {st?.label}</span>
                      </div>
                      {(task.startedAt||task.finishedAt) && <div style={{ marginTop: 6, fontSize: 11, color: "#AAA" }}>
                        {task.startedAt && <span>🕐 {formatDate(task.startedAt)}</span>}
                        {task.finishedAt && <span style={{ marginLeft: 8 }}>🏁 {formatDate(task.finishedAt)}</span>}
                      </div>}
                    </div>
                    {task.photo && <img src={task.photo} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />}
                  </div>
                  {task.rejectionReason && <div style={{ marginTop: 8, fontSize: 11, color: "#E05555", background: "#FFF0F0", borderRadius: 6, padding: "4px 8px" }}>⚠ {task.rejectionReason.slice(0,60)}...</div>}
                </div>
              );
            })}
          </div>

          <button onClick={onNewTask} style={{ position: "fixed", bottom: 28, right: 24, width: 56, height: 56, borderRadius: "50%", background: "#C8963E", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", boxShadow: "0 4px 16px rgba(200,150,62,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
        </div>
      )}

      {selectedTask && <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={updated => { onTaskUpdate(updated); setSelectedTask(null); }} onDelete={id => { onTaskDelete(id); setSelectedTask(null); }} currentUser="daniel" />}
    </div>
  );
}

// ─── VISTA OPERARIO / HOUSEKEEPING ────────────────────────────────────────────
function WorkerView({ tasks, memberId, onTaskUpdate, onNewTask }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const isHousekeeping = memberId === "housekeeping";
  const myTasks = isHousekeeping ? tasks.filter(t => t.createdBy === "housekeeping") : tasks.filter(t => t.assignedTo === memberId);
  const member = getMember(memberId);
  const pending = myTasks.filter(t => t.status === "pendiente" || t.status === "en-proceso");
  const done = myTasks.filter(t => t.status === "completada" || t.status === "no-realizada");

  function TaskCard({ task }) {
    const st = STATUS_CONFIG[task.status];
    return (
      <div onClick={() => setSelectedTask(task)} style={{ background: "#fff", borderRadius: 14, padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", cursor: "pointer", borderLeft: `4px solid ${PRIORITY_CONFIG[task.priority]?.color||"#ccc"}`, opacity: (task.status==="completada"||task.status==="no-realizada")?0.7:1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 11, color: "#AAA" }}>{task.sector} · {task.location}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#C8963E", background: "#FFF3DC", borderRadius: 20, padding: "1px 6px" }}>#{task.id}</span>
          {!task.assignedTo && <span style={{ fontSize: 10, color: "#888", background: "#F0EDE8", borderRadius: 20, padding: "1px 6px", fontWeight: 600 }}>Esperando asignación</span>}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1208", marginBottom: 8 }}>{task.title}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Badge type="priority" value={task.priority} />
          <span style={{ color: st?.color, fontSize: 12, fontWeight: 600 }}>{st?.icon} {st?.label}</span>
          {task.photo && <img src={task.photo} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: "cover" }} />}
        </div>
        {(task.startedAt||task.finishedAt) && <div style={{ marginTop: 6, fontSize: 11, color: "#AAA" }}>
          {task.startedAt && <span>🕐 {formatDate(task.startedAt)}</span>}
          {task.finishedAt && <span style={{ marginLeft: 8 }}>🏁 {formatDate(task.finishedAt)}</span>}
        </div>}
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: member.color, borderRadius: 16, padding: "20px", marginBottom: 20, color: "#fff" }}>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>Semana actual</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Hola, {member.name} 👋</div>
        <div style={{ fontSize: 13, marginTop: 8, opacity: 0.9 }}>
          {isHousekeeping ? `${myTasks.length} problema${myTasks.length!==1?"s":""} reportado${myTasks.length!==1?"s":""}` : `${pending.length} tarea${pending.length!==1?"s":""} pendiente${pending.length!==1?"s":""} · ${done.filter(t=>t.status==="completada").length} completada${done.filter(t=>t.status==="completada").length!==1?"s":""}`}
        </div>
      </div>
      {pending.length > 0 && <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#AAA", textTransform: "uppercase", marginBottom: 10 }}>{isHousekeeping ? "Mis reportes" : "Para hacer"}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{pending.map(t => <TaskCard key={t.id} task={t} />)}</div>
      </div>}
      {!isHousekeeping && done.length > 0 && <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#AAA", textTransform: "uppercase", marginBottom: 10 }}>Historial</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{done.map(t => <TaskCard key={t.id} task={t} />)}</div>
      </div>}
      {myTasks.length === 0 && <div style={{ textAlign: "center", padding: "40px 20px", color: "#AAA" }}><div style={{ fontSize: 40 }}>✓</div><div style={{ marginTop: 8, fontWeight: 600 }}>{isHousekeeping ? "Sin problemas reportados" : "Sin tareas asignadas"}</div></div>}
      <button onClick={onNewTask} style={{ position: "fixed", bottom: 28, right: 24, width: 56, height: 56, borderRadius: "50%", background: member.color, border: "none", color: "#fff", fontSize: 28, cursor: "pointer", boxShadow: `0 4px 16px ${member.color}66`, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
      {selectedTask && <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={updated => { onTaskUpdate(updated); setSelectedTask(null); }} onDelete={() => {}} currentUser={memberId} />}
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);

  useEffect(() => {
    sbFetch("GET", "tasks?order=id.asc")
      .then(data => setTasks(data.map(dbToTask)))
      .catch(e => alert("Error cargando tareas: " + e.message))
      .finally(() => setLoading(false));
  }, []);

  function handleTaskUpdate(updated) { setTasks(ts => ts.map(t => t.id === updated.id ? updated : t)); }
  function handleNewTask(task) { setTasks(ts => [...ts, task]); }
  function handleTaskDelete(id) { setTasks(ts => ts.filter(t => t.id !== id)); }

  if (!currentUser) {
    return (
      <div style={{ minHeight: "100vh", background: "#1A1208", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Georgia', serif" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 13, color: "#C8963E", fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>Hotel La Posta del Pilar</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#FDFAF5" }}>Mantenimiento</div>
          <div style={{ fontSize: 14, color: "#888", marginTop: 6 }}>¿Quién sos?</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 320 }}>
          {TEAM.map(m => (
            <button key={m.id} onClick={() => setCurrentUser(m.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "#2A2015", border: "1px solid #3A3020", borderRadius: 14, cursor: "pointer", color: "#FDFAF5" }}>
              <Avatar memberId={m.id} size={40} />
              <div style={{ textAlign: "left" }}><div style={{ fontSize: 16, fontWeight: 700 }}>{m.name}</div><div style={{ fontSize: 12, color: "#888", textTransform: "capitalize" }}>{m.role}</div></div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F5F0E8", fontFamily: "'Georgia', serif" }}>
      <div style={{ background: "#1A1208", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 10, color: "#C8963E", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>La Posta del Pilar</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#FDFAF5" }}>
            {currentUser === "daniel" ? "Panel Supervisor" : "Mis Tareas"}
          </div>
        </div>
        <button onClick={() => setCurrentUser(null)} style={{ background: "transparent", border: "1px solid #3A3020", borderRadius: 20, padding: "6px 14px", color: "#888", fontSize: 12, cursor: "pointer" }}>Salir</button>
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#AAA", fontFamily: "'Georgia', serif" }}>
          <div style={{ fontSize: 30, marginBottom: 12 }}>⟳</div>
          <div>Cargando tareas...</div>
        </div>
      ) : (
        <div style={{ padding: "20px 16px 100px", maxWidth: 480, margin: "0 auto" }}>
          {currentUser === "daniel"
            ? <SupervisorView tasks={tasks} onTaskUpdate={handleTaskUpdate} onTaskDelete={handleTaskDelete} onNewTask={() => setShowNewTask(true)} />
            : <WorkerView tasks={tasks} memberId={currentUser} onTaskUpdate={handleTaskUpdate} onNewTask={() => setShowNewTask(true)} />
          }
        </div>
      )}
      {showNewTask && <NewTaskModal onClose={() => setShowNewTask(false)} onAdd={handleNewTask} currentUser={currentUser} />}
    </div>
  );
}
