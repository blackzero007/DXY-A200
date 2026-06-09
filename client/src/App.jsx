import { Routes, Route } from 'react-router-dom'
import QuestionList from './pages/QuestionList.jsx'
import QuestionDetail from './pages/QuestionDetail.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<QuestionList />} />
      <Route path="/question/:id" element={<QuestionDetail />} />
    </Routes>
  )
}

export default App
