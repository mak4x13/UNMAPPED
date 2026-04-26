import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { CountriesProvider } from "./config/countries";
import { ProfileProvider } from "./hooks/useProfile";
import { ReadinessProvider } from "./hooks/useReadiness";
import "./styles.css";


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <CountriesProvider>
        <ProfileProvider>
          <ReadinessProvider>
            <App />
          </ReadinessProvider>
        </ProfileProvider>
      </CountriesProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
