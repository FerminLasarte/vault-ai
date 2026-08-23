import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { installGlobalErrorHandlers } from "@/lib/globalErrors";
import "./index.css";

installGlobalErrorHandlers();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
