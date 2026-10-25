import "./App.css";
import GuestLayout from "./components/GuestLayout";
import ProtectedLayout from "./components/ProtectedLayout";
import { useAuthInit } from "./hooks/useAuthInit";
import { BrowserRouter, Route, Routes } from "react-router";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Room from "./pages/Room";

const App = () => {
    useAuthInit();
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<GuestLayout />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                </Route>
                <Route element={<ProtectedLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/room/:code" element={<Room />} />
                </Route>
                <Route
                    path="*"
                    element={
                        <h2 style={{ textAlign: "center" }}>
                            PAGE NOT FOUND 404
                        </h2>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
