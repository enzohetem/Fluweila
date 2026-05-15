export default function StatusMessage({ loading, error, empty }) {
  if (loading) {
    return <div className="state-line">Carregando...</div>;
  }

  if (error) {
    return <div className="state-line state-error">{error}</div>;
  }

  if (empty) {
    return <div className="state-line">Nenhum registro encontrado.</div>;
  }

  return null;
}
