import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import Header from './components/Header.jsx'
import QuestionList from './pages/QuestionList.jsx'
import QuestionDetail from './pages/QuestionDetail.jsx'
import UserProfile from './pages/UserProfile.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Admin from './pages/Admin.jsx'

function App() {
  return (
    <AuthProvider>
      <div className="app-layout">
        <Header />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<QuestionList />} />
            <Route path="/question/:id" element={<QuestionDetail />} />
            <Route path="/user/:nickname" element={<UserProfile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  )
}

export default App
