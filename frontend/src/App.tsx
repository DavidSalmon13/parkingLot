import { Route, Routes } from 'react-router-dom'
import { Dashboard } from './components/Dashboard'
import { AdminPanel } from './pages/AdminPanel'
import { LotList } from './pages/LotList'
import { LotEditor } from './pages/LotEditor'
import { useLotSocket } from './hooks/useLotSocket'

function App() {
  // Mounted here (not inside Dashboard) so the connection persists across
  // navigation between the dashboard and admin routes, per §6.4.
  useLotSocket()

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/admin" element={<AdminPanel />}>
        <Route index element={<LotList />} />
        <Route path="lots/:id" element={<LotEditor />} />
      </Route>
    </Routes>
  )
}

export default App
