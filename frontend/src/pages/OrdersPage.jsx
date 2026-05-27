import { Eye, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";
import Badge from "../components/Badge.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import SelectField from "../components/SelectField.jsx";
import StatusMessage from "../components/StatusMessage.jsx";
import { JOB_PRIORITIES, ORDER_STATUSES, labelFor } from "../constants.js";
import { useConfirm } from "../feedback/ConfirmProvider.jsx";
import { useToast } from "../feedback/ToastProvider.jsx";
import { formatDate, priorityTone } from "../utils/jobFormatters.js";

export default function OrdersPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [error, setError] = useState("");
  const confirm = useConfirm();
  const toast = useToast();

  useEffect(() => {
    loadOrders();
  }, [page, status]);

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ page: String(page), limit: "10" });

      if (status) params.set("status", status);
      if (search) params.set("search", search);

      const result = await api.get(`/orders?${params.toString()}`);
      setOrders(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteOrder(order) {
    const ok = await confirm({
      title: "Remover pedido",
      message: `Deseja remover o pedido #${order.id} de ${order.customer_name}?`,
      confirmLabel: "Remover",
      tone: "danger",
    });

    if (!ok) return;

    try {
      await api.delete(`/orders/${order.id}`);
      toast.success("Pedido removido.");
      await loadOrders();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  }

  async function changeOrderStatus(order, nextStatus) {
    if (order.status === nextStatus) {
      return;
    }

    try {
      setBusyOrderId(order.id);
      setError("");
      await api.patch(`/orders/${order.id}/status`, { status: nextStatus });
      toast.success(`Pedido #${order.id} atualizado.`);
      await loadOrders();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setBusyOrderId(null);
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    loadOrders();
  }

  return (
    <section className="page jobs-page">
      <PageHeader
        title="Pedidos"
        actions={
          <Link className="primary-button" to="/orders/new">
            <Plus size={18} />
            Novo pedido
          </Link>
        }
      />

      <section className="panel jobs-list-panel">
        <div className="panel-header">
          <h2>Pedidos ativos</h2>
          <form className="toolbar" onSubmit={submitSearch}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente ou número"
            />
            <SelectField
              value={status}
              options={[{ value: "", label: "Todos" }, ...ORDER_STATUSES]}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
                setSearchParams(value ? { status: value } : {});
              }}
              className="toolbar-select"
            />
            <button className="icon-button" type="submit" title="Atualizar" aria-label="Atualizar">
              <RefreshCw size={18} />
            </button>
          </form>
        </div>

        <StatusMessage loading={loading} error={error} />
        <div className="table-wrap">
          <table className="queue-table orders-table">
            <thead>
              <tr>
                <th>Prioridade</th>
                <th>Pedido</th>
                <th>Progresso</th>
                <th>Status</th>
                <th>Entrega</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="queue-row">
                  <td>
                    {isPackedOrder(order) ? (
                      <span
                        className="completion-dot"
                        title="Pedido concluido"
                        aria-label="Pedido concluido"
                      />
                    ) : (
                      <Badge tone={priorityTone(order.priority)}>
                        {labelFor(JOB_PRIORITIES, order.priority)}
                      </Badge>
                    )}
                  </td>
                  <td>
                    <Link
                      className="row-main-link"
                      to={`/orders/${order.id}`}
                      state={{ from: location.pathname }}
                    >
                      <strong>#{order.id} - {order.customer_name}</strong>
                      <span className="muted">Abrir pedido</span>
                    </Link>
                  </td>
                  <td>
                    <span className="queue-cell-text">
                      {order.printed_jobs || 0}/{order.total_jobs || 0} impressos
                    </span>
                  </td>
                  <td>
                    <SelectField
                      value={order.status}
                      options={statusOptionsForOrder(order)}
                      disabled={!canChangeOrderStatus(order) || busyOrderId === order.id}
                      onChange={(value) => changeOrderStatus(order, value)}
                      className={`row-select status-select status-select-${order.status}`}
                    />
                  </td>
                  <td>{formatDate(order.delivery_date)}</td>
                  <td>
                    <div className="row-actions">
                      <Link
                        className="secondary-button compact-button"
                        to={`/orders/${order.id}`}
                        state={{ from: location.pathname }}
                        title="Ver detalhes"
                      >
                        <Eye size={16} />
                        Detalhes
                      </Link>
                      <Link
                        className="secondary-button compact-button"
                        to={`/orders/${order.id}/edit`}
                        state={{ from: location.pathname }}
                        title="Editar pedido"
                      >
                        <Pencil size={16} />
                        Editar
                      </Link>
                      <button
                        className="icon-button danger"
                        type="button"
                        title="Remover"
                        aria-label="Remover"
                        onClick={() => deleteOrder(order)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <StatusMessage empty={!loading && orders.length === 0} />
        </div>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </section>
    </section>
  );
}

function canChangeOrderStatus(order) {
  return ["ready_to_pack", "packed"].includes(order.status);
}

function isPackedOrder(order) {
  return ["packed", "completed"].includes(order.status);
}

function statusOptionsForOrder(order) {
  if (order.status === "ready_to_pack") {
    return ORDER_STATUSES.filter((item) =>
      ["ready_to_pack", "packed"].includes(item.value),
    );
  }

  if (order.status === "packed") {
    return ORDER_STATUSES.filter((item) =>
      ["packed", "completed"].includes(item.value),
    );
  }

  return ORDER_STATUSES.filter((item) => item.value === order.status);
}
