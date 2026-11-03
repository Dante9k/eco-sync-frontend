import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ExoProvider } from './state/ExoContext';
import { DashboardPage } from './pages/DashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';
export default function App() {
  return <ExoProvider><BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/" element={<DashboardPage/>}/><Route path="*" element={<NotFoundPage/>}/></Routes></BrowserRouter></ExoProvider>;
}
