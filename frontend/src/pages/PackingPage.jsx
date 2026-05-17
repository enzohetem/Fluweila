import { CheckCircle2, FileText, PackageCheck, Printer, RefreshCw, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import Badge from "../components/Badge.jsx";
import PageHeader from "../components/PageHeader.jsx";
import StatusMessage from "../components/StatusMessage.jsx";
import { ORDER_STATUSES, labelFor } from "../constants.js";
import { useToast } from "../feedback/ToastProvider.jsx";
import { statusTone } from "../utils/jobFormatters.js";

export default function PackingPage() {
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showPacked, setShowPacked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [showInvoices, setShowInvoices] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [uploadingInvoices, setUploadingInvoices] = useState(false);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState(null);
  const [error, setError] = useState("");
  const toast = useToast();

  const selectedOrder = useMemo(
    () => orders.find((order) => Number(order.id) === Number(selectedOrderId)) || orders[0],
    [orders, selectedOrderId],
  );

  useEffect(() => {
    loadPackingOrders();
  }, [showPacked]);

  useEffect(() => {
    loadTodayInvoices();
  }, []);

  async function loadPackingOrders(preferredOrderId = selectedOrderId) {
    try {
      setLoading(true);
      setError("");

      const allOrders = await loadPackingCandidates();
      const nextOrders = allOrders.filter((order) => {
        if (["ready_to_pack", "printed"].includes(order.status)) {
          return true;
        }

        return showPacked && order.status === "packed";
      });

      setOrders(nextOrders);
      setSelectedOrderId(
        nextOrders.some((order) => Number(order.id) === Number(preferredOrderId))
          ? preferredOrderId
          : nextOrders[0]?.id || null,
      );
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function advanceOrder(order) {
    const nextStatus = ["ready_to_pack", "printed"].includes(order.status)
      ? "packed"
      : "completed";

    try {
      setBusyOrderId(order.id);
      setError("");
      await api.patch(`/orders/${order.id}/status`, { status: nextStatus });
      toast.success(`Pedido #${order.id} atualizado.`);
      await loadPackingOrders(nextStatus === "packed" && !showPacked ? null : order.id);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setBusyOrderId(null);
    }
  }

  async function loadTodayInvoices() {
    try {
      setLoadingInvoices(true);
      const result = await api.get("/shipping-label-pdfs");
      setInvoices(result.data);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoadingInvoices(false);
    }
  }

  async function uploadInvoices(event) {
    const files = Array.from(event.target.files || []);
    const pdfFiles = files.filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));

    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    if (pdfFiles.length !== files.length) {
      toast.error("Envie apenas arquivos PDF.");
      return;
    }

    try {
      setUploadingInvoices(true);
      setError("");
      await Promise.all(pdfFiles.map((file) => api.uploadPdf("/shipping-label-pdfs", file)));
      toast.success(pdfFiles.length === 1 ? "Etiqueta de envio enviada." : "Etiquetas de envio enviadas.");
      await loadTodayInvoices();
      setShowInvoices(true);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setUploadingInvoices(false);
    }
  }

  async function deleteInvoice(invoiceId) {
    try {
      setDeletingInvoiceId(invoiceId);
      setError("");
      await api.delete(`/shipping-label-pdfs/${invoiceId}`);
      toast.success("Etiqueta de envio removida.");
      await loadTodayInvoices();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setDeletingInvoiceId(null);
    }
  }

  return (
    <section className="page packing-page">
      <PageHeader
        title="Embalagem"
        actions={
          <>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setShowInvoices((current) => !current)}
            >
              <FileText size={18} />
              Etiquetas de envio
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                loadPackingOrders();
                loadTodayInvoices();
              }}
              disabled={loading || loadingInvoices}
            >
              <RefreshCw size={18} />
              Atualizar
            </button>
          </>
        }
      />

      <StatusMessage loading={loading} error={error} />

      {!loading ? (
        <>
          {showInvoices ? (
            <section className="invoice-panel panel">
              <div className="panel-header invoice-panel-header">
                <div>
                  <h2>Etiquetas de envio de hoje</h2>
                  <span className="muted">PDFs disponiveis para a logistica imprimir.</span>
                </div>
                <label className="secondary-button invoice-upload-button">
                  <Upload size={18} />
                  {uploadingInvoices ? "Enviando..." : "Enviar PDF"}
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    onChange={uploadInvoices}
                    disabled={uploadingInvoices}
                  />
                </label>
              </div>

              <div className="invoice-list">
                {loadingInvoices ? (
                  <StatusMessage loading />
                ) : invoices.length > 0 ? (
                  invoices.map((invoice) => (
                    <div className="invoice-item" key={invoice.id}>
                      <FileText size={20} />
                      <div>
                        <strong>{invoice.original_name}</strong>
                        <span className="muted">
                          {formatFileSize(invoice.size_bytes)} - {formatInvoiceTime(invoice.uploaded_at)}
                        </span>
                      </div>
                      <div className="row-actions">
                        <a
                          className="secondary-button compact-button"
                          href={api.fileUrl(`/shipping-label-pdfs/${invoice.id}/file`)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Printer size={16} />
                          Imprimir
                        </a>
                        <button
                          className="icon-button danger"
                          type="button"
                          title="Remover"
                          aria-label="Remover etiqueta de envio"
                          disabled={deletingInvoiceId === invoice.id}
                          onClick={() => deleteInvoice(invoice.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <StatusMessage empty message="Nenhuma etiqueta de envio enviada hoje." />
                )}
              </div>
            </section>
          ) : null}

          <section className="packing-workspace">
            <aside className="packing-sidebar panel">
              <div className="panel-header">
                <h2>Pedidos pendentes</h2>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={showPacked}
                    onChange={(event) => setShowPacked(event.target.checked)}
                  />
                  Mostrar embalados
                </label>
              </div>
              <div className="packing-order-list">
                {orders.map((order) => (
                  <button
                    className={`packing-order-button ${
                      Number(selectedOrder?.id) === Number(order.id) ? "active" : ""
                    }`}
                    type="button"
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <span>Pedido #{order.id} - {order.customer_name}</span>
                    <Badge tone={statusTone(order.status)}>
                      {labelFor(ORDER_STATUSES, order.status)}
                    </Badge>
                  </button>
                ))}
              </div>
            </aside>

            <section className="packing-detail panel">
              {selectedOrder ? (
                <>
                  <header className="packing-detail-header">
                    <div>
                      <h2>Embalagem do pedido #{selectedOrder.id}</h2>
                      <span>{selectedOrder.customer_name}</span>
                    </div>
                    <div className="packing-read-progress">
                      <span style={{ width: `${packingProgress(selectedOrder)}%` }} />
                    </div>
                    <strong>
                      {packedQuantity(selectedOrder)} de {totalQuantity(selectedOrder)} itens lidos
                    </strong>
                  </header>

                  <div className="packing-table-wrap">
                    <table className="packing-table">
                      <thead>
                        <tr>
                          <th>Produto</th>
                          <th>Variação</th>
                          <th>Quantidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.product_name}</td>
                            <td>{variationLabel(item)}</td>
                            <td>{quantityProgress(selectedOrder, item)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="packing-detail-actions">
                    <button
                      className="primary-button"
                      type="button"
                      disabled={busyOrderId === selectedOrder.id}
                      onClick={() => advanceOrder(selectedOrder)}
                    >
                      {["ready_to_pack", "printed"].includes(selectedOrder.status) ? (
                        <PackageCheck size={18} />
                      ) : (
                        <CheckCircle2 size={18} />
                      )}
                      {["ready_to_pack", "printed"].includes(selectedOrder.status)
                        ? "Marcar embalado"
                        : "Finalizar pedido"}
                    </button>
                  </div>
                </>
              ) : (
                <StatusMessage empty />
              )}
            </section>
          </section>
          <StatusMessage empty={orders.length === 0} />
        </>
      ) : null}
    </section>
  );
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0);

  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatInvoiceTime(value) {
  if (!value) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function loadPackingCandidates() {
  const result = await api.get("/orders?limit=100");
  return Promise.all(result.data.map((order) => api.get(`/orders/${order.id}`)));
}

function totalQuantity(order) {
  return order.items.reduce((total, item) => total + Number(item.quantity || 0), 0);
}

function packedQuantity(order) {
  return order.status === "packed" ? totalQuantity(order) : 0;
}

function packingProgress(order) {
  const total = totalQuantity(order);

  if (total === 0) {
    return 0;
  }

  return Math.round((packedQuantity(order) / total) * 100);
}

function quantityProgress(order, item) {
  const quantity = Number(item.quantity || 0);
  const packed = order.status === "packed" ? quantity : 0;
  return `${packed} / ${quantity}`;
}

function variationLabel(item) {
  return [item.filament_brand, item.filament_material, item.filament_color]
    .filter((value) => value && String(value).trim() !== "")
    .join(" ") || "-";
}
