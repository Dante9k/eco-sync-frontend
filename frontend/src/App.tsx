import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './state/ThemeContext';
import { ExoProvider } from './state/ExoContext';
import { DashboardPage } from './pages/DashboardPage';
import { PeopleBoardPage } from './pages/PeopleBoardPage';
import { NotFoundPage } from './pages/NotFoundPage';
export default function App() {
  return <ExoProvider><BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ThemeProvider><Routes><Route path="/" element={<DashboardPage/>}/><Route path="/board" element={<PeopleBoardPage/>}/><Route path="*" element={<NotFoundPage/>}/></Routes></ThemeProvider></BrowserRouter></ExoProvider>;
}
