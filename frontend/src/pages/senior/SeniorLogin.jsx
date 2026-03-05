import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Steps, message, Result } from 'antd';
import {
    UserOutlined,
    MobileOutlined,
    LockOutlined,
    CheckCircleOutlined,
    SafetyOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Paragraph, Text } = Typography;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const SeniorLogin = () => {
    const [step, setStep] = useState(0); // 0: OSCA ID, 1: OTP, 2: PIN Setup/Login
    const [loading, setLoading] = useState(false);
    const [loginMode, setLoginMode] = useState('otp'); // 'otp' or 'pin'
    const [seniorId, setSeniorId] = useState(null);
    const [needsPinSetup, setNeedsPinSetup] = useState(false);

    const [smsSent, setSmsSent] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [lastOtpValues, setLastOtpValues] = useState(null);
    const cooldownRef = useRef(null);
    const [form] = Form.useForm();
    const navigate = useNavigate();

    // Cooldown timer effect
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
            message.success('OTP sent to your phone number via SMS');
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

            // Store token and senior data
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

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
        }}>
            <Card style={{
                width: '100%',
                maxWidth: 440,
                borderRadius: 16,
                boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <SafetyOutlined style={{ fontSize: 48, color: '#4338ca', marginBottom: 16 }} />
                    <Title level={3} style={{ marginBottom: 8 }}>Senior Citizen Portal</Title>
                    <Paragraph type="secondary">
                        Access your profile, benefits, and services
                    </Paragraph>
                </div>

                {/* Login Mode Toggle */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                    <Button
                        type={loginMode === 'otp' ? 'primary' : 'default'}
                        style={{ flex: 1, borderRadius: 8 }}
                        onClick={() => { setLoginMode('otp'); setStep(0); }}
                    >
                        <MobileOutlined /> OTP Login
                    </Button>
                    <Button
                        type={loginMode === 'pin' ? 'primary' : 'default'}
                        style={{ flex: 1, borderRadius: 8 }}
                        onClick={() => setLoginMode('pin')}
                    >
                        <LockOutlined /> PIN Login
                    </Button>
                </div>

                {/* OTP Login Flow */}
                {loginMode === 'otp' && (
                    <>
                        {step === 0 && (
                            <Form form={form} layout="vertical" onFinish={handleRequestOtp}>
                                <Form.Item
                                    name="osca_id"
                                    label="OSCA ID Number"
                                    rules={[{ required: true, message: 'Enter your OSCA ID' }]}
                                >
                                    <Input
                                        prefix={<UserOutlined />}
                                        size="large"
                                        placeholder="e.g., 2024-12345"
                                        style={{ borderRadius: 8 }}
                                    />
                                </Form.Item>
                                <Form.Item
                                    name="phone_number"
                                    label="Registered Phone Number"
                                    rules={[{ required: true, message: 'Enter your phone number' }]}
                                >
                                    <Input
                                        prefix={<MobileOutlined />}
                                        size="large"
                                        placeholder="09XX XXX XXXX"
                                        style={{ borderRadius: 8 }}
                                    />
                                </Form.Item>
                                <Form.Item>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        size="large"
                                        block
                                        loading={loading}
                                        style={{ borderRadius: 8, background: '#4338ca' }}
                                    >
                                        Send OTP
                                    </Button>
                                </Form.Item>
                            </Form>
                        )}

                        {step === 1 && (
                            <Form form={form} layout="vertical" onFinish={handleVerifyOtp}>
                                {devOtp && (
                                    <div style={{
                                        padding: 12,
                                        background: '#fff7e6',
                                        border: '1px solid #ffd591',
                                        borderRadius: 8,
                                        marginBottom: 16,
                                        textAlign: 'center',
                                    }}>
                                        <Text type="secondary">Dev OTP: </Text>
                                        <Text strong style={{ fontSize: 18, letterSpacing: 2 }}>{devOtp}</Text>
                                    </div>
                                )}
                                <Form.Item
                                    name="otp"
                                    label="Enter OTP"
                                    rules={[{ required: true, len: 6, message: 'Enter 6-digit OTP' }]}
                                >
                                    <Input
                                        size="large"
                                        maxLength={6}
                                        placeholder="000000"
                                        style={{ borderRadius: 8, textAlign: 'center', letterSpacing: 8, fontSize: 20 }}
                                    />
                                </Form.Item>
                                <Form.Item
                                    name="pin"
                                    label="Set Your 6-Digit PIN (for future logins)"
                                    rules={[{ required: true, len: 6, message: 'Set a 6-digit PIN' }]}
                                >
                                    <Input.Password
                                        size="large"
                                        maxLength={6}
                                        placeholder="••••••"
                                        style={{ borderRadius: 8, textAlign: 'center', letterSpacing: 8 }}
                                    />
                                </Form.Item>
                                <Form.Item>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        size="large"
                                        block
                                        loading={loading}
                                        style={{ borderRadius: 8, background: '#059669' }}
                                    >
                                        <CheckCircleOutlined /> Verify & Login
                                    </Button>
                                </Form.Item>
                                <Button type="link" block onClick={() => setStep(0)}>
                                    ← Back to OSCA ID
                                </Button>
                                <Button
                                    type="link"
                                    block
                                    icon={<ReloadOutlined />}
                                    disabled={resendCooldown > 0}
                                    loading={loading}
                                    onClick={handleResendOtp}
                                    style={{ marginTop: 4 }}
                                >
                                    {resendCooldown > 0
                                        ? `Resend OTP (${resendCooldown}s)`
                                        : 'Resend OTP'}
                                </Button>
                            </Form>
                        )}
                    </>
                )}

                {/* PIN Login */}
                {loginMode === 'pin' && (
                    <Form form={form} layout="vertical" onFinish={handlePinLogin}>
                        <Form.Item
                            name="osca_id"
                            label="OSCA ID Number"
                            rules={[{ required: true, message: 'Enter your OSCA ID' }]}
                        >
                            <Input
                                prefix={<UserOutlined />}
                                size="large"
                                placeholder="e.g., 2024-12345"
                                style={{ borderRadius: 8 }}
                            />
                        </Form.Item>
                        <Form.Item
                            name="pin"
                            label="Your 6-Digit PIN"
                            rules={[{ required: true, len: 6, message: 'Enter your 6-digit PIN' }]}
                        >
                            <Input.Password
                                size="large"
                                maxLength={6}
                                placeholder="••••••"
                                style={{ borderRadius: 8, textAlign: 'center', letterSpacing: 8 }}
                            />
                        </Form.Item>
                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                block
                                loading={loading}
                                style={{ borderRadius: 8, background: '#4338ca' }}
                            >
                                Login
                            </Button>
                        </Form.Item>
                    </Form>
                )}

                <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <Link to="/" style={{ color: '#4338ca' }}>← Back to Home</Link>
                </div>
            </Card>
        </div>
    );
};

export default SeniorLogin;
