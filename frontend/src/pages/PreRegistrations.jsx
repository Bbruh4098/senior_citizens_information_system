import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card, Table, Tag, Button, Space, Input, Select, Row, Col,
    Statistic, Modal, Form, message, Typography, Descriptions, Badge, Divider,
} from 'antd';
import {
    SearchOutlined, ReloadOutlined, EyeOutlined, CheckCircleOutlined,
    CloseCircleOutlined, SyncOutlined, ClockCircleOutlined, FileTextOutlined,
    UserOutlined, EnvironmentOutlined, SendOutlined, FormOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { preRegistrationApi, registrationApi } from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const PreRegistrations = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });
    const [filters, setFilters] = useState({ search: '', status: '', barangay_id: '' });
    const [stats, setStats] = useState({});
    const [barangays, setBarangays] = useState([]);

    // Modal states
    const [detailModal, setDetailModal] = useState({ visible: false, item: null, loading: false });
    const [reviewModal, setReviewModal] = useState({ visible: false, item: null, type: '', loading: false });
    const [form] = Form.useForm();

    // Get current user
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isMainAdmin = user.role_id === 1;
    const isFOAdmin = user.role_id === 2;
    const isBarangayAdmin = user.role_id === 3;

    useEffect(() => {
        fetchItems();
        fetchStats();
        fetchBarangays();
    }, [filters]);

    const fetchItems = async (page = 1) => {
        setLoading(true);
        try {
            const response = await preRegistrationApi.list({
                page,
                per_page: pagination.pageSize,
                ...filters,
            });
            setItems(response.data.data || []);
            setPagination({
                ...pagination,
                current: response.data.current_page || page,
                total: response.data.total || 0,
            });
        } catch (error) {
            console.error('Failed to fetch pre-registrations:', error);
            message.error('Failed to load pre-registrations');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await preRegistrationApi.statistics();
            setStats(response.data.data || {});
        } catch (error) {
            console.error('Failed to fetch statistics:', error);
        }
    };

    const fetchBarangays = async () => {
        try {
            const response = await registrationApi.getBarangays();
            setBarangays(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch barangays:', error);
        }
    };

    const handleTableChange = (pag) => {
        fetchItems(pag.current);
    };

    const handleFilterChange = (key, value) => {
        setFilters({ ...filters, [key]: value });
    };

    const openDetailModal = async (item) => {
        setDetailModal({ visible: true, item, loading: true });
        try {
            const response = await preRegistrationApi.getById(item.id);
            setDetailModal({ visible: true, item: response.data.data, loading: false });
        } catch (error) {
            message.error('Failed to load details');
            setDetailModal({ visible: false, item: null, loading: false });
        }
    };

    const openReviewModal = (item, type) => {
        setReviewModal({ visible: true, item, type, loading: false });
        form.resetFields();
    };

    const handleReview = async (values) => {
        setReviewModal({ ...reviewModal, loading: true });
        try {
            const { item, type } = reviewModal;
            if (type === 'fo') {
                await preRegistrationApi.foReview(item.id, values);
            } else {
                await preRegistrationApi.mainReview(item.id, values);
            }
            message.success(values.action === 'verify' || values.action === 'approve' ? 'Application approved!' : 'Application rejected');
            setReviewModal({ visible: false, item: null, type: '', loading: false });
            fetchItems(pagination.current);
            fetchStats();
        } catch (error) {
            message.error(error.response?.data?.message || 'Review failed');
            setReviewModal({ ...reviewModal, loading: false });
        }
    };

    const handleConvert = async (item) => {
        try {
            message.loading({ content: 'Loading application data...', key: 'convert' });
            const response = await preRegistrationApi.convert(item.id);
            message.destroy('convert');

            const { registration_data, pre_registration_id, reference_number } = response.data.data;

            // Navigate to registration form with pre-filled data
            navigate('/admin/registration/new', {
                state: {
                    prefillData: registration_data,
                    preRegistrationId: pre_registration_id,
                    referenceNumber: reference_number,
                    fromPreRegistration: true,
                },
            });
        } catch (error) {
            message.error({ content: error.response?.data?.message || 'Failed to load data', key: 'convert' });
        }
    };

    const getStatusTag = (status) => {
        const config = {
            pending: { color: 'default', label: 'Pending', icon: <ClockCircleOutlined /> },
            fo_review: { color: 'processing', label: 'Under FO Review', icon: <SyncOutlined spin /> },
            fo_verified: { color: 'blue', label: 'FO Verified', icon: <CheckCircleOutlined /> },
            main_review: { color: 'orange', label: 'Under Main Review', icon: <SyncOutlined spin /> },
            approved: { color: 'green', label: 'Approved', icon: <CheckCircleOutlined /> },
            rejected: { color: 'error', label: 'Rejected', icon: <CloseCircleOutlined /> },
            converted: { color: 'purple', label: 'Converted', icon: <FileTextOutlined /> },
        };
        const c = config[status] || { color: 'default', label: status };
        return <Tag color={c.color} icon={c.icon}>{c.label}</Tag>;
    };

    const columns = [
        {
            title: 'Reference #',
            dataIndex: 'reference_number',
            key: 'reference_number',
            width: 160,
            render: (ref) => <Text code style={{ color: '#4338ca' }}>{ref}</Text>,
        },
        {
            title: 'Applicant',
            key: 'applicant',
            render: (_, record) => {
                const data = record.applicant_data || {};
                return (
                    <div>
                        <div><Text strong>{data.first_name} {data.middle_name} {data.last_name}</Text></div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{data.contact_number}</Text>
                    </div>
                );
            },
        },
        {
            title: 'Barangay',
            key: 'barangay',
            width: 150,
            render: (_, record) => record.barangay?.name || '-',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 150,
            render: (status) => getStatusTag(status),
        },
        {
            title: 'Submitted',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 120,
            render: (date) => date ? dayjs(date).format('MMM D, YYYY') : '-',
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 200,
            render: (_, record) => (
                <Space size="small">
                    <Button icon={<EyeOutlined />} size="small" onClick={() => openDetailModal(record)}>
                        View
                    </Button>
                    {/* Both FO Admin and Main Admin can convert pending applications to registration form */}
                    {(isFOAdmin || isBarangayAdmin || isMainAdmin) &&
                        ['pending', 'fo_review', 'fo_verified', 'main_review', 'approved'].includes(record.status) &&
                        record.status !== 'converted' && record.status !== 'rejected' && (
                            <Button
                                type="primary"
                                icon={<FormOutlined />}
                                style={{ background: '#059669' }}
                                size="small"
                                onClick={() => handleConvert(record)}
                            >
                                Convert to Application
                            </Button>
                        )}
                </Space>

            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <FileTextOutlined style={{ color: '#4338ca' }} />
                    Online Pre-Registrations
                </Title>
            </div>

            {/* Statistics */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6} lg={3}>
                    <Card bodyStyle={{ padding: 16 }}>
                        <Statistic title="Total" value={stats.total || 0} />
                    </Card>
                </Col>
                <Col xs={12} sm={6} lg={3}>
                    <Card bodyStyle={{ padding: 16 }}>
                        <Statistic title="Pending" value={stats.pending || 0} valueStyle={{ color: '#8c8c8c' }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6} lg={3}>
                    <Card bodyStyle={{ padding: 16 }}>
                        <Statistic title="FO Verified" value={stats.fo_verified || 0} valueStyle={{ color: '#1890ff' }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6} lg={3}>
                    <Card bodyStyle={{ padding: 16 }}>
                        <Statistic title="Approved" value={stats.approved || 0} valueStyle={{ color: '#52c41a' }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6} lg={3}>
                    <Card bodyStyle={{ padding: 16 }}>
                        <Statistic title="Rejected" value={stats.rejected || 0} valueStyle={{ color: '#ff4d4f' }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6} lg={3}>
                    <Card bodyStyle={{ padding: 16 }}>
                        <Statistic title="Converted" value={stats.converted || 0} valueStyle={{ color: '#722ed1' }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6} lg={3}>
                    <Card bodyStyle={{ padding: 16 }}>
                        <Statistic title="Today" value={stats.today || 0} valueStyle={{ color: '#faad14' }} />
                    </Card>
                </Col>
            </Row>

            {/* Filters */}
            <Card style={{ marginBottom: 16, borderRadius: 8 }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={8}>
                        <Input
                            placeholder="Search by reference # or name..."
                            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                            allowClear
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </Col>
                    <Col xs={12} sm={4}>
                        <Select
                            placeholder="Status"
                            style={{ width: '100%' }}
                            allowClear
                            onChange={(v) => handleFilterChange('status', v)}
                        >
                            <Option value="pending">Pending</Option>
                            <Option value="fo_review">Under FO Review</Option>
                            <Option value="fo_verified">FO Verified</Option>
                            <Option value="main_review">Under Main Review</Option>
                            <Option value="approved">Approved</Option>
                            <Option value="rejected">Rejected</Option>
                            <Option value="converted">Converted</Option>
                        </Select>
                    </Col>
                    <Col xs={12} sm={4}>
                        <Select
                            placeholder="Barangay"
                            style={{ width: '100%' }}
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            onChange={(v) => handleFilterChange('barangay_id', v)}
                        >
                            {barangays.map(b => (
                                <Option key={b.id} value={b.id}>{b.name}</Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
                        <Button icon={<ReloadOutlined />} onClick={() => { fetchItems(1); fetchStats(); }}>
                            Refresh
                        </Button>
                    </Col>
                </Row>
            </Card>

            {/* Table */}
            <Card style={{ borderRadius: 8 }}>
                <Table
                    columns={columns}
                    dataSource={items}
                    rowKey="id"
                    loading={loading}
                    pagination={pagination}
                    onChange={handleTableChange}
                    scroll={{ x: 900 }}
                />
            </Card>

            {/* Detail Modal */}
            <Modal
                title="Pre-Registration Details"
                open={detailModal.visible}
                onCancel={() => setDetailModal({ visible: false, item: null, loading: false })}
                footer={null}
                width={600}
            >
                {detailModal.item && (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            <Text code style={{ fontSize: 18, color: '#4338ca' }}>
                                {detailModal.item.reference_number}
                            </Text>
                            <div style={{ marginTop: 8 }}>{getStatusTag(detailModal.item.status)}</div>
                        </div>
                        <Divider>Registration Type</Divider>
                        <Descriptions column={2} size="small">
                            <Descriptions.Item label="Filled Out By">
                                {detailModal.item.applicant_data?.registration_type === 'assisted'
                                    ? <Tag color="blue">Assisted</Tag>
                                    : <Tag color="green">Self</Tag>}
                            </Descriptions.Item>
                            {detailModal.item.applicant_data?.assistant_info && (
                                <>
                                    <Descriptions.Item label="Assistant Name">
                                        {`${detailModal.item.applicant_data.assistant_info.first_name || ''} ${detailModal.item.applicant_data.assistant_info.middle_name || ''} ${detailModal.item.applicant_data.assistant_info.last_name || ''} ${detailModal.item.applicant_data.assistant_info.extension || ''}`.trim() || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Relationship">
                                        {detailModal.item.applicant_data.assistant_info.relationship || '-'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Assistant Contact">
                                        {detailModal.item.applicant_data.assistant_info.contact || '-'}
                                    </Descriptions.Item>
                                </>
                            )}
                        </Descriptions>
                        <Divider>Applicant Information</Divider>
                        <Descriptions column={2} size="small">
                            <Descriptions.Item label="Name" span={2}>
                                {detailModal.item.applicant_data?.first_name} {detailModal.item.applicant_data?.middle_name} {detailModal.item.applicant_data?.last_name}
                            </Descriptions.Item>
                            <Descriptions.Item label="Birthdate">
                                {detailModal.item.applicant_data?.birthdate}
                            </Descriptions.Item>
                            <Descriptions.Item label="Gender">
                                {detailModal.item.applicant_data?.sex || detailModal.item.applicant_data?.gender}
                            </Descriptions.Item>
                            <Descriptions.Item label="Civil Status">
                                {detailModal.item.applicant_data?.civil_status}
                            </Descriptions.Item>
                            <Descriptions.Item label="Contact">
                                {detailModal.item.applicant_data?.contact_number}
                            </Descriptions.Item>
                            <Descriptions.Item label="Address" span={2}>
                                {detailModal.item.applicant_data?.address}, {detailModal.item.barangay?.name}, Zamboanga City
                            </Descriptions.Item>
                        </Descriptions>
                        <Divider>Review History</Divider>
                        <Descriptions column={2} size="small">
                            <Descriptions.Item label="Submitted">
                                {dayjs(detailModal.item.created_at).format('MMM D, YYYY h:mm A')}
                            </Descriptions.Item>
                            {detailModal.item.fo_reviewed_at && (
                                <Descriptions.Item label="FO Review">
                                    {dayjs(detailModal.item.fo_reviewed_at).format('MMM D, YYYY h:mm A')}
                                </Descriptions.Item>
                            )}
                            {detailModal.item.main_reviewed_at && (
                                <Descriptions.Item label="Main Review">
                                    {dayjs(detailModal.item.main_reviewed_at).format('MMM D, YYYY h:mm A')}
                                </Descriptions.Item>
                            )}
                        </Descriptions>
                        {detailModal.item.notes && (
                            <div style={{ marginTop: 16 }}>
                                <Text type="secondary">Notes:</Text>
                                <Paragraph>{detailModal.item.notes}</Paragraph>
                            </div>
                        )}
                        {detailModal.item.rejection_reason && (
                            <div style={{ marginTop: 16, padding: 12, background: '#fff2f0', borderRadius: 8 }}>
                                <Text type="danger" strong>Rejection Reason:</Text>
                                <Paragraph type="danger">{detailModal.item.rejection_reason}</Paragraph>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Review Modal */}
            <Modal
                title={reviewModal.type === 'fo' ? 'Field Office Review' : 'Main Admin Review'}
                open={reviewModal.visible}
                onCancel={() => setReviewModal({ visible: false, item: null, type: '', loading: false })}
                footer={null}
            >
                {reviewModal.item && (
                    <Form form={form} layout="vertical" onFinish={handleReview}>
                        <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 8, marginBottom: 16 }}>
                            <Text code>{reviewModal.item.reference_number}</Text>
                            <div>
                                <Text strong>
                                    {reviewModal.item.applicant_data?.first_name} {reviewModal.item.applicant_data?.last_name}
                                </Text>
                            </div>
                        </div>

                        {/* Hidden field to set action to reject */}
                        <Form.Item name="action" initialValue="reject" hidden>
                            <input />
                        </Form.Item>

                        <Form.Item
                            name="rejection_reason"
                            label="Rejection Reason"
                            rules={[{ required: true, message: 'Please provide a rejection reason' }]}
                        >
                            <TextArea rows={3} placeholder="Explain why this application is being rejected..." />
                        </Form.Item>

                        <Form.Item name="notes" label="Notes (Optional)">
                            <TextArea rows={2} placeholder="Any additional notes..." />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                            <Space>
                                <Button onClick={() => setReviewModal({ visible: false, item: null, type: '', loading: false })}>
                                    Cancel
                                </Button>
                                <Button type="primary" htmlType="submit" loading={reviewModal.loading}>
                                    Submit Review
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                )}
            </Modal>
        </div>
    );
};

export default PreRegistrations;
