import { useState, useEffect } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const STORAGE_KEY = "duetto-app-v1";

const BRAND = {
  primary: "#63d3ac",
  secondary: "#a78bfa",
  danger: "#f87171",
  bg: "#07090f",
  surface: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  text: "#e2e8f0",
  muted: "#64748b",
};

const defaultData = {
  transactions: [
    { id: 1, type: "entrada", desc: "Salário Anderson", value: 5000, category: "Salário", date: "2026-04-05", user: "Anderson" },
    { id: 2, type: "entrada", desc: "Salário Bruna", value: 4200, category: "Salário", date: "2026-04-05", user: "Bruna" },
    { id: 3, type: "saida", desc: "Aluguel", value: 1800, category: "Moradia", date: "2026-04-07", user: "Anderson" },
    { id: 4, type: "saida", desc: "Mercado", value: 650, category: "Alimentação", date: "2026-04-10", user: "Bruna" },
    { id: 5, type: "saida", desc: "Conta de Luz", value: 180, category: "Contas", date: "2026-04-12", user: "Anderson" },
    { id: 6, type: "saida", desc: "Cinema", value: 120, category: "Lazer", date: "2026-04-14", user: "Bruna" },
    { id: 7, type: "saida", desc: "Farmácia", value: 95, category: "Saúde", date: "2026-04-16", user: "Anderson" },
    { id: 8, type: "entrada", desc: "Freelance", value: 800, category: "Extra", date: "2026-04-18", user: "Bruna" },
    { id: 9, type: "saida", desc: "Restaurante", value: 210, category: "Alimentação", date: "2026-04-20", user: "Anderson" },
    { id: 10, type: "saida", desc: "Netflix/Streaming", value: 75, category: "Lazer", date: "2026-04-22", user: "Bruna" },
  ],
  goals: [
    { id: 1, name: "Viagem de Férias", target: 8000, current: 2500, deadline: "2026-12-01", color: "#63d3ac" },
    { id: 2, name: "Reserva de Emergência", target: 20000, current: 7800, deadline: "2027-06-01", color: "#a78bfa" },
    { id: 3, name: "Entrada do Apartamento", target: 60000, current: 12000, deadline: "2028-01-01", color: "#f9a54a" },
  ],
};

const CATEGORIES = ["Salário", "Extra", "Moradia", "Alimentação", "Contas", "Lazer", "Saúde", "Transporte", "Educação", "Outros"];
const USERS = ["João", "Maria"];
const CAT_COLORS = {
  Salário: "#63d3ac", Extra: "#a78bfa", Moradia: "#f87171", Alimentação: "#fb923c",
  Contas: "#facc15", Lazer: "#4ade80", Saúde: "#f472b6", Transporte: "#60a5fa",
  Educação: "#818cf8", Outros: "#94a3b8",
};

// ─── AI Advisor ──────────────────────────────────────────────────────────────
function AIAdvisor({ transactions, goals }) {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState("analysis");
  const [chatHistory, setChatHistory] = useState([]);

  const totalIn = transactions.filter(t => t.type === "entrada").reduce((s, t) => s + t.value, 0);
  const totalOut = transactions.filter(t => t.type === "saida").reduce((s, t) => s + t.value, 0);
  const balance = totalIn - totalOut;

  async function runAnalysis() {
    setLoading(true);
    setAnalysis("");
    const categorias = Object.entries(
      transactions.filter(t => t.type === "saida").reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.value; return acc;
      }, {})
    ).map(([c, v]) => `${c}: R$${v}`).join(", ");

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Você é a consultora financeira do app Duetto — um app de finanças para casais brasileiros. Analise os dados abaixo e forneça orientações práticas. Use emojis, seja direto e amigável.

DADOS DO CASAL (Duetto):
- Entradas: R$ ${totalIn.toLocaleString('pt-BR')}
- Saídas: R$ ${totalOut.toLocaleString('pt-BR')}
- Saldo: R$ ${balance.toLocaleString('pt-BR')}
- Gastos por categoria: ${categorias}
- Metas: ${goals.map(g => `${g.name} (${Math.round((g.current/g.target)*100)}%)`).join(", ")}

Forneça:
1. Avaliação do momento financeiro do casal (2-3 linhas)
2. Os 3 principais pontos de atenção
3. 3 dicas práticas de investimento para o perfil deles
4. Uma dica especial para casais que planejam finanças juntos`
          }],
        }),
      });
      const data = await res.json();
      setAnalysis(data.content[0].text);
    } catch {
      setAnalysis("❌ Não foi possível conectar. Verifique sua conexão.");
    }
    setLoading(false);
  }

  async function askQuestion() {
    if (!question.trim()) return;
    const newHistory = [...chatHistory, { role: "user", content: question }];
    setChatHistory(newHistory);
    setQuestion("");
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 600,
          system: `Você é a consultora financeira do Duetto, app de finanças para casais. O casal tem: Entradas R$${totalIn}, Saídas R$${totalOut}, Saldo R$${balance}. Responda em português, de forma prática, com emojis.`,
          messages: newHistory,
        }),
      });
      const data = await res.json();
      setChatHistory([...newHistory, { role: "assistant", content: data.content[0].text }]);
    } catch {
      setChatHistory([...newHistory, { role: "assistant", content: "❌ Erro ao conectar. Tente novamente." }]);
    }
    setLoading(false);
  }

  const btnBase = { padding: "8px 20px", borderRadius: 20, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 13, transition: "all 0.2s" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {[["analysis", "📊 Análise IA"], ["chat", "💬 Perguntar"]].map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)} style={{
            ...btnBase,
            background: mode === m ? BRAND.primary : "rgba(255,255,255,0.07)",
            color: mode === m ? "#07090f" : BRAND.muted,
          }}>{label}</button>
        ))}
      </div>

      {mode === "analysis" && (
        <div>
          <button onClick={runAnalysis} disabled={loading} style={{
            width: "100%", padding: 14, borderRadius: 12, border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            background: loading ? "rgba(99,211,172,0.2)" : `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})`,
            color: "#07090f", fontWeight: 700, fontSize: 15, fontFamily: "inherit", marginBottom: 16,
          }}>
            {loading ? "🔄 Analisando suas finanças..." : "✨ Analisar com Inteligência Artificial"}
          </button>
          {analysis && (
            <div style={{
              background: "rgba(99,211,172,0.04)", border: "1px solid rgba(99,211,172,0.15)",
              borderRadius: 12, padding: 20, color: "#cbd5e1", lineHeight: 1.8, fontSize: 14, whiteSpace: "pre-wrap",
            }}>
              {analysis}
            </div>
          )}
        </div>
      )}

      {mode === "chat" && (
        <div>
          <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
            {chatHistory.length === 0 && (
              <div style={{ color: BRAND.muted, fontSize: 13, textAlign: "center", padding: 24, lineHeight: 1.8 }}>
                💡 Pergunte qualquer coisa sobre suas finanças!<br />
                <span style={{ fontSize: 12 }}>Ex: "Como investir R$500/mês?" • "Estamos gastando demais?"</span>
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} style={{
                padding: "10px 14px", borderRadius: 12, maxWidth: "88%", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap",
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                background: msg.role === "user" ? "rgba(99,211,172,0.1)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${msg.role === "user" ? "rgba(99,211,172,0.25)" : "rgba(255,255,255,0.08)"}`,
                color: "#e2e8f0",
              }}>{msg.content}</div>
            ))}
            {loading && <div style={{ color: BRAND.muted, fontSize: 13 }}>🔄 Consultora Duetto digitando...</div>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={question} onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && askQuestion()}
              placeholder="Faça uma pergunta financeira..."
              style={{
                flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontFamily: "inherit", fontSize: 14, outline: "none",
              }}
            />
            <button onClick={askQuestion} disabled={loading} style={{
              padding: "10px 18px", borderRadius: 10, border: "none", cursor: "pointer",
              background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})`,
              color: "#07090f", fontWeight: 700, fontSize: 16,
            }}>→</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Duetto() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [activeUser, setActiveUser] = useState("João");
  const [showForm, setShowForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [notification, setNotification] = useState(null);
  const [form, setForm] = useState({ type: "saida", desc: "", value: "", category: "Alimentação", date: new Date().toISOString().slice(0, 10) });
  const [goalForm, setGoalForm] = useState({ name: "", target: "", current: "", deadline: "", color: "#63d3ac" });

  useEffect(() => {
    async function load() {
      try {
        const r = await window.storage.get(STORAGE_KEY, true);
        setData(r ? JSON.parse(r.value) : defaultData);
      } catch { setData(defaultData); }
    }
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  async function save(d) {
    setData(d);
    try { await window.storage.set(STORAGE_KEY, JSON.stringify(d), true); } catch { }
  }

  function notify(msg, type = "success") {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }

  function addTransaction() {
    if (!form.desc || !form.value) return notify("Preencha todos os campos!", "error");
    const tx = { id: Date.now(), ...form, value: parseFloat(form.value), user: activeUser };
    save({ ...data, transactions: [...data.transactions, tx] });
    setShowForm(false);
    setForm({ type: "saida", desc: "", value: "", category: "Alimentação", date: new Date().toISOString().slice(0, 10) });
    notify("✅ Lançamento adicionado!");
  }

  function deleteTransaction(id) {
    save({ ...data, transactions: data.transactions.filter(t => t.id !== id) });
    notify("🗑️ Removido!");
  }

  function addGoal() {
    if (!goalForm.name || !goalForm.target) return notify("Preencha todos os campos!", "error");
    const goal = { id: Date.now(), ...goalForm, target: parseFloat(goalForm.target), current: parseFloat(goalForm.current || 0) };
    save({ ...data, goals: [...data.goals, goal] });
    setShowGoalForm(false);
    setGoalForm({ name: "", target: "", current: "", deadline: "", color: "#63d3ac" });
    notify("🎯 Meta criada!");
  }

  function addToGoal(id, amount) {
    const goals = data.goals.map(g => g.id === id ? { ...g, current: Math.min(g.target, g.current + amount) } : g);
    save({ ...data, goals });
    notify("💰 Meta atualizada!");
  }

  if (!data) return (
    <div style={{ minHeight: "100vh", background: BRAND.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 40, fontWeight: 700, background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Duetto</div>
      <div style={{ color: BRAND.muted, fontSize: 13 }}>Carregando suas finanças...</div>
    </div>
  );

  const totalIn = data.transactions.filter(t => t.type === "entrada").reduce((s, t) => s + t.value, 0);
  const totalOut = data.transactions.filter(t => t.type === "saida").reduce((s, t) => s + t.value, 0);
  const balance = totalIn - totalOut;
  const savingsRate = totalIn > 0 ? Math.max(0, Math.round((balance / totalIn) * 100)) : 0;

  const byCategory = Object.entries(
    data.transactions.filter(t => t.type === "saida").reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.value; return acc;
    }, {})
  ).map(([name, value]) => ({ name, value, color: CAT_COLORS[name] || "#94a3b8" }));

  const byUser = USERS.map(u => ({
    name: u,
    Entradas: data.transactions.filter(t => t.user === u && t.type === "entrada").reduce((s, t) => s + t.value, 0),
    Saídas: data.transactions.filter(t => t.user === u && t.type === "saida").reduce((s, t) => s + t.value, 0),
  }));

  const monthlyFlow = (() => {
    const m = {};
    data.transactions.forEach(t => {
      const k = t.date.slice(0, 7);
      if (!m[k]) m[k] = { month: k.slice(5) + "/" + k.slice(2, 4), Entradas: 0, Saídas: 0 };
      if (t.type === "entrada") m[k].Entradas += t.value;
      else m[k].Saídas += t.value;
    });
    return Object.values(m).sort((a, b) => a.month.localeCompare(b.month));
  })();

  const sorted = [...data.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  // ─── Styles ──────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${BRAND.bg}; }
    ::-webkit-scrollbar { width: 3px; height: 3px; }
    ::-webkit-scrollbar-thumb { background: rgba(99,211,172,0.25); border-radius: 4px; }
    input, select { font-family: 'DM Sans', sans-serif; }
    input::placeholder { color: #334155; }
    input:focus, select:focus { outline: none !important; border-color: rgba(99,211,172,0.4) !important; box-shadow: 0 0 0 3px rgba(99,211,172,0.06); }
    @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
    @keyframes glow { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
    @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
    .duetto-wordmark {
      font-family: 'Cormorant Garamond', serif;
      font-weight: 700;
      font-size: 26px;
      line-height: 1;
      background: linear-gradient(110deg, #63d3ac 0%, #a78bfa 50%, #63d3ac 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 5s linear infinite;
      letter-spacing: -0.3px;
    }
    .card { background: ${BRAND.surface}; border: 1px solid ${BRAND.border}; border-radius: 16px; padding: 20px; animation: fadeUp 0.35s ease; }
    .card-hover:hover { background: rgba(255,255,255,0.06); border-color: rgba(99,211,172,0.15); transition: all 0.2s; }
    .btn-primary { background: linear-gradient(135deg, #63d3ac, #a78bfa); color: #07090f; border: none; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: opacity 0.2s; border-radius: 10px; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-ghost { background: rgba(255,255,255,0.05); color: #94a3b8; border: 1px solid rgba(255,255,255,0.08); cursor: pointer; font-family: 'DM Sans', sans-serif; border-radius: 8px; transition: all 0.2s; }
    .btn-ghost:hover { background: rgba(255,255,255,0.09); color: #e2e8f0; }
  `;

  const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: 14, width: "100%", transition: "all 0.2s" };
  const labelStyle = { color: "#475569", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, display: "block" };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "◈" },
    { id: "transactions", label: "Lançamentos", icon: "⇅" },
    { id: "goals", label: "Metas", icon: "◎" },
    { id: "ai", label: "IA Duetto", icon: "✦" },
  ];

  const tooltipStyle = { contentStyle: { background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e2e8f0", fontSize: 12 }, formatter: v => `R$ ${v.toLocaleString("pt-BR")}` };

  return (
    <div style={{ minHeight: "100vh", background: BRAND.bg, fontFamily: "'DM Sans', sans-serif", color: BRAND.text, paddingBottom: 80 }}>
      <style>{css}</style>

      {/* Notification */}
      {notification && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: notification.type === "error" ? "#ef4444" : BRAND.primary,
          color: notification.type === "error" ? "#fff" : "#07090f",
          padding: "12px 20px", borderRadius: 12, fontWeight: 600, fontSize: 14,
          animation: "slideIn 0.3s ease", boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
        }}>{notification.msg}</div>
      )}

      {/* ─── Header ─── */}
      <header style={{
        background: "rgba(7,9,15,0.85)", backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(99,211,172,0.08)",
        padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Logo mark: two overlapping circles = "duo" */}
          <svg width="36" height="36" viewBox="0 0 36 36">
            <defs>
              <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#63d3ac" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <circle cx="13" cy="18" r="9" fill="none" stroke="#63d3ac" strokeWidth="1.5" opacity="0.9" />
            <circle cx="23" cy="18" r="9" fill="none" stroke="#a78bfa" strokeWidth="1.5" opacity="0.9" />
            <path d="M18 11.2 A9 9 0 0 1 18 24.8 A9 9 0 0 1 18 11.2Z" fill="url(#lg1)" opacity="0.25" />
          </svg>
          <div>
            <div className="duetto-wordmark">Duetto</div>
            <div style={{ color: "#334155", fontSize: 9.5, letterSpacing: "0.14em", fontWeight: 600, marginTop: 1 }}>FINANÇAS EM HARMONIA</div>
          </div>
        </div>

        {/* User switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: BRAND.muted }}>Logado como</span>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 22, padding: 3, border: "1px solid rgba(255,255,255,0.07)" }}>
            {USERS.map(u => (
              <button key={u} onClick={() => setActiveUser(u)} style={{
                padding: "5px 14px", borderRadius: 18, border: "none", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13,
                background: activeUser === u ? `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})` : "transparent",
                color: activeUser === u ? "#07090f" : BRAND.muted,
                transition: "all 0.25s",
              }}>{u}</button>
            ))}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px" }}>

        {/* ─── Tabs ─── */}
        <div style={{ display: "flex", gap: 2, marginBottom: 28, background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 3, border: "1px solid rgba(255,255,255,0.06)" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "10px 6px", borderRadius: 10, border: "none", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 12,
              background: tab === t.id ? "rgba(99,211,172,0.12)" : "transparent",
              color: tab === t.id ? BRAND.primary : "#475569",
              borderBottom: tab === t.id ? `2px solid ${BRAND.primary}` : "2px solid transparent",
              transition: "all 0.2s",
            }}>
              <span style={{ marginRight: 5, fontSize: 14 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════
            DASHBOARD
        ════════════════════════════════════════ */}
        {tab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeUp 0.35s ease" }}>

            {/* KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {[
                { label: "Entradas", value: totalIn, color: BRAND.primary, sign: "+" },
                { label: "Saídas", value: totalOut, color: BRAND.danger, sign: "-" },
                { label: "Saldo", value: balance, color: balance >= 0 ? "#34d399" : BRAND.danger, sign: "" },
              ].map((k, i) => (
                <div key={i} className="card" style={{ borderLeft: `3px solid ${k.color}`, padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: k.color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 700, color: "#f1f5f9" }}>
                    {k.sign}R${k.value.toLocaleString("pt-BR")}
                  </div>
                </div>
              ))}
            </div>

            {/* Monthly Flow */}
            <div className="card">
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: "#f1f5f9", marginBottom: 16 }}>Fluxo Mensal</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyFlow} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} width={60} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="Entradas" fill={BRAND.primary} radius={[4,4,0,0]} opacity={0.9} />
                  <Bar dataKey="Saídas" fill={BRAND.danger} radius={[4,4,0,0]} opacity={0.9} />
                  <Legend wrapperStyle={{ color: "#64748b", fontSize: 12, paddingTop: 8 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie + By Person */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="card">
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: "#f1f5f9", marginBottom: 14 }}>Gastos por Categoria</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={byCategory} cx="50%" cy="50%" outerRadius={65} innerRadius={30} dataKey="value" paddingAngle={2}>
                      {byCategory.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {byCategory.map((c, i) => (
                    <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#64748b" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, display: "inline-block" }} />{c.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: "#f1f5f9", marginBottom: 14 }}>Por Pessoa</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={byUser} layout="vertical" barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} width={42} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="Entradas" fill={BRAND.primary} radius={[0,4,4,0]} />
                    <Bar dataKey="Saídas" fill={BRAND.danger} radius={[0,4,4,0]} />
                    <Legend wrapperStyle={{ color: "#64748b", fontSize: 11 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Goals preview */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: "#f1f5f9" }}>Metas do Casal</h3>
                <span style={{ fontSize: 11, color: BRAND.muted }}>Taxa de poupança: <strong style={{ color: savingsRate >= 20 ? BRAND.primary : "#facc15" }}>{savingsRate}%</strong></span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {data.goals.map(g => {
                  const pct = Math.min(100, Math.round((g.current / g.target) * 100));
                  return (
                    <div key={g.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>{g.name}</span>
                        <span style={{ color: g.color, fontWeight: 700, fontSize: 13 }}>{pct}%</span>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, height: 6, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${g.color}66, ${g.color})`, borderRadius: 6, transition: "width 0.6s ease" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: BRAND.muted }}>R${g.current.toLocaleString("pt-BR")}</span>
                        <span style={{ fontSize: 11, color: BRAND.muted }}>R${g.target.toLocaleString("pt-BR")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            LANÇAMENTOS
        ════════════════════════════════════════ */}
        {tab === "transactions" && (
          <div style={{ animation: "fadeUp 0.35s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: "#f1f5f9" }}>Lançamentos</h2>
              <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ padding: "10px 20px", fontSize: 13 }}>
                {showForm ? "✕ Fechar" : "+ Novo Lançamento"}
              </button>
            </div>

            {showForm && (
              <div className="card" style={{ marginBottom: 16, borderColor: "rgba(99,211,172,0.2)" }}>
                <p style={{ fontSize: 12, color: BRAND.muted, marginBottom: 14 }}>
                  Lançando como <strong style={{ color: BRAND.primary }}>{activeUser}</strong>
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={labelStyle}>Tipo</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                      <option value="entrada">↑ Entrada</option>
                      <option value="saida">↓ Saída</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Categoria</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Descrição</label>
                    <input value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} placeholder="Ex: Mercado, Salário..." style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Valor (R$)</label>
                    <input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="0,00" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Data</label>
                    <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
                  </div>
                </div>
                <button className="btn-primary" onClick={addTransaction} style={{ padding: "12px 24px", fontSize: 14 }}>
                  ✓ Salvar Lançamento
                </button>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sorted.map(t => (
                <div key={t.id} className="card card-hover" style={{
                  padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
                  borderLeft: `3px solid ${t.type === "entrada" ? BRAND.primary : BRAND.danger}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                      background: t.type === "entrada" ? "rgba(99,211,172,0.1)" : "rgba(248,113,113,0.1)",
                    }}>
                      {t.type === "entrada" ? "↑" : "↓"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{t.desc}</div>
                      <div style={{ fontSize: 11, color: BRAND.muted, marginTop: 2 }}>
                        <span style={{ color: CAT_COLORS[t.category] || "#94a3b8" }}>●</span> {t.category} &nbsp;•&nbsp; {t.date} &nbsp;•&nbsp;
                        <span style={{ color: BRAND.secondary }}>{t.user}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 700, color: t.type === "entrada" ? BRAND.primary : BRAND.danger }}>
                      {t.type === "entrada" ? "+" : "−"} R${t.value.toLocaleString("pt-BR")}
                    </span>
                    <button onClick={() => deleteTransaction(t.id)} className="btn-ghost" style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, padding: 0, color: BRAND.danger, borderColor: "rgba(248,113,113,0.2)" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            METAS
        ════════════════════════════════════════ */}
        {tab === "goals" && (
          <div style={{ animation: "fadeUp 0.35s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: "#f1f5f9" }}>Metas do Casal</h2>
              <button className="btn-primary" onClick={() => setShowGoalForm(!showGoalForm)} style={{ padding: "10px 20px", fontSize: 13 }}>
                {showGoalForm ? "✕ Fechar" : "+ Nova Meta"}
              </button>
            </div>

            {showGoalForm && (
              <div className="card" style={{ marginBottom: 16, borderColor: "rgba(99,211,172,0.2)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div><label style={labelStyle}>Nome da Meta</label><input value={goalForm.name} onChange={e => setGoalForm({ ...goalForm, name: e.target.value })} placeholder="Ex: Viagem Europa" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Valor Alvo (R$)</label><input type="number" value={goalForm.target} onChange={e => setGoalForm({ ...goalForm, target: e.target.value })} placeholder="0" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Já Guardado (R$)</label><input type="number" value={goalForm.current} onChange={e => setGoalForm({ ...goalForm, current: e.target.value })} placeholder="0" style={inputStyle} /></div>
                  <div><label style={labelStyle}>Prazo</label><input type="date" value={goalForm.deadline} onChange={e => setGoalForm({ ...goalForm, deadline: e.target.value })} style={inputStyle} /></div>
                  <div>
                    <label style={labelStyle}>Cor</label>
                    <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                      {["#63d3ac", "#a78bfa", "#f9a54a", "#f472b6", "#60a5fa", "#facc15"].map(c => (
                        <div key={c} onClick={() => setGoalForm({ ...goalForm, color: c })} style={{
                          width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer",
                          border: goalForm.color === c ? "3px solid #fff" : "2px solid transparent",
                          transition: "all 0.2s",
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
                <button className="btn-primary" onClick={addGoal} style={{ padding: "12px 24px", fontSize: 14 }}>🎯 Criar Meta</button>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {data.goals.map(g => {
                const pct = Math.min(100, Math.round((g.current / g.target) * 100));
                const remaining = g.target - g.current;
                const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline) - new Date()) / 86400000) : null;
                return (
                  <div key={g.id} className="card" style={{ borderLeft: `4px solid ${g.color}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div>
                        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: "#f1f5f9" }}>{g.name}</h3>
                        {daysLeft !== null && (
                          <span style={{ fontSize: 11, color: daysLeft < 60 ? "#facc15" : BRAND.muted }}>
                            📅 {g.deadline} &nbsp;•&nbsp; {daysLeft > 0 ? `${daysLeft} dias restantes` : "Prazo encerrado"}
                          </span>
                        )}
                      </div>
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: g.color }}>{pct}%</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, height: 10, overflow: "hidden", marginBottom: 12 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${g.color}55, ${g.color})`, borderRadius: 8, transition: "width 0.6s ease" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                      <span style={{ fontSize: 12, color: BRAND.muted }}>Guardado: <strong style={{ color: g.color }}>R${g.current.toLocaleString("pt-BR")}</strong></span>
                      <span style={{ fontSize: 12, color: BRAND.muted }}>Falta: <strong style={{ color: "#f1f5f9" }}>R${remaining.toLocaleString("pt-BR")}</strong></span>
                      <span style={{ fontSize: 12, color: BRAND.muted }}>Meta: <strong>R${g.target.toLocaleString("pt-BR")}</strong></span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ fontSize: 12, color: BRAND.muted, alignSelf: "center", marginRight: 4 }}>Adicionar:</span>
                      {[100, 500, 1000, 2000].map(v => (
                        <button key={v} onClick={() => addToGoal(g.id, v)} style={{
                          padding: "7px 12px", borderRadius: 8, border: `1px solid ${g.color}33`,
                          background: `${g.color}0d`, color: g.color, fontWeight: 600, fontSize: 12,
                          cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
                        }}>+{v < 1000 ? v : "1k"}</button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            IA DUETTO
        ════════════════════════════════════════ */}
        {tab === "ai" && (
          <div style={{ animation: "fadeUp 0.35s ease" }}>
            {/* AI Hero */}
            <div style={{
              background: "linear-gradient(135deg, rgba(99,211,172,0.08) 0%, rgba(167,139,250,0.08) 100%)",
              border: "1px solid rgba(99,211,172,0.15)", borderRadius: 20, padding: "24px 24px 20px",
              marginBottom: 16, textAlign: "center",
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✦</div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: "#f1f5f9", marginBottom: 6 }}>
                Consultora Financeira Duetto
              </h2>
              <p style={{ color: BRAND.muted, fontSize: 13, lineHeight: 1.6 }}>
                Inteligência Artificial treinada para ajudar casais a <br />
                tomar melhores decisões financeiras juntos
              </p>
            </div>

            {/* Quick stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Taxa de Poupança", value: `${savingsRate}%`, color: savingsRate >= 20 ? BRAND.primary : "#facc15" },
                { label: "Comprometimento", value: `${Math.round((totalOut / totalIn) * 100)}%`, color: (totalOut / totalIn) > 0.8 ? BRAND.danger : BRAND.primary },
                { label: "Metas Ativas", value: data.goals.length, color: BRAND.secondary },
              ].map((s, i) => (
                <div key={i} className="card" style={{ textAlign: "center", padding: 14 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: s.color, fontWeight: 700 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: BRAND.muted, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <AIAdvisor transactions={data.transactions} goals={data.goals} />
            </div>
          </div>
        )}
      </div>

      {/* ─── Sync badge ─── */}
      <div style={{
        position: "fixed", bottom: 18, right: 18,
        background: "rgba(7,9,15,0.85)", border: "1px solid rgba(99,211,172,0.18)",
        borderRadius: 22, padding: "6px 14px", fontSize: 11, color: BRAND.primary,
        fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 7,
        backdropFilter: "blur(12px)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: BRAND.primary, animation: "glow 2.5s infinite" }} />
        Duetto • Sincronizado • {activeUser}
      </div>
    </div>
  );
}
