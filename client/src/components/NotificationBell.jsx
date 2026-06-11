import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications
} from '../utils/api';

function formatTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return new Date(timestamp).toLocaleDateString();
}

function getNotificationIcon(type) {
  switch (type) {
    case 'like':
      return '👍';
    case 'dislike':
      return '👎';
    case 'reply':
      return '💬';
    default:
      return '🔔';
  }
}

function getNotificationTypeClass(type) {
  switch (type) {
    case 'like':
      return 'notification-type-like';
    case 'dislike':
      return 'notification-type-dislike';
    case 'reply':
      return 'notification-type-reply';
    default:
      return '';
  }
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showPanel, setShowPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setShowPanel(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const data = await getUnreadNotificationCount();
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error('获取未读数量失败:', err);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await getNotifications({ limit: 50 });
      setNotifications(data.list);
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error('获取通知失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setShowPanel(!showPanel);
    if (!showPanel) {
      await fetchNotifications();
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        const data = await markNotificationAsRead(notification.id);
        setUnreadCount(data.unread_count);
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
      } catch (err) {
        console.error('标记已读失败:', err);
      }
    }
    if (notification.question_id) {
      setShowPanel(false);
      navigate(`/question/${notification.question_id}`);
    }
  };

  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation();
    try {
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('全部标记已读失败:', err);
    }
  };

  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation();
    try {
      const data = await deleteNotification(notificationId);
      setUnreadCount(data.unread_count);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('删除通知失败:', err);
    }
  };

  const handleClearAll = async (e) => {
    e.stopPropagation();
    if (!confirm('确定要清空所有通知吗？')) return;
    try {
      await clearAllNotifications();
      setUnreadCount(0);
      setNotifications([]);
    } catch (err) {
      console.error('清空通知失败:', err);
    }
  };

  if (!user) return null;

  return (
    <div className="notification-container" ref={panelRef}>
      <button
        className="notification-bell-btn"
        onClick={handleBellClick}
        title="通知"
      >
        <span className="notification-bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <span className="notification-panel-title">
              通知中心
              {unreadCount > 0 && (
                <span className="notification-panel-count">
                  ({unreadCount}条未读)
                </span>
              )}
            </span>
            <div className="notification-panel-actions">
              {unreadCount > 0 && (
                <button
                  className="notification-action-btn"
                  onClick={handleMarkAllAsRead}
                >
                  全部已读
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  className="notification-action-btn danger"
                  onClick={handleClearAll}
                >
                  清空
                </button>
              )}
            </div>
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-empty">加载中...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <div className="notification-empty-icon">📭</div>
                <div>暂无通知</div>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${getNotificationTypeClass(notification.type)} ${
                    !notification.is_read ? 'unread' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content-wrapper">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-content">{notification.content}</div>
                    {notification.question_title && (
                      <div className="notification-question">
                        📌 {notification.question_title}
                      </div>
                    )}
                    <div className="notification-meta">
                      <span className="notification-time">
                        {formatTime(notification.created_at)}
                      </span>
                    </div>
                  </div>
                  <button
                    className="notification-delete-btn"
                    onClick={(e) => handleDeleteNotification(e, notification.id)}
                    title="删除"
                  >
                    ✕
                  </button>
                  {!notification.is_read && (
                    <div className="notification-unread-dot"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
