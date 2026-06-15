import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./index.css";
import { AppShell } from "./components/app-shell";
import { DashboardPage } from "./pages/dashboard-page";
import { OpportunityListPage } from "./pages/opportunity-list-page";
import { OpportunityDetailPage } from "./pages/opportunity-detail-page";
import { OpportunityFormPage } from "./pages/opportunity-form-page";
import { CaseStudyListPage } from "./pages/casestudy-list-page";
import { CaseStudyDetailPage } from "./pages/casestudy-detail-page";
import { CaseStudyFormPage } from "./pages/casestudy-form-page";
import { ImportPage } from "./pages/import-page";
import { AskPage } from "./pages/ask-page";
import { AdminTokensPage } from "./pages/admin-tokens-page";
import { LoginPage } from "./pages/login-page";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />

          <Route path="opportunities" element={<OpportunityListPage />} />
          <Route path="opportunities/new" element={<OpportunityFormPage />} />
          <Route path="opportunities/import" element={<ImportPage kind="opportunity" />} />
          <Route path="opportunities/:id" element={<OpportunityDetailPage />} />
          <Route path="opportunities/:id/edit" element={<OpportunityFormPage />} />

          <Route path="casestudies" element={<CaseStudyListPage />} />
          <Route path="casestudies/new" element={<CaseStudyFormPage />} />
          <Route path="casestudies/import" element={<ImportPage kind="case_study" />} />
          <Route path="casestudies/:id" element={<CaseStudyDetailPage />} />
          <Route path="casestudies/:id/edit" element={<CaseStudyFormPage />} />

          <Route path="ask" element={<AskPage />} />
          <Route path="admin/tokens" element={<AdminTokensPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
