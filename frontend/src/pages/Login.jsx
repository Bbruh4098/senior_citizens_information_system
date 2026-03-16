import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const Login = () => {
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            await login(values.username, values.password);
            message.success('Login successful!');
            navigate('/admin/dashboard');
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}>
            {/* ─── Left Panel: Branding ─── */}
            <div style={{
                flex: 1,
                background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 35%, #4338ca 70%, #6366f1 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                padding: '48px 40px',
            }}>
                {/* Decorative circles */}
                <div style={{
                    position: 'absolute', top: -80, left: -80,
                    width: 300, height: 300, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.04)',
                }} />
                <div style={{
                    position: 'absolute', bottom: -120, right: -60,
                    width: 400, height: 400, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.03)',
                }} />
                <div style={{
                    position: 'absolute', top: '30%', right: -40,
                    width: 200, height: 200, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.02)',
                }} />

                {/* Logo */}
                <div style={{
                    width: 160, height: 160, borderRadius: '50%',
                    overflow: 'hidden',
                    border: '4px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 80px rgba(99,102,241,0.2)',
                    marginBottom: 32,
                    position: 'relative',
                    zIndex: 1,
                }}>
                    <img
                        src="/images/osca_logo.jpg"
                        alt="City of Zamboanga Official Seal"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>

                {/* Title */}
                <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    <Title level={2} style={{
                        color: '#fff', margin: 0, fontWeight: 700,
                        letterSpacing: '-0.02em', fontSize: 28,
                    }}>
                        Senior Citizens
                    </Title>
                    <Title level={2} style={{
                        color: '#fff', margin: '0 0 12px', fontWeight: 700,
                        letterSpacing: '-0.02em', fontSize: 28,
                    }}>
                        Information System
                    </Title>

                    <div style={{
                        width: 48, height: 3, borderRadius: 2,
                        background: 'linear-gradient(90deg, #818cf8, #a5b4fc)',
                        margin: '0 auto 16px',
                    }} />

                    <Text style={{
                        color: 'rgba(255,255,255,0.7)', fontSize: 15,
                        lineHeight: 1.6, display: 'block', maxWidth: 320,
                    }}>
                        Office of Senior Citizens Affairs
                        <br />
                        City Government of Zamboanga
                    </Text>
                </div>

                {/* Bottom badge */}
                <div style={{
                    position: 'absolute', bottom: 32, left: 0, right: 0,
                    display: 'flex', justifyContent: 'center', zIndex: 1,
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 20px', borderRadius: 24,
                        background: 'rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                        <SafetyCertificateOutlined style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }} />
                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                            Made by Starcode Corporation.
                        </Text>
                    </div>
                </div>
            </div>

            {/* ─── Right Panel: Login Form ─── */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fafbfc',
                padding: '48px 40px',
                minHeight: '100vh',
            }}>
                <div style={{ width: '100%', maxWidth: 400 }}>
                    {/* Mobile-only logo (hidden on desktop) */}
                    <div className="login-mobile-logo" style={{ display: 'none' }}>
                        <img
                            src="/images/osca_logo.jpg"
                            alt="OSCA Logo"
                            style={{
                                width: 64, height: 64, borderRadius: '50%',
                                objectFit: 'cover', margin: '0 auto 16px', display: 'block',
                                border: '3px solid #e0e7ff',
                            }}
                        />
                    </div>

                    {/* Header */}
                    <div style={{ marginBottom: 36 }}>
                        <Text style={{
                            color: '#6366f1', fontWeight: 600, fontSize: 13,
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                        }}>
                            Admin Portal
                        </Text>
                        <Title level={2} style={{
                            margin: '8px 0 0', color: '#1e1b4b',
                            fontWeight: 700, fontSize: 30, letterSpacing: '-0.02em',
                        }}>
                            Welcome back
                        </Title>
                        <Text style={{ color: '#6b7280', fontSize: 15 }}>
                            Sign in to access the dashboard
                        </Text>
                    </div>

                    {/* Form */}
                    <Form
                        name="login"
                        onFinish={onFinish}
                        layout="vertical"
                        size="large"
                        requiredMark={false}
                    >
                        <Form.Item
                            name="username"
                            label={<span style={{ fontWeight: 500, color: '#374151' }}>Username</span>}
                            rules={[{ required: true, message: 'Please enter your username' }]}
                        >
                            <Input
                                prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
                                placeholder="Enter your username"
                                autoComplete="username"
                                style={{
                                    height: 48, borderRadius: 10,
                                    border: '1.5px solid #e5e7eb',
                                    fontSize: 15,
                                }}
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label={<span style={{ fontWeight: 500, color: '#374151' }}>Password</span>}
                            rules={[{ required: true, message: 'Please enter your password' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                style={{
                                    height: 48, borderRadius: 10,
                                    border: '1.5px solid #e5e7eb',
                                    fontSize: 15,
                                }}
                            />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 16, marginTop: 8 }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                block
                                style={{
                                    height: 50, borderRadius: 10,
                                    fontSize: 16, fontWeight: 600,
                                    background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
                                    border: 'none',
                                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                                }}
                            >
                                Sign In
                            </Button>
                        </Form.Item>
                    </Form>

                    <Divider style={{ margin: '24px 0', borderColor: '#e5e7eb' }} />

                    {/* Footer */}
                    <div style={{ textAlign: 'center' }}>
                        <Text style={{ color: '#9ca3af', fontSize: 12 }}>
                            © {new Date().getFullYear()} SCIS — Office of Senior Citizens Affairs, Zamboanga City
                        </Text>
                    </div>
                </div>
            </div>

            {/* ─── Responsive Styles ─── */}
            <style>{`
                @media (max-width: 768px) {
                    /* Stack panels vertically on mobile */
                    div:has(> .login-mobile-logo) {
                        /* Right panel adjustments handled by parent flex */
                    }
                    .login-mobile-logo {
                        display: block !important;
                        text-align: center;
                        margin-bottom: 8px;
                    }
                }
            `}</style>
        </div>
    );
};

export default Login;
