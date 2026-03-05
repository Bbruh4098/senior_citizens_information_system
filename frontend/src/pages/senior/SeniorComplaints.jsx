import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Card,
    Typography,
    Button,
    Tag,
    Modal,
    Form,
    Input,
    Select,
    message,
    Space,
    Badge,
    Empty,
    Spin,
    Divider,
} from 'antd';
import {
    ExclamationCircleOutlined,
    MessageOutlined,
    LogoutOutlined,
    ArrowLeftOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const CATEGORIES = [
    { value: 'benefit', label: 'Benefit Issue', color: '#1890ff', description: 'Issues related to benefit amounts, eligibility, or claims' },
    { value: 'service', label: 'Service Concern', color: '#722ed1', description: 'Concerns about OSCA services or processes' },
    { value: 'facility', label: 'Facility Issue', color: '#fa8c16', description: 'Problems with OSCA office facilities' },
    { value: 'staff', label: 'Staff Concern', color: '#eb2f96', description: 'Concerns regarding OSCA staff conduct' },
    { value: 'other', label: 'Other', color: '#8c8c8c', description: 'Other concerns not listed above' },
];

const COOLDOWN_SECONDS = 120; 

const SeniorComplaints = () => {
    const [senior, setSenior] = useState(null);
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [complaintModal, setComplaintModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [benefitClaims, setBenefitClaims] = useState([]);
    const [complaintForm] = Form.useForm();
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const storedSenior = localStorage.getItem('senior');
        if (!storedSenior) {
            navigate('/senior/login');
            return;
        }
        const seniorData = JSON.parse(storedSenior);
        setSenior(seniorData);
        fetchComplaints(seniorData.id);
        fetchBenefitClaims(seniorData.id);
    }, [navigate]);

    // Cooldown countdown timer
    useEffect(() => {
        if (cooldownRemaining <= 0) return;
        const timer = setInterval(() => {
            setCooldownRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldownRemaining]);

    const fetchComplaints = async (seniorId) => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/senior/complaints`, {
                params: { senior_id: seniorId },
            });
            setComplaints(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch complaints:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBenefitClaims = async (seniorId) => {
        try {
            const response = await axios.get(`${API_URL}/senior/benefits`, {
                params: { senior_id: seniorId },
            });
            setBenefitClaims(response.data.data?.claims || []);
        } catch (error) {
            console.error('Failed to fetch benefit claims:', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('senior_token');
        localStorage.removeItem('senior');
        navigate('/senior/login');
    };

    const getStatusTag = (status) => {
        const config = {
            open: { color: 'red', icon: <ExclamationCircleOutlined />, text: 'Open' },
            in_review: { color: 'gold', icon: <ClockCircleOutlined />, text: 'In Review' },
            resolved: { color: 'green', icon: <CheckCircleOutlined />, text: 'Resolved' },
            closed: { color: 'default', icon: <CloseCircleOutlined />, text: 'Closed' },
        };
        const { color, icon, text } = config[status] || { color: 'default', text: status };
        return <Tag color={color} icon={icon}>{text}</Tag>;
    };

    const getCategoryTag = (category) => {
        const cat = CATEGORIES.find(c => c.value === category);
        return <Tag color={cat?.color || '#8c8c8c'}>{cat?.label || category}</Tag>;
    };

    const openComplaintModal = () => {
        complaintForm.resetFields();
        setSelectedCategory(null);
        setComplaintModal(true);
    };

    const handleSubmitComplaint = async () => {
        try {
            const values = await complaintForm.validateFields();
            setSubmitting(true);
            await axios.post(`${API_URL}/senior/complaints`, {
                senior_id: senior.id,
                category: values.category,
                subject: values.subject,
                message: values.message,
                benefit_claim_id: values.benefit_claim_id || null,
            });
            message.success('Complaint filed successfully!');
            setComplaintModal(false);
            setCooldownRemaining(COOLDOWN_SECONDS);
            fetchComplaints(senior.id);
        } catch (error) {
            if (error.response?.status === 429) {
                message.warning(error.response.data?.message || 'Please wait before filing another complaint.');
                setCooldownRemaining(COOLDOWN_SECONDS);
                setComplaintModal(false);
            } else {
                message.error('Failed to file complaint. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const openCount = complaints.filter(c => c.status === 'open' || c.status === 'in_review').length;

    if (!senior) return null;

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)',
                color: 'white',
                padding: '24px',
            }}>
                <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <MessageOutlined style={{ fontSize: 28 }} />
                        <div>
                            <Title level={4} style={{ color: 'white', margin: 0 }}>My Complaints</Title>
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

                {/* File Complaint Button */}
                <Card style={{ borderRadius: 12, marginBottom: 24, textAlign: 'center', background: cooldownRemaining > 0 ? '#f5f5f5' : '#fff5f5', border: `1px dashed ${cooldownRemaining > 0 ? '#d9d9d9' : '#ff4d4f'}` }}>
                    <Title level={5} style={{ margin: 0, marginBottom: 8 }}>Have a concern?</Title>
                    <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                        {cooldownRemaining > 0
                            ? `Please wait before filing another complaint.`
                            : 'File a complaint and OSCA will review and respond to your concern.'}
                    </Paragraph>
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={openComplaintModal}
                        disabled={cooldownRemaining > 0}
                        style={cooldownRemaining > 0
                            ? {}
                            : { background: '#e74c3c', borderColor: '#e74c3c' }}
                    >
                        {cooldownRemaining > 0
                            ? `Wait ${Math.floor(cooldownRemaining / 60)}:${String(cooldownRemaining % 60).padStart(2, '0')}`
                            : 'File a New Complaint'}
                    </Button>
                </Card>

                {/* Complaints List */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={4} style={{ margin: 0 }}>
                        My Complaints
                        {openCount > 0 && (
                            <Badge count={openCount} style={{ marginLeft: 8 }} />
                        )}
                    </Title>
                    <Text type="secondary">{complaints.length} total</Text>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                        <Spin size="large" />
                        <div style={{ marginTop: 16 }}>Loading complaints...</div>
                    </div>
                ) : complaints.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {complaints.map((complaint) => (
                            <Card
                                key={complaint.id}
                                size="small"
                                style={{
                                    borderRadius: 12,
                                    borderLeft: `4px solid ${complaint.status === 'open' ? '#ff4d4f' :
                                        complaint.status === 'in_review' ? '#faad14' :
                                            complaint.status === 'resolved' ? '#52c41a' : '#d9d9d9'
                                        }`,
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                            <Text strong>{complaint.subject}</Text>
                                            {getCategoryTag(complaint.category)}
                                            {getStatusTag(complaint.status)}
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {complaint.benefit_name ? `${complaint.benefit_name} • ` : ''}{complaint.created_at}
                                        </Text>
                                        <Paragraph
                                            style={{ marginTop: 8, marginBottom: 0 }}
                                            ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}
                                        >
                                            {complaint.message}
                                        </Paragraph>
                                    </div>
                                </div>

                                {/* OSCA Response */}
                                {complaint.admin_response && (
                                    <div style={{
                                        marginTop: 12,
                                        padding: 12,
                                        background: '#f6ffed',
                                        borderRadius: 8,
                                        border: '1px solid #b7eb8f',
                                    }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                                            OSCA Response — {complaint.responded_at}
                                        </Text>
                                        <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>
                                            {complaint.admin_response}
                                        </Paragraph>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card style={{ borderRadius: 12, textAlign: 'center', padding: 40 }}>
                        <Empty
                            description="No complaints filed"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                        <Paragraph type="secondary" style={{ marginTop: 8 }}>
                            If you have any concerns, click the button above to file a complaint.
                        </Paragraph>
                    </Card>
                )}

                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: 32 }}>
                    <Link to="/senior/dashboard" style={{ color: '#e74c3c' }}>← Back to Dashboard</Link>
                </div>
            </div>

            {/* File Complaint Modal */}
            <Modal
                title={
                    <Space>
                        <ExclamationCircleOutlined style={{ color: '#e74c3c' }} />
                        File a Complaint
                    </Space>
                }
                open={complaintModal}
                onCancel={() => setComplaintModal(false)}
                footer={null}
                destroyOnClose
                width={560}
            >
                <Form form={complaintForm} layout="vertical">
                    <Form.Item
                        name="category"
                        label="Category"
                        rules={[{ required: true, message: 'Please select a category' }]}
                    >
                        <Select
                            placeholder="What is your complaint about?"
                            onChange={(val) => setSelectedCategory(val)}
                        >
                            {CATEGORIES.map(cat => (
                                <Option key={cat.value} value={cat.value}>
                                    <div>
                                        <span>{cat.label}</span>
                                        <br />
                                        <Text type="secondary" style={{ fontSize: 11 }}>{cat.description}</Text>
                                    </div>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    {selectedCategory === 'benefit' && benefitClaims.length > 0 && (
                        <Form.Item
                            name="benefit_claim_id"
                            label="Related Claim (optional)"
                        >
                            <Select
                                placeholder="Select a specific claim this is about"
                                allowClear
                            >
                                {benefitClaims.map((claim) => (
                                    <Option key={claim.id} value={claim.id}>
                                        {claim.benefit_type} — ₱{parseFloat(claim.amount).toLocaleString()} ({claim.claim_year})
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}

                    <Form.Item
                        name="subject"
                        label="Subject"
                        rules={[{ required: true, message: 'Please enter a subject' }]}
                    >
                        <Input
                            placeholder="Brief description of your concern"
                            maxLength={255}
                        />
                    </Form.Item>
                    <Form.Item
                        name="message"
                        label="Details"
                        rules={[{ required: true, message: 'Please describe your complaint' }]}
                    >
                        <TextArea
                            rows={5}
                            placeholder="Please describe your concern in detail..."
                            maxLength={2000}
                            showCount
                        />
                    </Form.Item>
                    <div style={{ textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setComplaintModal(false)}>Cancel</Button>
                            <Button
                                type="primary"
                                onClick={handleSubmitComplaint}
                                loading={submitting}
                                style={{ background: '#e74c3c', borderColor: '#e74c3c' }}
                            >
                                Submit Complaint
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default SeniorComplaints;
