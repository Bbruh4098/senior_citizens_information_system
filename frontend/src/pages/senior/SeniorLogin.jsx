import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Typography, message, Divider } from 'antd';
import {
    UserOutlined,
    MobileOutlined,
    LockOutlined,
    CheckCircleOutlined,
    SafetyCertificateOutlined,
    ReloadOutlined,
    ArrowLeftOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const SeniorLogin = () => {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loginMode, setLoginMode] = useState('otp');
    const [seniorId, setSeniorId] = useState(null);
    const [devOtp, setDevOtp] = useState(null);

    const [smsSent, setSmsSent] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [lastOtpValues, setLastOtpValues] = useState(null);
    const cooldownRef = useRef(null);
    const [form] = Form.useForm();
    const navigate = useNavigate();

    useEffect(() => {
        if (resendCooldown > 0) {
            cooldownRef.current = setTimeout(() => {
                setResendCooldown(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(cooldownRef.current);
        }
    }, [resendCooldown]);

    const handleRequestOtp = async (values) => {
        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/senior/request-otp`, values);
            setSeniorId(response.data.senior_id);
            setSmsSent(true);
            setLastOtpValues(values);
            setStep(1);
            setResendCooldown(60);
            if (response.data.demo_otp) {
                setDevOtp(response.data.demo_otp);
                message.info('Demo Mode: OTP is displayed on screen');
            } else {
                setDevOtp(null);
                message.success('OTP sent to your phone number via SMS');
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to send OTP';
            if (error.response?.status === 429) {
                message.warning(msg);
            } else {
                message.error(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (!lastOtpValues || resendCooldown > 0) return;
        await handleRequestOtp(lastOtpValues);
    };

    const handleVerifyOtp = async (values) => {
        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/senior/verify-otp`, {
                senior_id: seniorId,
                otp: values.otp,
                pin: values.pin,
            });
            localStorage.setItem('senior_token', response.data.token);
            localStorage.setItem('senior', JSON.stringify(response.data.senior));
            message.success('Login successful!');
            navigate('/senior/dashboard');
        } catch (error) {
            const msg = error.response?.data?.message || 'Verification failed';
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handlePinLogin = async (values) => {
        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/senior/login`, {
                osca_id: values.osca_id,
                pin: values.pin,
            });
            localStorage.setItem('senior_token', response.data.token);
            localStorage.setItem('senior', JSON.stringify(response.data.senior));
            message.success('Login successful!');
            navigate('/senior/dashboard');
        } catch (error) {
            const msg = error.response?.data?.message || 'Login failed';
            if (error.response?.data?.requires_otp) {
                setLoginMode('otp');
                message.info('Please use OTP login first to set up your account');
            } else {
                message.error(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    /* ─── Shared input style ─── */
    const inputStyle = {
        height: 48, borderRadius: 10,
        border: '1.5px solid #e5e7eb', fontSize: 15,
    };
    const pinInputStyle = {
        ...inputStyle, textAlign: 'center', letterSpacing: 8,
    };
    const labelStyle = { fontWeight: 500, color: '#374151' };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}>
            {/* ─── Left Panel: Branding ─── */}
            <div style={{
                flex: 1,
                background: 'linear-gradient(160deg, #064e3b 0%, #065f46 35%, #059669 70%, #34d399 100%)',
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
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 80px rgba(16,185,129,0.2)',
                    marginBottom: 32,
                    position: 'relative', zIndex: 1,
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
                        Senior Citizen
                    </Title>
                    <Title level={2} style={{
                        color: '#fff', margin: '0 0 12px', fontWeight: 700,
                        letterSpacing: '-0.02em', fontSize: 28,
                    }}>
                        Portal
                    </Title>

                    <div style={{
                        width: 48, height: 3, borderRadius: 2,
                        background: 'linear-gradient(90deg, #6ee7b7, #a7f3d0)',
                        margin: '0 auto 16px',
                    }} />

                    <Text style={{
                        color: 'rgba(255,255,255,0.7)', fontSize: 15,
                        lineHeight: 1.6, display: 'block', maxWidth: 320,
                    }}>
                        Access your profile, benefits,
                        <br />
                        and services online
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
                            Office of Senior Citizens Affairs
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
                overflowY: 'auto',
            }}>
                <div style={{ width: '100%', maxWidth: 420 }}>
                    {/* Header */}
                    <div style={{ marginBottom: 28 }}>
                        <Text style={{
                            color: '#059669', fontWeight: 600, fontSize: 13,
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                        }}>
                            Senior Citizen Portal
                        </Text>
                        <Title level={2} style={{
                            margin: '8px 0 0', color: '#064e3b',
                            fontWeight: 700, fontSize: 30, letterSpacing: '-0.02em',
                        }}>
                            Welcome
                        </Title>
                        <Text style={{ color: '#6b7280', fontSize: 15 }}>
                            Sign in to access your dashboard
                        </Text>
                    </div>

                    {/* Login Mode Toggle */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                        <Button
                            type={loginMode === 'otp' ? 'primary' : 'default'}
                            style={{
                                flex: 1, borderRadius: 10, height: 42, fontWeight: 500,
                                ...(loginMode === 'otp' ? {
                                    background: 'linear-gradient(135deg, #059669, #34d399)',
                                    border: 'none',
                                } : {}),
                            }}
                            onClick={() => { setLoginMode('otp'); setStep(0); form.resetFields(); }}
                        >
                            <MobileOutlined /> OTP Login
                        </Button>
                        <Button
                            type={loginMode === 'pin' ? 'primary' : 'default'}
                            style={{
                                flex: 1, borderRadius: 10, height: 42, fontWeight: 500,
                                ...(loginMode === 'pin' ? {
                                    background: 'linear-gradient(135deg, #059669, #34d399)',
                                    border: 'none',
                                } : {}),
                            }}
                            onClick={() => { setLoginMode('pin'); form.resetFields(); }}
                        >
                            <LockOutlined /> PIN Login
                        </Button>
                    </div>

                    {/* ─── OTP Login Flow ─── */}
                    {loginMode === 'otp' && (
                        <>
                            {step === 0 && (
                                <Form form={form} layout="vertical" onFinish={handleRequestOtp} requiredMark={false}>
                                    <Form.Item
                                        name="osca_id"
                                        label={<span style={labelStyle}>OSCA ID Number</span>}
                                        rules={[{ required: true, message: 'Enter your OSCA ID' }]}
                                    >
                                        <Input
                                            prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
                                            size="large"
                                            placeholder="e.g., 2024-12345"
                                            style={inputStyle}
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        name="phone_number"
                                        label={<span style={labelStyle}>Registered Phone Number</span>}
                                        rules={[{ required: true, message: 'Enter your phone number' }]}
                                    >
                                        <Input
                                            prefix={<MobileOutlined style={{ color: '#9ca3af' }} />}
                                            size="large"
                                            placeholder="09XX XXX XXXX"
                                            style={inputStyle}
                                        />
                                    </Form.Item>
                                    <Form.Item style={{ marginTop: 8 }}>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            size="large"
                                            block
                                            loading={loading}
                                            style={{
                                                height: 50, borderRadius: 10, fontSize: 16,
                                                fontWeight: 600, border: 'none',
                                                background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
                                                boxShadow: '0 4px 14px rgba(5,150,105,0.4)',
                                            }}
                                        >
                                            Send OTP
                                        </Button>
                                    </Form.Item>
                                </Form>
                            )}

                            {step === 1 && (
                                <Form form={form} layout="vertical" onFinish={handleVerifyOtp} requiredMark={false}>
                                    {devOtp && (
                                        <div style={{
                                            padding: '12px 16px',
                                            background: '#fffbeb',
                                            border: '1px solid #fde68a',
                                            borderRadius: 10,
                                            marginBottom: 20,
                                            textAlign: 'center',
                                        }}>
                                            <Text type="secondary">Dev OTP: </Text>
                                            <Text strong style={{ fontSize: 20, letterSpacing: 4 }}>{devOtp}</Text>
                                        </div>
                                    )}
                                    <Form.Item
                                        name="otp"
                                        label={<span style={labelStyle}>Enter OTP</span>}
                                        rules={[{ required: true, len: 6, message: 'Enter 6-digit OTP' }]}
                                    >
                                        <Input
                                            size="large"
                                            maxLength={6}
                                            placeholder="000000"
                                            style={{ ...pinInputStyle, fontSize: 20 }}
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        name="pin"
                                        label={<span style={labelStyle}>Set Your 6-Digit PIN</span>}
                                        extra="This PIN will be used for future logins"
                                        rules={[{ required: true, len: 6, message: 'Set a 6-digit PIN' }]}
                                    >
                                        <Input.Password
                                            size="large"
                                            maxLength={6}
                                            placeholder="••••••"
                                            style={pinInputStyle}
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        name="confirm_pin"
                                        label={<span style={labelStyle}>Confirm PIN</span>}
                                        dependencies={['pin']}
                                        rules={[
                                            { required: true, len: 6, message: 'Please confirm your PIN' },
                                            ({ getFieldValue }) => ({
                                                validator(_, value) {
                                                    if (!value || getFieldValue('pin') === value) {
                                                        return Promise.resolve();
                                                    }
                                                    return Promise.reject(new Error('PINs do not match'));
                                                },
                                            }),
                                        ]}
                                    >
                                        <Input.Password
                                            size="large"
                                            maxLength={6}
                                            placeholder="••••••"
                                            style={pinInputStyle}
                                        />
                                    </Form.Item>
                                    <Form.Item style={{ marginTop: 8 }}>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            size="large"
                                            block
                                            loading={loading}
                                            style={{
                                                height: 50, borderRadius: 10, fontSize: 16,
                                                fontWeight: 600, border: 'none',
                                                background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
                                                boxShadow: '0 4px 14px rgba(5,150,105,0.4)',
                                            }}
                                        >
                                            <CheckCircleOutlined /> Verify & Login
                                        </Button>
                                    </Form.Item>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Button type="link" onClick={() => setStep(0)} style={{ color: '#059669', padding: 0 }}>
                                            <ArrowLeftOutlined /> Back
                                        </Button>
                                        <Button
                                            type="link"
                                            icon={<ReloadOutlined />}
                                            disabled={resendCooldown > 0}
                                            loading={loading}
                                            onClick={handleResendOtp}
                                            style={{ color: '#059669', padding: 0 }}
                                        >
                                            {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend OTP'}
                                        </Button>
                                    </div>
                                </Form>
                            )}
                        </>
                    )}

                    {/* ─── PIN Login ─── */}
                    {loginMode === 'pin' && (
                        <Form form={form} layout="vertical" onFinish={handlePinLogin} requiredMark={false}>
                            <Form.Item
                                name="osca_id"
                                label={<span style={labelStyle}>OSCA ID Number</span>}
                                rules={[{ required: true, message: 'Enter your OSCA ID' }]}
                            >
                                <Input
                                    prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
                                    size="large"
                                    placeholder="e.g., 2024-12345"
                                    style={inputStyle}
                                />
                            </Form.Item>
                            <Form.Item
                                name="pin"
                                label={<span style={labelStyle}>Your 6-Digit PIN</span>}
                                rules={[{ required: true, len: 6, message: 'Enter your 6-digit PIN' }]}
                            >
                                <Input.Password
                                    size="large"
                                    maxLength={6}
                                    placeholder="••••••"
                                    style={pinInputStyle}
                                />
                            </Form.Item>
                            <Form.Item style={{ marginTop: 8 }}>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    size="large"
                                    block
                                    loading={loading}
                                    style={{
                                        height: 50, borderRadius: 10, fontSize: 16,
                                        fontWeight: 600, border: 'none',
                                        background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
                                        boxShadow: '0 4px 14px rgba(5,150,105,0.4)',
                                    }}
                                >
                                    Sign In
                                </Button>
                            </Form.Item>
                        </Form>
                    )}

                    <Divider style={{ margin: '20px 0', borderColor: '#e5e7eb' }} />

                    {/* Footer */}
                    <div style={{ textAlign: 'center' }}>
                        <Link to="/" style={{ color: '#059669', fontWeight: 500, fontSize: 14 }}>
                            <ArrowLeftOutlined /> Back to Home
                        </Link>
                        <br />
                        <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 8, display: 'inline-block' }}>
                            © {new Date().getFullYear()} SCIS — Office of Senior Citizens Affairs, Zamboanga City
                        </Text>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeniorLogin;
