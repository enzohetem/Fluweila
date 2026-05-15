import { CheckCircle2, PackageCheck, RefreshCw } from "lucide-react";
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
  const [error, setError] = useState("");
  const toast = useToast();

  const selectedOrder = useMemo(
    () => orders.find((order) => Number(order.id) === Number(selectedOrderId)) || orders[0],
    [orders, selectedOrderId],
  );

  useEffect(() => {
    loadPackingOrders();
  }, [showPacked]);

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

  return (
    <section className="page packing-page">
      <PageHeader
        title="Embalagem"
        actions={
          <button
            className="secondary-button"
            type="button"
            onClick={() => loadPackingOrders()}
            disabled={loading}
          >
            <RefreshCw size={18} />
            Atualizar
          </button>
        }
      />

      <StatusMessage loading={loading} error={error} />

      {!loading ? (
        <>
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
