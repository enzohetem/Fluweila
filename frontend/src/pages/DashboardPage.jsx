import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import PageHeader from "../components/PageHeader.jsx";
import StatCard from "../components/StatCard.jsx";
import StatusMessage from "../components/StatusMessage.jsx";
import { useToast } from "../feedback/ToastProvider.jsx";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const toast = useToast();

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    try {
      setLoading(true);
      setError("");
      setSummary(await api.get("/dashboard/summary"));
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshSummary() {
    await loadSummary();
    toast.success("Dashboard atualizado.");
  }

  return (
    <section className="page">
      <PageHeader
        title="Dashboard"
        actions={
          <button
            className="secondary-button"
            type="button"
            onClick={refreshSummary}
            disabled={loading}
          >
            <RefreshCw size={18} />
            Atualizar
          </button>
        }
      />
      <StatusMessage loading={loading} error={error} />

      {summary ? (
        <>
          <section className="panel dashboard-chart-panel">
            <div className="panel-header">
              <h2>Pedidos da semana</h2>
            </div>
            <WeeklyOrdersChart data={summary.weekly_orders || []} />
          </section>

          <div className="dashboard-section">
            <h2 className="dashboard-section-title">Fila de impressão</h2>
            <div className="stats-grid">
              <StatCard
                label="Aguardando"
                value={summary.jobs.waiting_printer}
                tone="warning"
                onClick={() => navigate("/jobs?status=waiting_printer")}
              />
              <StatCard
                label="Alocados"
                value={summary.jobs.allocated}
                tone="packing"
                onClick={() => navigate("/jobs?status=allocated")}
              />
              <StatCard
                label="Imprimindo"
                value={summary.jobs.printing}
                tone="info"
                onClick={() => navigate("/jobs?status=printing")}
              />
              <StatCard
                label="Falhas"
                value={summary.jobs.failed}
                tone="danger"
                onClick={() => navigate("/jobs?status=failed")}
              />
            </div>
          </div>

          <div className="dashboard-section">
            <h2 className="dashboard-section-title">Impressoras</h2>
            <div className="stats-grid">
              <StatCard
                label="Disponíveis"
                value={summary.printers.available}
                tone="success"
                onClick={() => navigate("/printers?status=available")}
              />
              <StatCard
                label="Imprimindo"
                value={summary.printers.printing}
                tone="info"
                onClick={() => navigate("/printers?status=printing")}
              />
            </div>
          </div>

        </>
      ) : null}
    </section>
  );
}

function WeeklyOrdersChart({ data }) {
  const width = 1000;
  const height = 300;
  const padding = { top: 20, right: 24, bottom: 42, left: 42 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxTotal = Math.max(1, ...data.map((item) => item.total));
  const ySteps = 5;
  const points = data.map((item, index) => {
    const x =
      padding.left +
      (data.length <= 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth);
    const y = padding.top + chartHeight - (item.total / maxTotal) * chartHeight;
    return { ...item, x, y };
  });
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
    : "";

  return (
    <div className="weekly-orders-chart" aria-label="Pedidos da semana">
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        {[...Array(ySteps + 1)].map((_, index) => {
          const value = Math.round((maxTotal / ySteps) * (ySteps - index));
          const y = padding.top + (chartHeight / ySteps) * index;

          return (
            <g key={index}>
              <line
                className="weekly-orders-grid-line"
                x1={padding.left}
                x2={padding.left + chartWidth}
                y1={y}
                y2={y}
              />
              <text className="weekly-orders-y-label" x={padding.left - 12} y={y + 4}>
                {value}
              </text>
            </g>
          );
        })}

        {points.map((point) => (
          <line
            className="weekly-orders-grid-line vertical"
            key={`grid-${point.date}`}
            x1={point.x}
            x2={point.x}
            y1={padding.top}
            y2={padding.top + chartHeight}
          />
        ))}

        <path className="weekly-orders-area" d={areaPath} />
        <path className="weekly-orders-line" d={linePath} />

        {points.map((point) => (
          <g key={point.date}>
            <circle className="weekly-orders-dot" cx={point.x} cy={point.y} r="4" />
            <text className="weekly-orders-x-label" x={point.x} y={height - 12}>
              {formatChartLabel(point)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function formatChartLabel(item) {
  const [year, month, day] = item.date.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" });
  const formattedDate = date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });

  return `${weekday}, ${formattedDate.replace(".", "")}`;
}
