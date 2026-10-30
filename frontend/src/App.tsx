import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { EcoProvider } from './state/EcoContext';
import { DashboardPage } from './pages/DashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';
export default function App() {
  return <EcoProvider><BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/" element={<DashboardPage/>}/><Route path="*" element={<NotFoundPage/>}/></Routes></BrowserRouter></EcoProvider>;
}
