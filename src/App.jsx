import { useState } from "react";

// ─── DATOS INICIALES ────────────────────────────────────────────────────────
const TEAM = [
  { id: "daniel", name: "Daniel", role: "supervisor", color: "#C8963E", initials: "DA" },
  { id: "alexis", name: "Alexis", role: "mantenimiento", color: "#4A90A4", initials: "AL" },
  { id: "ezequiel", name: "Ezequiel", role: "mantenimiento", color: "#7B9E5E", initials: "EZ" },
  { id: "raul", name: "Raúl", role: "mantenimiento", color: "#9B6B9B", initials: "RA" },
];

const SECTORS = ["Habitaciones", "SPA", "Exterior / Piletas", "Restaurante", "Recepción", "Cocina", "Administración", "Pasillos", "Aldaba", "General"];

const INITIAL_TASKS = [
  { id: 1, title: "Masillar y pintar paredes", sector: "Habitaciones", location: "Hab. 1", assignedTo: "alexis", priority: "alta", status: "pendiente", week: "2025-W21", notes: "Paredes descascaradas. También arreglar correderas del placard.", photo: null, rejectionReason: null, createdAt: "2025-05-19" },
  { id: 2, title: "Humedad en enchufe", sector: "Habitaciones", location: "Hab. 2", assignedTo: "ezequiel", priority: "alta", status: "pendiente", week: "2025-W21", notes: "Humedad en el enchufe detrás del escritorio. Revisar con precaución.", photo: null, rejectionReason: null, createdAt: "2025-05-19" },
  { id: 3, title: "Pintar techo pileta SPA", sector: "SPA", location: "SPA - Pileta", assignedTo: "raul", priority: "media", status: "pendiente", week: "2025-W21", notes: "", photo: null, rejectionReason: null, createdAt: "2025-05-19" },
  { id: 4, title: "Colocar venecitas pila chica", sector: "Exterior / Piletas", location: "Pileta exterior", assignedTo: "alexis", priority: "baja", status: "pendiente", week: "2025-W21", notes: "", photo: null, rejectionReason: null, createdAt: "2025-05-19" },
  { id: 5, title: "Revisar mesas restaurante", sector: "Restaurante", location: "Salón", assignedTo: "ezequiel", priority: "media", status: "completada", week: "2025-W21", notes: "", photo: "📷", rejectionReason: null, createdAt: "2025-05-19" },
  { id: 6, title: "Techo recepción - entrada de agua", sector: "Recepción", location: "Lobby", assignedTo: "raul", priority: "alta", status: "no-realizada", week: "2025-W21", notes: "Negro, entra agua.", photo: null, rejectionReason: "Falta el material — no llegó el sellador. Se reprograma para la semana que viene.", createdAt: "2025-05-19" },
  { id: 7, title: "Cable canal y tomas corrientes", sector: "Habitaciones", location: "Hab. 27", assignedTo: "alexis", priority: "media", status: "pendiente", week: "2025-W21", notes: "Cambiar tomas, lámparas cálidas x blancas, flor de ducha.", photo: null, rejectionReason: null, createdAt: "2025-05-19" },
  { id: 8, title: "Arreglar filtros pileta", sector: "Exterior / Piletas", location: "Ambas piletas", assignedTo: "daniel", priority: "alta", status: "pendiente", week: "2025-W21", notes: "Revisar ambas piletas.", photo: null, rejectionReason: null, createdAt: "2025-05-19" },
];

// ─── HELPERS ────────────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  alta: { label: "Alta", color: "#E05555", bg: "#FFF0F0" },
  media: { label: "Media", color: "#C8963E", bg: "#FFF8ED" },
  baja: { label: "Baja", color: "#7B9E5E", bg: "#F0F7EC" },
};

const STATUS_CONFIG = {
  pendiente: { label: "Pendiente", icon: "○", color: "#888" },
  "en-proceso": { label: "En proceso", icon: "◐", color: "#C8963E" },
  completada: { label: "Completada", icon: "●", color: "#7B9E5E" },
  "no-realizada": { label: "No realizada", icon: "✕", color: "#E05555" },
};

function getMember(id) { return TEAM.find(m => m.id === id); }

// ─── COMPONENTES PEQUEÑOS ───────────────────────────────────────────────────
function Avatar({ memberId, size = 36 }) {
  const m = getMember(memberId);
  if (!m) return null;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: m.color, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, fontFamily: "inherit", flexShrink: 0,
    }}>{m.initials}</div>
  );
}

function Badge({ type, value }) {
  const cfg = type === "priority" ? PRIORITY_CONFIG[value] : STATUS_CONFIG[value];
  return (
    <span style={{
      background: type === "priority" ? cfg.bg : "transparent",
      color: cfg.color,
      border: `1px solid ${cfg.color}30`,
      borderRadius: 20, padding: "2px 10px",
      fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
    }}>{cfg.label}</span>
  );
}

// ─── MODAL: DETALLE DE TAREA ─────────────────────────────────────────────────
function TaskModal({ task, onClose, onUpdate, currentUser }) {
  const [status, setStatus] = useState(task.status);
  const [reason, setReason] = useState(task.rejectionReason || "");
  const [photoAdded, setPhotoAdded] = useState(!!task.photo);
  const [saving, setSaving] = useState(false);

  const canEdit = currentUser === task.assignedTo || currentUser === "daniel";
  const member = getMember(task.assignedTo);

  function handleSave() {
    if (status === "no-realizada" && !reason.trim()) {
      alert("Por favor indicá el motivo por el que no se realizó.");
      return;
    }
    if (status === "completada" && !photoAdded) {
      alert("Por favor cargá una foto como comprobante.");
      return;
    }
    setSaving(true);
    setTimeout(() => {
      onUpdate({ ...task, status, rejectionReason: reason, photo: photoAdded ? "📷" : null });
      setSaving(false);
      onClose();
    }, 600);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(10,8,5,0.75)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      zIndex: 100, backdropFilter: "blur(4px)",
    }} onClick={onClose}>
      <div style={{
        background: "#FDFAF5", borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: 480, maxHeight: "90vh",
        overflowY: "auto", padding: "28px 24px 40px",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
      }} onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div style={{ width: 40, height: 4, background: "#DDD", borderRadius: 2, margin: "0 auto 20px" }} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            <div style={{ fontSize: 11, color: "#999", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
              {task.sector} · {task.location}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1A1208", lineHeight: 1.2 }}>{task.title}</div>
          </div>
          <button onClick={onClose} style={{ background: "#F0EDE8", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#666" }}>✕</button>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <Badge type="priority" value={task.priority} />
          <Badge type="status" value={status} />
        </div>

        {/* Asignado a */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#F5F0E8", borderRadius: 12, marginBottom: 16 }}>
          <Avatar memberId={task.assignedTo} size={32} />
          <div>
            <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: 0.8 }}>Asignado a</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1208" }}>{member?.name}</div>
          </div>
        </div>

        {/* Notas */}
        {task.notes && (
          <div style={{ background: "#F5F0E8", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#555", lineHeight: 1.5 }}>
            {task.notes}
          </div>
        )}

        {/* Acciones (solo si puede editar) */}
        {canEdit && (
          <div style={{ borderTop: "1px solid #EEE8DC", paddingTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Actualizar estado</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {["en-proceso", "completada", "no-realizada"].map(s => (
                <button key={s} onClick={() => setStatus(s)} style={{
                  padding: "8px 14px", borderRadius: 20, border: "2px solid",
                  borderColor: status === s ? STATUS_CONFIG[s].color : "#DDD",
                  background: status === s ? STATUS_CONFIG[s].color + "18" : "#fff",
                  color: status === s ? STATUS_CONFIG[s].color : "#888",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>

            {status === "no-realizada" && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#E05555", marginBottom: 6 }}>¿Por qué no se realizó? *</div>
                <textarea value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Ej: Falta material, esperando repuesto, problema de acceso..."
                  style={{ width: "100%", minHeight: 80, border: "1.5px solid #E0D8CC", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", resize: "none", background: "#FFF9F5", boxSizing: "border-box" }} />
              </div>
            )}

            {status === "completada" && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#7B9E5E", marginBottom: 6 }}>Foto comprobante *</div>
                <button onClick={() => setPhotoAdded(!photoAdded)} style={{
                  width: "100%", padding: "14px", border: "2px dashed",
                  borderColor: photoAdded ? "#7B9E5E" : "#CCC",
                  borderRadius: 12, background: photoAdded ? "#F0F7EC" : "#FAFAFA",
                  color: photoAdded ? "#7B9E5E" : "#AAA",
                  fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                }}>
                  {photoAdded ? "✓ Foto cargada (simulado)" : "📷 Toca para subir foto"}
                </button>
              </div>
            )}

            <button onClick={handleSave} disabled={saving} style={{
              width: "100%", padding: "14px", background: saving ? "#CCC" : "#1A1208",
              color: "#fff", border: "none", borderRadius: 12,
              fontSize: 15, fontWeight: 700, cursor: saving ? "default" : "pointer",
              letterSpacing: 0.5,
            }}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        )}

        {/* Motivo ya registrado */}
        {!canEdit && task.rejectionReason && (
          <div style={{ background: "#FFF0F0", border: "1px solid #FFCCCC", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#C0392B" }}>
            <strong>Motivo:</strong> {task.rejectionReason}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MODAL: NUEVA TAREA ──────────────────────────────────────────────────────
function NewTaskModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ title: "", sector: "Habitaciones", location: "", assignedTo: "alexis", priority: "media", notes: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handleAdd() {
    if (!form.title.trim()) { alert("Ingresá el título de la tarea"); return; }
    onAdd({ ...form, id: Date.now(), status: "pendiente", week: "2025-W21", photo: null, rejectionReason: null, createdAt: new Date().toISOString().slice(0, 10) });
    onClose();
  }

  const inputStyle = { width: "100%", border: "1.5px solid #E0D8CC", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", background: "#FDFAF5", boxSizing: "border-box" };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 5 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,8,5,0.75)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: "#FDFAF5", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", padding: "28px 24px 40px" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: "#DDD", borderRadius: 2, margin: "0 auto 20px" }} />
        <div style={{ fontSize: 20, fontWeight: 800, color: "#1A1208", marginBottom: 24 }}>Nueva tarea</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Título *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Ej: Pintar paredes hab. 5" style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Sector</label>
              <select value={form.sector} onChange={e => set("sector", e.target.value)} style={inputStyle}>
                {SECTORS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Ubicación</label>
              <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Ej: Hab. 12" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Asignar a</label>
              <select value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)} style={inputStyle}>
                {TEAM.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Prioridad</label>
              <select value={form.priority} onChange={e => set("priority", e.target.value)} style={inputStyle}>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Notas</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Detalles adicionales..." style={{ ...inputStyle, minHeight: 70, resize: "none" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 14, background: "#F0EDE8", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#666" }}>Cancelar</button>
          <button onClick={handleAdd} style={{ flex: 2, padding: 14, background: "#1A1208", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#fff" }}>Agregar tarea</button>
        </div>
      </div>
    </div>
  );
}

// ─── VISTA: TABLERO SUPERVISOR ───────────────────────────────────────────────
function SupervisorView({ tasks, onTaskUpdate, onNewTask }) {
  const [filter, setFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState(null);

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.assignedTo === filter || t.status === filter);

  const stats = {
    total: tasks.length,
    completadas: tasks.filter(t => t.status === "completada").length,
    pendientes: tasks.filter(t => t.status === "pendiente").length,
    noRealizadas: tasks.filter(t => t.status === "no-realizada").length,
  };

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
        {[
          { label: "Total", value: stats.total, color: "#1A1208" },
          { label: "Listas", value: stats.completadas, color: "#7B9E5E" },
          { label: "Pend.", value: stats.pendientes, color: "#C8963E" },
          { label: "No real.", value: stats.noRealizadas, color: "#E05555" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "12px 8px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#999", fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 16 }}>
        {[{ id: "all", label: "Todos" }, ...TEAM.map(m => ({ id: m.id, label: m.name })), { id: "no-realizada", label: "⚠ Sin hacer" }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: "6px 14px", borderRadius: 20, border: "1.5px solid",
            borderColor: filter === f.id ? "#1A1208" : "#E0D8CC",
            background: filter === f.id ? "#1A1208" : "#fff",
            color: filter === f.id ? "#fff" : "#666",
            fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
          }}>{f.label}</button>
        ))}
      </div>

      {/* Lista de tareas */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(task => {
          const member = getMember(task.assignedTo);
          const st = STATUS_CONFIG[task.status];
          return (
            <div key={task.id} onClick={() => setSelectedTask(task)} style={{
              background: "#fff", borderRadius: 14, padding: "14px 16px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)", cursor: "pointer",
              borderLeft: `4px solid ${PRIORITY_CONFIG[task.priority].color}`,
              transition: "transform 0.1s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#AAA", marginBottom: 3 }}>{task.sector} · {task.location}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1208", marginBottom: 8, lineHeight: 1.2 }}>{task.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar memberId={task.assignedTo} size={22} />
                    <span style={{ fontSize: 12, color: "#666" }}>{member?.name}</span>
                    <span style={{ color: st.color, fontSize: 12, fontWeight: 600 }}>{st.icon} {st.label}</span>
                  </div>
                </div>
                {task.photo && <div style={{ fontSize: 20 }}>📷</div>}
              </div>
              {task.rejectionReason && (
                <div style={{ marginTop: 8, fontSize: 11, color: "#E05555", background: "#FFF0F0", borderRadius: 6, padding: "4px 8px" }}>
                  ⚠ {task.rejectionReason.slice(0, 60)}...
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <button onClick={onNewTask} style={{
        position: "fixed", bottom: 28, right: 24,
        width: 56, height: 56, borderRadius: "50%",
        background: "#C8963E", border: "none", color: "#fff",
        fontSize: 28, cursor: "pointer", boxShadow: "0 4px 16px rgba(200,150,62,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>+</button>

      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)}
          onUpdate={updated => { onTaskUpdate(updated); setSelectedTask(null); }}
          currentUser="daniel" />
      )}
    </div>
  );
}

// ─── VISTA: OPERARIO ────────────────────────────────────────────────────────
function WorkerView({ tasks, memberId, onTaskUpdate }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const myTasks = tasks.filter(t => t.assignedTo === memberId);
  const member = getMember(memberId);

  const pending = myTasks.filter(t => t.status === "pendiente" || t.status === "en-proceso");
  const done = myTasks.filter(t => t.status === "completada" || t.status === "no-realizada");

  function TaskCard({ task }) {
    const st = STATUS_CONFIG[task.status];
    return (
      <div onClick={() => setSelectedTask(task)} style={{
        background: "#fff", borderRadius: 14, padding: "16px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)", cursor: "pointer",
        borderLeft: `4px solid ${PRIORITY_CONFIG[task.priority].color}`,
        opacity: task.status === "completada" || task.status === "no-realizada" ? 0.7 : 1,
      }}>
        <div style={{ fontSize: 11, color: "#AAA", marginBottom: 3 }}>{task.sector} · {task.location}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1208", marginBottom: 8, lineHeight: 1.2 }}>{task.title}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Badge type="priority" value={task.priority} />
          <span style={{ color: st.color, fontSize: 12, fontWeight: 600 }}>{st.icon} {st.label}</span>
          {task.photo && <span>📷</span>}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Bienvenida */}
      <div style={{ background: member.color, borderRadius: 16, padding: "20px", marginBottom: 20, color: "#fff" }}>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>Semana del 19 al 25 de mayo</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Hola, {member.name} 👋</div>
        <div style={{ fontSize: 13, marginTop: 8, opacity: 0.9 }}>
          {pending.length} tarea{pending.length !== 1 ? "s" : ""} pendiente{pending.length !== 1 ? "s" : ""} · {done.filter(t => t.status === "completada").length} completada{done.filter(t => t.status === "completada").length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Pendientes */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Para hacer</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pending.map(t => <TaskCard key={t.id} task={t} />)}
          </div>
        </div>
      )}

      {/* Completadas */}
      {done.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Historial esta semana</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {done.map(t => <TaskCard key={t.id} task={t} />)}
          </div>
        </div>
      )}

      {myTasks.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#AAA" }}>
          <div style={{ fontSize: 40 }}>✓</div>
          <div style={{ marginTop: 8, fontWeight: 600 }}>Sin tareas asignadas esta semana</div>
        </div>
      )}

      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)}
          onUpdate={updated => { onTaskUpdate(updated); setSelectedTask(null); }}
          currentUser={memberId} />
      )}
    </div>
  );
}

// ─── APP PRINCIPAL ───────────────────────────────────────────────────────────
export default function App() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [currentUser, setCurrentUser] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);

  function handleTaskUpdate(updated) {
    setTasks(ts => ts.map(t => t.id === updated.id ? updated : t));
  }

  function handleNewTask(task) {
    setTasks(ts => [...ts, task]);
  }

  // ── Login Screen ──
  if (!currentUser) {
    return (
      <div style={{
        minHeight: "100vh", background: "#1A1208",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "24px", fontFamily: "'Georgia', serif",
      }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 13, color: "#C8963E", fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>Hotel La Posta del Pilar</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#FDFAF5", lineHeight: 1.1 }}>Mantenimiento</div>
          <div style={{ fontSize: 14, color: "#888", marginTop: 6 }}>¿Quién sos?</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 320 }}>
          {TEAM.map(m => (
            <button key={m.id} onClick={() => setCurrentUser(m.id)} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "16px 20px", background: "#2A2015",
              border: "1px solid #3A3020", borderRadius: 14,
              cursor: "pointer", color: "#FDFAF5",
              transition: "all 0.15s",
            }}>
              <Avatar memberId={m.id} size={40} />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "#888", textTransform: "capitalize" }}>{m.role}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Main App ──
  const member = getMember(currentUser);
  return (
    <div style={{ minHeight: "100vh", background: "#F5F0E8", fontFamily: "'Georgia', serif" }}>
      {/* Header */}
      <div style={{ background: "#1A1208", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 10, color: "#C8963E", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>La Posta del Pilar</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#FDFAF5" }}>
            {currentUser === "daniel" ? "Panel Supervisor" : "Mis Tareas"}
          </div>
        </div>
        <button onClick={() => setCurrentUser(null)} style={{ background: "transparent", border: "1px solid #3A3020", borderRadius: 20, padding: "6px 14px", color: "#888", fontSize: 12, cursor: "pointer" }}>
          Salir
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 16px 100px", maxWidth: 480, margin: "0 auto" }}>
        {currentUser === "daniel"
          ? <SupervisorView tasks={tasks} onTaskUpdate={handleTaskUpdate} onNewTask={() => setShowNewTask(true)} />
          : <WorkerView tasks={tasks} memberId={currentUser} onTaskUpdate={handleTaskUpdate} />
        }
      </div>

      {showNewTask && (
        <NewTaskModal onClose={() => setShowNewTask(false)} onAdd={handleNewTask} />
      )}
    </div>
  );
}
