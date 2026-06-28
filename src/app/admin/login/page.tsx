"use client";

import { Suspense } from "react";
import AdminLoginForm from "./AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted">Loading…</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
