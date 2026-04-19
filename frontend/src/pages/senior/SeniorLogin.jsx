import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Typography, message, Divider, Radio } from 'antd';
import {
    UserOutlined,
    MobileOutlined,
    MailOutlined,
    LockOutlined,
    CheckCircleOutlined,
    SafetyCertificateOutlined,
    ReloadOutlined,
    ArrowLeftOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

/* ────────────────────────────────────────────────────────────────
   Turnstile CAPTCHA component (Cloudflare)
   ──────────────────────────────────────────────────────────────── */
const TurnstileWidget = ({ onVerify, onExpire, resetKey }) => {
    const containerRef = useRef(null);
    const widgetIdRef = useRef(null);

    useEffect(() => {
        if (!TURNSTILE_SITE_KEY || !window.turnstile) return;

        // Clean up previous widget
        if (widgetIdRef.current !== null) {
            try { window.turnstile.remove(widgetIdRef.current); } catch {}
            widgetIdRef.current = null;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            callback: (token) => onVerify?.(token),
            'expired-callback': () => onExpire?.(),
            theme: 'light',
            size: 'normal',
        });

        return () => {
            if (widgetIdRef.current !== null) {
                try { window.turnstile.remove(widgetIdRef.current); } catch {}
                widgetIdRef.current = null;
            }
        };
    }, [resetKey]);

    if (!TURNSTILE_SITE_KEY) return null;
    return <div ref={containerRef} style={{ marginBottom: 16 }} />;
};

/* ────────────────────────────────────────────────────────────────
   Main Component
   ──────────────────────────────────────────────────────────────── */
const SeniorLogin = () => {
    // Views: 'login' | 'signup' | 'forgot' | 'otp'
    const [view, setView] = useState('login');
    const [loading, setLoading] = useState(false);
    const [seniorId, setSeniorId] = useState(null);

    // OTP state
    const [otpChannel, setOtpChannel] = useState('phone'); // 'phone' | 'email'
    const [otpMessage, setOtpMessage] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [lastOtpValues, setLastOtpValues] = useState(null);
    const cooldownRef = useRef(null);

    // Turnstile
    const [turnstileToken, setTurnstileToken] = useState(null);
    const [turnstileResetKey, setTurnstileResetKey] = useState(0);

    const [form] = Form.useForm();
    const navigate = useNavigate();

    // Track whether the current OTP flow is for 'signup' or 'forgot'
    const [otpPurpose, setOtpPurpose] = useState('signup');

    // Cooldown timer
    useEffect(() => {
        if (resendCooldown > 0) {
            cooldownRef.current = setTimeout(() => {
                setResendCooldown(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(cooldownRef.current);
        }
    }, [resendCooldown]);

    /* ─── Login with PIN ─── */
    const handleLogin = async (values) => {
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
                message.info('Please sign up first to set up your account');
                switchView('signup');
            } else {
                message.error(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    /* ─── Request OTP (used by both Sign Up and Forgot PIN) ─── */
    const handleRequestOtp = async (values) => {
        if (TURNSTILE_SITE_KEY && !turnstileToken) {
            message.warning('Please complete the verification check');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                osca_id: values.osca_id,
                otp_channel: otpChannel,
                turnstile_token: turnstileToken,
            };

            const response = await axios.post(`${API_URL}/senior/request-otp`, payload);
            setSeniorId(response.data.senior_id);
            setOtpMessage(response.data.message || 'OTP sent');
            setLastOtpValues(values);
            setResendCooldown(60);
            setView('otp');
            message.success(response.data.message || 'OTP sent successfully');
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to send OTP';
            if (error.response?.status === 429) {
                message.warning(msg);
            } else {
                message.error(msg);
            }
        } finally {
            setLoading(false);
            setTurnstileToken(null);
            setTurnstileResetKey(k => k + 1);
        }
    };

    /* ─── Resend OTP ─── */
    const handleResendOtp = async () => {
        if (!lastOtpValues || resendCooldown > 0) return;
        // Bypass captcha for resend since it was already verified
        setLoading(true);
        try {
            const payload = {
                osca_id: lastOtpValues.osca_id,
                otp_channel: otpChannel,
                skip_turnstile: true,
            };
            const response = await axios.post(`${API_URL}/senior/request-otp`, payload);
            setSeniorId(response.data.senior_id);
            setResendCooldown(60);
            message.success('OTP resent');
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to resend OTP');
        } finally {
            setLoading(false);
        }
    };

    /* ─── Verify OTP + Set PIN ─── */
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
            message.success(otpPurpose === 'forgot' ? 'PIN reset successful!' : 'Account created! Welcome!');
            navigate('/senior/dashboard');
        } catch (error) {
            const msg = error.response?.data?.message || 'Verification failed';
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    /* ─── View switcher ─── */
    const switchView = useCallback((newView) => {
        form.resetFields();
        setTurnstileToken(null);
        setTurnstileResetKey(k => k + 1);
        setView(newView);
        if (newView === 'signup') setOtpPurpose('signup');
        if (newView === 'forgot') setOtpPurpose('forgot');
    }, [form]);

    /* ─── Shared styles ─── */
    const inputStyle = {
        height: 48, borderRadius: 10,
        border: '1.5px solid #e5e7eb', fontSize: 15,
    };
    const pinInputStyle = {
        ...inputStyle, textAlign: 'center', letterSpacing: 8,
    };
    const labelStyle = { fontWeight: 500, color: '#374151' };
    const primaryBtnStyle = {
        height: 50, borderRadius: 10, fontSize: 16,
        fontWeight: 600, border: 'none',
        background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
        boxShadow: '0 4px 14px rgba(5,150,105,0.4)',
    };

    /* ─── Render helper: Masked destination ─── */
    const renderOtpBanner = () => {
        if (!otpMessage) return null;
        return (
            <div style={{
                padding: '14px 16px',
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                border: '1px solid #a7f3d0',
                borderRadius: 10,
                marginBottom: 20,
                textAlign: 'center',
            }}>
                <CheckCircleOutlined style={{ color: '#059669', marginRight: 8 }} />
                <Text style={{ color: '#065f46', fontSize: 13 }}>{otpMessage}</Text>
            </div>
        );
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

            {/* ─── Right Panel: Forms ─── */}
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

                    {/* LOGIN VIEW */}
                    {view === 'login' && (
                        <>
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
                                    Welcome Back
                                </Title>
                                <Text style={{ color: '#6b7280', fontSize: 15 }}>
                                    Sign in to access your dashboard
                                </Text>
                            </div>

                            <Form form={form} layout="vertical" onFinish={handleLogin} requiredMark={false}>
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
                                    label={<span style={labelStyle}>6-Digit PIN</span>}
                                    rules={[{ required: true, len: 6, message: 'Enter your 6-digit PIN' }]}
                                >
                                    <Input.Password
                                        prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                                        size="large"
                                        maxLength={6}
                                        placeholder="••••••"
                                        style={{ ...pinInputStyle, paddingLeft: 40 }}
                                    />
                                </Form.Item>

                                <Form.Item style={{ marginTop: 8, marginBottom: 12 }}>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        size="large"
                                        block
                                        loading={loading}
                                        style={primaryBtnStyle}
                                    >
                                        Log In
                                    </Button>
                                </Form.Item>
                            </Form>

                            {/* Forgot PIN */}
                            <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                <Button
                                    type="link"
                                    onClick={() => switchView('forgot')}
                                    style={{ color: '#059669', fontWeight: 500, fontSize: 14, padding: 0 }}
                                >
                                    Forgot PIN?
                                </Button>
                            </div>

                            <Divider style={{ margin: '16px 0', borderColor: '#e5e7eb' }}>
                                <Text style={{ color: '#9ca3af', fontSize: 12 }}>or</Text>
                            </Divider>

                            {/* Sign Up button */}
                            <Button
                                size="large"
                                block
                                onClick={() => switchView('signup')}
                                style={{
                                    height: 50, borderRadius: 10, fontSize: 16,
                                    fontWeight: 600, color: '#059669',
                                    border: '2px solid #059669',
                                    background: 'transparent',
                                }}
                            >
                                Sign Up
                            </Button>
                        </>
                    )}

                    {/* SIGN UP VIEW / FORGOT PIN VIEW */}
                    {(view === 'signup' || view === 'forgot') && (
                        <>
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
                                    {view === 'forgot' ? 'Reset PIN' : 'Create Account'}
                                </Title>
                                <Text style={{ color: '#6b7280', fontSize: 15 }}>
                                    {view === 'forgot'
                                        ? 'Verify your identity to reset your PIN'
                                        : 'Verify your identity to set up your account'}
                                </Text>
                            </div>

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

                                {/* OTP Channel Selection */}
                                <Form.Item label={<span style={labelStyle}>Send OTP via</span>}>
                                    <Radio.Group
                                        value={otpChannel}
                                        onChange={(e) => setOtpChannel(e.target.value)}
                                        style={{ width: '100%' }}
                                    >
                                        <Radio.Button
                                            value="phone"
                                            style={{
                                                width: '50%', textAlign: 'center',
                                                height: 42, lineHeight: '42px',
                                                borderRadius: '10px 0 0 10px',
                                                fontWeight: 500,
                                            }}
                                        >
                                            <MobileOutlined /> Phone
                                        </Radio.Button>
                                        <Radio.Button
                                            value="email"
                                            style={{
                                                width: '50%', textAlign: 'center',
                                                height: 42, lineHeight: '42px',
                                                borderRadius: '0 10px 10px 0',
                                                fontWeight: 500,
                                            }}
                                        >
                                            <MailOutlined /> Email
                                        </Radio.Button>
                                    </Radio.Group>
                                </Form.Item>

                                {/* Channel info message */}
                                <div style={{
                                    padding: '12px 16px',
                                    background: '#f0fdf4',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: 10,
                                    marginBottom: 20,
                                }}>
                                    <Text style={{ color: '#166534', fontSize: 13 }}>
                                        {otpChannel === 'phone' ? (
                                            <><MobileOutlined style={{ marginRight: 6 }} />OTP will be sent to the phone number registered with your OSCA account.</>
                                        ) : (
                                            <><MailOutlined style={{ marginRight: 6 }} />OTP will be sent to the email address registered with your OSCA account.</>
                                        )}
                                    </Text>
                                </div>

                                {/* Turnstile CAPTCHA */}
                                <TurnstileWidget
                                    onVerify={(token) => setTurnstileToken(token)}
                                    onExpire={() => setTurnstileToken(null)}
                                    resetKey={turnstileResetKey}
                                />

                                <Form.Item style={{ marginTop: 8, marginBottom: 12 }}>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        size="large"
                                        block
                                        loading={loading}
                                        disabled={TURNSTILE_SITE_KEY && !turnstileToken}
                                        style={{
                                            ...primaryBtnStyle,
                                            opacity: (TURNSTILE_SITE_KEY && !turnstileToken) ? 0.6 : 1,
                                        }}
                                    >
                                        {view === 'forgot' ? 'Send Reset Code' : 'Sign Up'}
                                    </Button>
                                </Form.Item>
                            </Form>

                            {/* Switch link */}
                            <div style={{ textAlign: 'center', marginTop: 8 }}>
                                <Text style={{ color: '#6b7280', fontSize: 14 }}>
                                    {view === 'forgot' ? 'Remember your PIN? ' : 'Already have a PIN? '}
                                </Text>
                                <Button
                                    type="link"
                                    onClick={() => switchView('login')}
                                    style={{ color: '#059669', fontWeight: 600, fontSize: 14, padding: 0 }}
                                >
                                    Log in
                                </Button>
                            </div>
                        </>
                    )}

                    {/* OTP VERIFICATION VIEW */}
                    {view === 'otp' && (
                        <>
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
                                    Verify OTP
                                </Title>
                                <Text style={{ color: '#6b7280', fontSize: 15 }}>
                                    Enter the code sent to your {otpChannel === 'email' ? 'email' : 'phone'}
                                </Text>
                            </div>

                            {renderOtpBanner()}

                            <Form form={form} layout="vertical" onFinish={handleVerifyOtp} requiredMark={false}>
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
                                    label={<span style={labelStyle}>
                                        {otpPurpose === 'forgot' ? 'Set New 6-Digit PIN' : 'Set Your 6-Digit PIN'}
                                    </span>}
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
                                        style={primaryBtnStyle}
                                    >
                                        <CheckCircleOutlined /> Verify & {otpPurpose === 'forgot' ? 'Reset PIN' : 'Create Account'}
                                    </Button>
                                </Form.Item>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Button
                                        type="link"
                                        onClick={() => switchView(otpPurpose === 'forgot' ? 'forgot' : 'signup')}
                                        style={{ color: '#059669', padding: 0 }}
                                    >
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
                        </>
                    )}

                    {/* ─── Footer ─── */}
                    <Divider style={{ margin: '20px 0', borderColor: '#e5e7eb' }} />
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
