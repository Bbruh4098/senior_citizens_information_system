import { useState, useEffect } from 'react';
import { Button, Typography, Space } from 'antd';
import { DownloadOutlined, CloseOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Don't show if user previously dismissed
    if (localStorage.getItem('scis-pwa-dismissed')) return;

    // Don't show if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('scis-pwa-dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div style={styles.banner}>
      <Space align="center" style={{ flex: 1 }}>
        <img
          src="/pwa-192x192.png"
          alt="SCIS"
          style={styles.icon}
        />
        <div>
          <Text strong style={{ color: '#fff', fontSize: 14, display: 'block' }}>
            Install SCIS App
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>
            Add to home screen for quick access
          </Text>
        </div>
      </Space>
      <Space size={4}>
        <Button
          type="primary"
          size="small"
          icon={<DownloadOutlined />}
          onClick={handleInstall}
          style={styles.installBtn}
        >
          Install
        </Button>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={handleDismiss}
          style={styles.closeBtn}
          aria-label="Dismiss install prompt"
        />
      </Space>
    </div>
  );
}

const styles = {
  banner: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
    boxShadow: '0 -4px 20px rgba(67, 56, 202, 0.3)',
    zIndex: 10000,
    gap: 12,
    animation: 'slideUp 0.4s ease-out',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  installBtn: {
    background: '#fff',
    color: '#4338ca',
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
  },
  closeBtn: {
    color: 'rgba(255,255,255,0.8)',
  },
};
