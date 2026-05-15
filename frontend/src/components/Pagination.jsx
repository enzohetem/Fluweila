import { ChevronLeft, ChevronRight } from "lucide-react";

function buildPageItems(currentPage, totalPages) {
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages]);

  for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const items = [];

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1];

    if (previousPage && page - previousPage > 1) {
      items.push("ellipsis");
    }

    items.push(page);
  });

  return items;
}

export default function Pagination({ pagination, onPageChange }) {
  if (!pagination) {
    return null;
  }

  const currentPage = Math.max(1, pagination.page || 1);
  const totalPages = Math.max(1, pagination.total_pages || 1);
  const itemsPerPage = pagination.limit || 0;
  const totalItems = pagination.total || 0;
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const lastItem = Math.min(currentPage * itemsPerPage, totalItems);
  const pageItems = buildPageItems(currentPage, totalPages);

  return (
    <div className="pagination">
      <span className="pagination-summary">
        Exibindo {firstItem} a {lastItem} de {totalItems} resultados
      </span>
      <nav className="pagination-controls" aria-label="Paginacao">
        <button
          className="pagination-button pagination-arrow"
          type="button"
          aria-label="Pagina anterior"
          title="Pagina anterior"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        {pageItems.map((item, index) =>
          item === "ellipsis" ? (
            <span className="pagination-ellipsis" key={`ellipsis-${index}`}>
              ...
            </span>
          ) : (
            <button
              className={`pagination-button${item === currentPage ? " is-active" : ""}`}
              type="button"
              aria-label={`Ir para pagina ${item}`}
              aria-current={item === currentPage ? "page" : undefined}
              key={item}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          ),
        )}
        <button
          className="pagination-button pagination-arrow"
          type="button"
          aria-label="Proxima pagina"
          title="Proxima pagina"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </nav>
    </div>
  );
}
