import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Card,
    Row,
    Col,
    Typography,
    Button,
    Tag,
    Table,
    Divider,
    Empty,
    Alert,
    Spin,
} from 'antd';
import {
    GiftOutlined,
    SafetyOutlined,
    LogoutOutlined,
    ArrowLeftOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    DollarOutlined,
    MessageOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const SeniorBenefits = () => {
    const [senior, setSenior] = useState(null);
    const [benefitsData, setBenefitsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const storedSenior = localStorage.getItem('senior');
        if (!storedSenior) {
            navigate('/senior/login');
            return;
        }
        const seniorData = JSON.parse(storedSenior);
        setSenior(seniorData);
        fetchBenefits(seniorData.id);
    }, [navigate]);

    const fetchBenefits = async (seniorId) => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/senior/benefits`, {
                params: { senior_id: seniorId },
            });
            setBenefitsData(response.data.data);
        } catch (error) {
            console.error('Failed to fetch benefits:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('senior_token');
        localStorage.removeItem('senior');
        navigate('/senior/login');
    };

    const getStatusTag = (status) => {
        const config = {
            pending: { color: 'gold', icon: <ClockCircleOutlined />, text: 'Pending' },
            approved: { color: 'blue', icon: <CheckCircleOutlined />, text: 'Approved' },
            released: { color: 'green', icon: <DollarOutlined />, text: 'Released' },
            rejected: { color: 'red', icon: <CloseCircleOutlined />, text: 'Rejected' },
        };
        const { color, icon, text } = config[status] || { color: 'default', text: status };
        return <Tag color={color} icon={icon}>{text}</Tag>;
    };

    const claimsColumns = [
        {
            title: 'Benefit',
            dataIndex: 'benefit_type',
            key: 'benefit_type',
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount) => (
                <Text style={{ color: '#52c41a' }}>
                    ₱{parseFloat(amount).toLocaleString()}
                </Text>
            ),
        },
        {
            title: 'Year',
            dataIndex: 'claim_year',
            key: 'claim_year',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => getStatusTag(status),
        },
        {
            title: 'Date Filed',
            dataIndex: 'created_at',
            key: 'created_at',
        },
    ];

    if (!senior) return null;

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: 'white',
                padding: '24px',
            }}>
                <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <GiftOutlined style={{ fontSize: 28 }} />
                        <div>
                            <Title level={4} style={{ color: 'white', margin: 0 }}>My Benefits</Title>
                            <Text style={{ color: 'rgba(255,255,255,0.8)' }}>{senior.name}</Text>
                        </div>
                    </div>
                    <Button ghost onClick={handleLogout} icon={<LogoutOutlined />}>
                        Logout
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px' }}>
                {/* Back Button */}
                <Button
                    type="link"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/senior/dashboard')}
                    style={{ padding: 0, marginBottom: 16 }}
                >
                    Back to Dashboard
                </Button>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                        <Spin size="large" />
                        <div style={{ marginTop: 16 }}>Loading benefits information...</div>
                    </div>
                ) : benefitsData ? (
                    <>
                        {/* Age Info */}
                        <Alert
                            message={`You are ${benefitsData.age} years old`}
                            description="Based on your age, you may be eligible for various benefits. Check your eligibility status below."
                            type="info"
                            showIcon
                            style={{ marginBottom: 24, borderRadius: 12 }}
                        />

                        {/* Eligibility Cards */}
                        <Title level={4}>Benefit Eligibility</Title>
                        <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                            {benefitsData.eligibility?.map((benefit, index) => (
                                <Col xs={24} sm={12} md={8} key={index}>
                                    <Card
                                        style={{
                                            borderRadius: 12,
                                            borderColor: benefit.is_eligible
                                                ? benefit.has_claimed ? '#52c41a' : '#1890ff'
                                                : '#d9d9d9',
                                            borderWidth: 2,
                                        }}
                                        size="small"
                                    >
                                        <div style={{ textAlign: 'center' }}>
                                            <Text strong style={{ fontSize: 16 }}>{benefit.name}</Text>
                                            <div>
                                                <Text type="secondary">{benefit.age_range} years</Text>
                                            </div>
                                            <div style={{ margin: '12px 0' }}>
                                                <Text style={{ color: '#52c41a', fontSize: 18, fontWeight: 'bold' }}>
                                                    {benefit.formatted_amount}
                                                </Text>
                                            </div>
                                            <div>
                                                {!benefit.is_eligible ? (
                                                    <Tag color="default">Not Yet Eligible</Tag>
                                                ) : benefit.has_claimed ? (
                                                    <Tag color="green" icon={<CheckCircleOutlined />}>
                                                        {benefit.claim_status === 'released' ? 'Received' : 'Claimed'}
                                                    </Tag>
                                                ) : (
                                                    <Tag color="blue">Eligible - Not Yet Claimed</Tag>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </Col>
                            ))}
                        </Row>

                        <Divider />

                        {/* Claims History */}
                        <Title level={4} style={{ marginBottom: 16 }}>Claim History</Title>
                        {benefitsData.claims?.length > 0 ? (
                            <Table
                                columns={claimsColumns}
                                dataSource={benefitsData.claims}
                                rowKey="id"
                                pagination={false}
                                style={{ marginBottom: 24 }}
                            />
                        ) : (
                            <Card style={{ borderRadius: 12, textAlign: 'center', padding: 40, marginBottom: 24 }}>
                                <Empty
                                    description="No benefit claims yet"
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                />
                                <Paragraph type="secondary" style={{ marginTop: 16 }}>
                                    Visit your local OSCA office to claim eligible benefits.
                                </Paragraph>
                            </Card>
                        )}

                        <Divider />

                        {/* Complaints CTA */}
                        <Card
                            style={{ borderRadius: 12, cursor: 'pointer', background: '#fff5f5' }}
                            onClick={() => navigate('/senior/complaints')}
                            hoverable
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <MessageOutlined style={{ fontSize: 24, color: '#e74c3c' }} />
                                    <div>
                                        <Text strong>Have a concern about your benefits?</Text>
                                        <br />
                                        <Text type="secondary">File a complaint or check the status of your existing complaints</Text>
                                    </div>
                                </div>
                                <Button type="link" style={{ color: '#e74c3c' }}>
                                    Go to Complaints →
                                </Button>
                            </div>
                        </Card>

                        <Divider />

                        {/* Footer Info */}
                        <Card style={{ borderRadius: 12, background: '#f0f9ff' }}>
                            <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
                                <SafetyOutlined style={{ marginRight: 8 }} />
                                How to Claim Benefits
                            </Title>
                            <Paragraph style={{ marginBottom: 0 }}>
                                To claim your eligible benefits, please visit your local OSCA office with valid ID.
                                Bring your Senior Citizen ID and any supporting documents. Office hours are 8AM-5PM, Monday to Friday.
                            </Paragraph>
                        </Card>
                    </>
                ) : (
                    <Empty description="Unable to load benefits information" />
                )}

                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: 32 }}>
                    <Link to="/senior/dashboard" style={{ color: '#059669' }}>← Back to Dashboard</Link>
                </div>
            </div>
        </div>
    );
};

export default SeniorBenefits;
