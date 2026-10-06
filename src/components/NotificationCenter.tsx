import React from 'react';
import { useAlerts } from '../context/AlertContext.js';
import { useAuth } from '../context/AuthContext.js';

export const NotificationCenter: React.FC = () => {
  const { notifications, unreadCount, isDrawerOpen, closeDrawer, markAsRead, clearAll } = useAlerts();
  const { isAuthenticated, openAuthModal } = useAuth();

  if (!isDrawerOpen) return null;

  return (
    <div className="modal-overlay" onClick={closeDrawer} style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '100vh',
          maxHeight: '100vh',
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 25px rgba(0,0,0,0.5)',
          animation: 'slideInRight 0.25s ease-out'
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>In-App Notifications</h3>
            {unreadCount > 0 && (
              <span className="badge badge-bear" style={{ fontSize: '0.7rem' }}>
                {unreadCount} new
              </span>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={closeDrawer}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {!isAuthenticated ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Sign In to View Alerts
              </p>
              <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Create an account or sign in to set custom price alerts and receive real-time signal change notifications.
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  closeDrawer();
                  openAuthModal('login');
                }}
              >
                Sign In
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 0.75rem', opacity: 0.4 }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No notifications yet</p>
              <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                When your watchlist price alerts or technical setups trigger, they will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {notifications.map(n => (
                <div
                  key={n.id}
                  style={{
                    background: n.is_read ? 'var(--bg-surface)' : 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid',
                    borderColor: n.is_read ? 'var(--border-subtle)' : 'var(--color-primary-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <strong style={{ fontSize: '0.88rem', color: n.is_read ? 'var(--text-main)' : 'var(--color-primary)' }}>
                      {n.title}
                    </strong>
                    {!n.is_read && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', height: 'auto' }}
                        onClick={() => markAsRead(n.id)}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.45', marginBottom: '0.4rem' }}>
                    {n.message}
                  </p>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {isAuthenticated && notifications.length > 0 && (
          <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={clearAll} style={{ fontSize: '0.8rem' }}>
              Clear all notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
