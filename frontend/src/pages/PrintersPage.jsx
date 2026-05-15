import { Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";
import Badge from "../components/Badge.jsx";
import PageHeader from "../components/PageHeader.jsx";
import SelectField from "../components/SelectField.jsx";
import StatusMessage from "../components/StatusMessage.jsx";
import { PRINTER_STATUSES, labelFor } from "../constants.js";
import { useConfirm } from "../feedback/ConfirmProvider.jsx";
import { useToast } from "../feedback/ToastProvider.jsx";

export default function PrintersPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [printers, setPrinters] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const confirm = useConfirm();
  const toast = useToast();

  useEffect(() => {
    loadPrinters();
  }, [status]);

  async function loadPrinters() {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      setPrinters(await api.get(`/printers?${params.toString()}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deletePrinter(printer) {
    const confirmed = await confirm({
      title: "Remover impressora",
      message: `Deseja remover ${printer.name}?`,
      confirmLabel: "Remover",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      setBusyId(printer.id);
      setError("");
      await api.delete(`/printers/${printer.id}`);
      toast.success("Impressora removida.");
      await loadPrinters();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="page">
      <PageHeader
        title="Impressoras"
        actions={
          <Link className="primary-button" to="/printers/new">
            <Plus size={18} />
            Nova impressora
          </Link>
        }
      />

      <section className="panel">
        <div className="panel-header">
          <h2>Lista</h2>
          <form
            className="toolbar"
            onSubmit={(event) => {
              event.preventDefault();
              loadPrinters();
            }}
          >
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar"
            />
            <SelectField
              value={status}
              options={[{ value: "", label: "Todos" }, ...PRINTER_STATUSES]}
              onChange={(value) => {
                setStatus(value);
                setSearchParams(value ? { status: value } : {});
              }}
              className="toolbar-select"
            />
            <button
              className="icon-button"
              type="submit"
              title="Atualizar"
              aria-label="Atualizar"
            >
              <RefreshCw size={18} />
            </button>
          </form>
        </div>
        <StatusMessage loading={loading} error={error} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Modelo</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {printers.map((printer) => (
                <tr key={printer.id}>
                  <td><strong>{printer.name}</strong></td>
                  <td>{printer.model || "-"}</td>
                  <td>
                    <Badge tone={printer.status === "available" ? "success" : "neutral"}>
                      {labelFor(PRINTER_STATUSES, printer.status)}
                    </Badge>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link
                        className="secondary-button compact-button"
                        to={`/printers/${printer.id}/edit`}
                        state={{ from: location.pathname }}
                      >
                        <Edit3 size={16} />
                        Editar
                      </Link>
                      <button
                        className="icon-button danger"
                        type="button"
                        title="Remover"
                        aria-label="Remover"
                        disabled={busyId === printer.id}
                        onClick={() => deletePrinter(printer)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <StatusMessage empty={!loading && printers.length === 0} />
        </div>
      </section>
    </section>
  );
}
