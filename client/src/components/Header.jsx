import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Header() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setShowDropdown(false);
    navigate('/');
  };

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link to="/" className="app-logo">
          <span className="logo-icon">🤔</span>
          <span className="logo-text">困境选择</span>
        </Link>

        <div className="header-right">
          {user ? (
            <div className="user-menu" ref={dropdownRef}>
              <button
                className="user-menu-trigger"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div
                  className="user-avatar"
                  style={{ background: user.avatar?.bgColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                >
                  {user.avatar?.initial || user.nickname?.charAt(0).toUpperCase()}
                </div>
                <span className="user-nickname">{user.nickname}</span>
                <span className="dropdown-arrow">▼</span>
              </button>

              {showDropdown && (
                <div className="user-dropdown">
                  <div 
                    className="dropdown-user-info"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setShowDropdown(false)
                      navigate(`/user/${encodeURIComponent(user.nickname)}`)
                    }}
                  >
                    <div
                      className="dropdown-avatar"
                      style={{ background: user.avatar?.bgColor || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                    >
                      {user.avatar?.initial || user.nickname?.charAt(0).toUpperCase()}
                    </div>
                    <div className="dropdown-user-details">
                      <div className="dropdown-nickname">{user.nickname}</div>
                      <div className="dropdown-email">{user.email}</div>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button 
                    className="dropdown-item" 
                    onClick={() => {
                      setShowDropdown(false)
                      navigate(`/user/${encodeURIComponent(user.nickname)}`)
                    }}
                  >
                    <span>个人主页</span>
                  </button>
                  <button className="dropdown-item logout-btn" onClick={handleLogout}>
                    <span>退出登录</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-outline header-login-btn">
                登录
              </Link>
              <Link to="/register" className="btn btn-primary header-register-btn">
                注册
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
