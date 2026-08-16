import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Rules from './pages/Rules';
import BreachLogs from './pages/BreachLogs';
import Notifications from './pages/Notifications';
import TestAPI from './pages/TestAPI';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/breaches" element={<BreachLogs />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/test" element={<TestAPI />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
