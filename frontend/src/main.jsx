import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ConfirmProvider } from "./feedback/ConfirmProvider.jsx";
import { ToastProvider } from "./feedback/ToastProvider.jsx";
import { registerServiceWorker } from "./registerServiceWorker.js";
import { ThemeProvider } from "./theme/ThemeProvider.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>,
);

registerServiceWorker();
