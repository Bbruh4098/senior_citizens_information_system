import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Drawer } from 'antd';
import { MenuOutlined, CloseOutlined, UserOutlined } from '@ant-design/icons';

const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/services', label: 'Services' },
    { path: '/news', label: 'News' },
    { path: '/contact', label: 'Contact' },
];

const Navbar = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <header style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
            <nav style={{
                maxWidth: 1200,
                margin: '0 auto',
                padding: '0 24px',
                height: 70,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                {/* Logo */}
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                    <img
                        src="/osca_logo.jpg"
                        alt="OSCA Logo"
                        style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover' }}
                    />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 18, color: '#1f2937', lineHeight: 1.2 }}>SCIS</div>
                        <div style={{ fontSize: 11, color: '#6b7280', letterSpacing: 0.3 }}>Zamboanga City OSCA</div>
                    </div>
                </Link>

                {/* Desktop Nav */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="desktop-nav">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            style={{
                                textDecoration: 'none',
                                color: isActive(link.path) ? '#4338ca' : '#4b5563',
                                fontWeight: isActive(link.path) ? 600 : 500,
                                fontSize: 15,
                                transition: 'color 0.2s',
                                borderBottom: isActive(link.path) ? '2px solid #4338ca' : '2px solid transparent',
                                paddingBottom: 4,
                            }}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                {/* CTA Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="desktop-nav">
                    <Link to="/apply">
                        <Button
                            type="primary"
                            size="large"
                            style={{
                                background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
                                border: 'none',
                                borderRadius: 8,
                                fontWeight: 600,
                            }}
                        >
                            Pre-register
                        </Button>
                    </Link>
                    <Link to="/senior/login">
                        <Button
                            icon={<UserOutlined />}
                            style={{ borderRadius: 8, borderColor: '#059669', color: '#059669' }}
                        >
                            Senior Login
                        </Button>
                    </Link>
                    <Link to="/admin">
                        <Button
                            icon={<UserOutlined />}
                            style={{ borderRadius: 8 }}
                        >
                            {/* Staff Login */}
                        </Button>
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <Button
                    type="text"
                    icon={<MenuOutlined style={{ fontSize: 22 }} />}
                    onClick={() => setMobileOpen(true)}
                    className="mobile-menu-btn"
                    style={{ display: 'none' }}
                />

                {/* Mobile Drawer */}
                <Drawer
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img
                                src="/osca_logo.jpg"
                                alt="OSCA Logo"
                                style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }}
                            />
                            <span style={{ fontWeight: 600 }}>SCIS</span>
                        </div>
                    }
                    placement="right"
                    onClose={() => setMobileOpen(false)}
                    open={mobileOpen}
                    width={280}
                    closeIcon={<CloseOutlined />}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setMobileOpen(false)}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: 8,
                                    textDecoration: 'none',
                                    color: isActive(link.path) ? '#4338ca' : '#374151',
                                    background: isActive(link.path) ? '#eef2ff' : 'transparent',
                                    fontWeight: isActive(link.path) ? 600 : 500,
                                }}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div style={{ height: 1, background: '#e5e7eb', margin: '12px 0' }} />
                        <Link to="/apply" onClick={() => setMobileOpen(false)}>
                            <Button
                                type="primary"
                                block
                                size="large"
                                style={{
                                    background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontWeight: 600,
                                }}
                            >
                                Apply Online
                            </Button>
                        </Link>
                        <Link to="/senior/login" onClick={() => setMobileOpen(false)}>
                            <Button
                                icon={<UserOutlined />}
                                block
                                style={{ borderRadius: 8, borderColor: '#059669', color: '#059669', marginTop: 8 }}
                            >
                                Senior Login
                            </Button>
                        </Link>
                        <Link to="/admin" onClick={() => setMobileOpen(false)}>
                            <Button icon={<UserOutlined />} block style={{ borderRadius: 8, marginTop: 8 }}>
                                Staff Login
                            </Button>
                        </Link>
                    </div>
                </Drawer>
            </nav>

            <style>{`
                @media (max-width: 768px) {
                    .desktop-nav { display: none !important; }
                    .mobile-menu-btn { display: block !important; }
                }
            `}</style>
        </header>
    );
};

export default Navbar;
