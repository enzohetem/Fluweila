import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  PackageCheck,
  Pencil,
  RotateCcw,
  ShoppingBag,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import Badge from "../components/Badge.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusMessage from "../components/StatusMessage.jsx";
import { JOB_PRIORITIES, JOB_STATUSES, labelFor } from "../constants.js";
import { useToast } from "../feedback/ToastProvider.jsx";
import {
  filamentLabel,
  formatDate,
  priorityTone,
  productVariationLabel,
  statusTone,
} from "../utils/jobFormatters.js";

const jobActions = [
  { status: "waiting_printer", label: "Aguardando", icon: Clock, tone: "secondary-button" },
  { status: "allocated", label: "Alocado", icon: PackageCheck, tone: "secondary-button" },
  { status: "printing", label: "Imprimindo", icon: Zap, tone: "secondary-button" },
  { status: "failed", label: "Falhou", icon: AlertTriangle, tone: "secondary-button" },
  { status: "reprint", label: "Reimprimir", icon: RotateCcw, tone: "secondary-button" },
  { status: "printed", label: "Impresso", icon: CheckCircle2, tone: "primary-button" },
];

export default function JobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const backTo = useMemo(
    () => location.state?.from || "/jobs",
    [location.state],
  );

  useEffect(() => {
    loadJob();
  }, [id]);

  async function loadJob() {
    try {
      setLoading(true);
      setError("");
      setJob(await api.get(`/jobs/${id}`));
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(status) {
    try {
      setBusy(true);
      setError("");
      await api.patch(`/jobs/${id}/status`, { status });
      toast.success("Status atualizado.");
      await loadJob();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const orderId = job?.order_number || job?.order_id;

  return (
    <section className="page detail-page">
      <PageHeader
        title={`Detalhes do job #${id}`}
        actions={
          <>
            <Link
              className="secondary-button"
              to={`/jobs/${id}/edit`}
              state={{ from: location.pathname }}
            >
              <Pencil size={18} />
              Editar
            </Link>
            <button
              className="secondary-button"
              type="button"
              onClick={() => navigate(backTo)}
            >
              <ArrowLeft size={18} />
              Voltar
            </button>
          </>
        }
      />

      <StatusMessage loading={loading} error={error} />

      {job ? (
        <>
          <section className="panel detail-hero">
            <div>
              <span className="muted">
                {orderId ? `Originado do pedido #${orderId}` : "Job avulso"}
              </span>
              <h2>{job.product_name || job.file_name || job.title}</h2>
              <div className="detail-badges">
                <Badge tone={statusTone(job.status)}>
                  {labelFor(JOB_STATUSES, job.status)}
                </Badge>
                <Badge tone={priorityTone(job.priority)}>
                  {labelFor(JOB_PRIORITIES, job.priority)}
                </Badge>
                <Badge tone="neutral">{job.customer_name || "-"}</Badge>
              </div>
            </div>

            <div className="detail-actions">
              {orderId ? (
                <Link className="secondary-button" to={`/orders/${orderId}`}>
                  <ShoppingBag size={18} />
                  Ver pedido
                </Link>
              ) : null}
              {jobActions.map((action) => {
                const Icon = action.icon;

                return (
                  <button
                    key={action.status}
                    className={action.tone}
                    type="button"
                    disabled={busy || job.status === action.status}
                    onClick={() => changeStatus(action.status)}
                  >
                    <Icon size={18} />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="detail-grid">
            <InfoPanel title="Origem">
              <InfoItem label="Pedido" value={orderId ? `#${orderId}` : "Job avulso"} />
              <InfoItem label="Cliente" value={job.customer_name || "-"} />
              <InfoItem label="Entrega" value={formatDate(job.delivery_date)} />
              <InfoItem label="Unidade" value={job.unit_index ? `#${job.unit_index}` : "-"} />
            </InfoPanel>

            <InfoPanel title="Produto">
              <InfoItem
                label="Produto"
                value={job.product_name || job.file_name || "-"}
              />
              <InfoItem label="SKU" value={job.product_sku || "-"} />
              <InfoItem
                label="Variação"
                value={productVariationLabel(job) || filamentLabel(job) || "-"}
              />
              <InfoItem
                label="Filamento estimado"
                value={`${job.estimated_filament_grams || 0} g`}
              />
            </InfoPanel>

            <InfoPanel title="Produção">
              <InfoItem label="Impressora" value={job.printer_name || "-"} />
              <InfoItem
                label="Tempo estimado"
                value={`${job.estimated_time_minutes || 0} min`}
              />
              <InfoItem label="Progresso" value={`${job.progress || 0}%`} />
              <InfoItem
                label="Criado em"
                value={
                  job.created_at
                    ? new Date(job.created_at).toLocaleString("pt-BR")
                    : "-"
                }
              />
            </InfoPanel>
          </section>

          <Link className="secondary-button detail-back-link" to={backTo}>
            <ArrowLeft size={18} />
            Voltar para a fila
          </Link>
        </>
      ) : null}
    </section>
  );
}

function InfoPanel({ title, children }) {
  return (
    <section className="panel info-panel">
      <div className="panel-header">
        <h2>{title}</h2>
      </div>
      <div className="info-list">{children}</div>
    </section>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
