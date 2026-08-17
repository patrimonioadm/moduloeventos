import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Shell } from "./components/Shell";
import Login from "./pages/Login";
import Home from "./pages/Home";
import MinhaConta from "./pages/MinhaConta";
import AdminUsuarios from "./pages/AdminUsuarios";
import ModuloIframe from "./pages/ModuloIframe";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <Shell />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/conta" element={<MinhaConta />} />
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <AdminUsuarios />
                </ProtectedRoute>
              }
            />
            <Route path="/modulo/:chave" element={<ModuloIframe />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
