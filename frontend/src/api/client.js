const API_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3333`;

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.error || "Não foi possível completar a operação.";
    throw new Error(message);
  }

  return data;
}

async function uploadPdf(path, file) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/pdf",
      "X-File-Name": encodeURIComponent(file.name),
    },
    body: file,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.error || "Nao foi possivel enviar o PDF.";
    throw new Error(message);
  }

  return data;
}

export const api = {
  fileUrl: (path) => `${API_URL}${path}`,
  get: (path) => request(path),
  post: (path, body) => request(path, {
    method: "POST",
    body: JSON.stringify(body),
  }),
  put: (path, body) => request(path, {
    method: "PUT",
    body: JSON.stringify(body),
  }),
  patch: (path, body) => request(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  }),
  delete: (path) => request(path, {
    method: "DELETE",
  }),
  uploadPdf,
};
