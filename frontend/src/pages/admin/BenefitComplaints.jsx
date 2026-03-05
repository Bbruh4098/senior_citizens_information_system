import { useState, useEffect, useCallback } from 'react';
import {
    Card,
    Table,
    Button,
    Space,
    Tag,
    Modal,
    Form,
    Input,
    Select,
    message,
    Typography,
    Row,
    Col,
    Tooltip,
    Statistic,
    Divider,
} from 'antd';
import {
    ExclamationCircleOutlined,
    SearchOutlined,
    ReloadOutlined,
    EyeOutlined,
    MessageOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { benefitComplaintsApi } from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const CATEGORY_CONFIG = {
    benefit: { color: '#1890ff', label: 'Benefit Issue' },
    service: { color: '#722ed1', label: 'Service Concern' },
    facility: { color: '#fa8c16', label: 'Facility Issue' },
    staff: { color: '#eb2f96', label: 'Staff Concern' },
    other: { color: '#8c8c8c', label: 'Other' },
};

function BenefitComplaints() {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });
    const [statistics, setStatistics] = useState({});
    const [filters, setFilters] = useState({ search: '', status: null, category: null });
    const [detailModal, setDetailModal] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [respondForm] = Form.useForm();
    const [responding, setResponding] = useState(false);

    const loadComplaints = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = {
                page,
                per_page: pagination.pageSize,
            };
            if (filters.search) params.search = filters.search;
            if (filters.status) params.status = filters.status;
            if (filters.category) params.category = filters.category;

            const response = await benefitComplaintsApi.getList(params);
            const { data, pagination: pag, statistics: stats } = response.data;
            setComplaints(data);
            setPagination(prev => ({
                ...prev,
                current: pag.current_page,
                total: pag.total,
            }));
            setStatistics(stats || {});
        } catch (error) {
            message.error('Failed to load complaints');
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.pageSize]);

    useEffect(() => {
        loadComplaints();
    }, []);

    const handleSearch = () => {
        loadComplaints(1);
    };

    const handleReset = () => {
        setFilters({ search: '', status: null, category: null });
        setTimeout(() => loadComplaints(1), 0);
    };

    const openDetail = (record) => {
        setSelectedComplaint(record);
        respondForm.setFieldsValue({
            status: record.status === 'open' ? 'in_review' : record.status,
            admin_response: record.admin_response || '',
        });
        setDetailModal(true);
    };

    const handleRespond = async () => {
        try {
            const values = await respondForm.validateFields();
            setResponding(true);
            await benefitComplaintsApi.respond(selectedComplaint.id, values);
            message.success('Complaint updated');
            setDetailModal(false);
            loadComplaints(pagination.current);
        } catch (error) {
            message.error(error.response?.data?.error || 'Failed to update complaint');
        } finally {
            setResponding(false);
        }
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
        const cat = CATEGORY_CONFIG[category];
        return <Tag color={cat?.color || '#8c8c8c'}>{cat?.label || category}</Tag>;
    };

    const columns = [
        {
            title: 'Date',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 150,
            render: (date) => <Text type="secondary">{date}</Text>,
        },
        {
            title: 'Senior',
            key: 'senior',
            width: 200,
            render: (_, record) => (
                <div>
                    <Text strong>{record.senior_name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.osca_id}</Text>
                </div>
            ),
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            width: 130,
            render: (category) => getCategoryTag(category),
        },
        {
            title: 'Subject',
            dataIndex: 'subject',
            key: 'subject',
            ellipsis: true,
        },
        {
            title: 'Related Benefit',
            dataIndex: 'benefit_name',
            key: 'benefit_name',
            width: 150,
            render: (name) => name ? <Tag>{name}</Tag> : <Text type="secondary">—</Text>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status) => getStatusTag(status),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 80,
            render: (_, record) => (
                <Tooltip title="View & Respond">
                    <Button
                        type="primary"
                        ghost
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => openDetail(record)}
                    />
                </Tooltip>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <div style={{ marginBottom: 24 }}>
                    <Title level={4} style={{ margin: 0 }}>
                        <MessageOutlined style={{ marginRight: 8 }} />
                        Complaints Management
                    </Title>
                    <Text type="secondary">
                        View and respond to complaints filed by senior citizens
                    </Text>
                </div>

                {/* Statistics */}
                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={5}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                            <Statistic title="Total" value={statistics.total || 0} />
                        </Card>
                    </Col>
                    <Col span={5}>
                        <Card size="small" style={{ textAlign: 'center', borderColor: '#ff4d4f' }}>
                            <Statistic
                                title="Open"
                                value={statistics.open || 0}
                                valueStyle={{ color: '#ff4d4f' }}
                            />
                        </Card>
                    </Col>
                    <Col span={5}>
                        <Card size="small" style={{ textAlign: 'center', borderColor: '#faad14' }}>
                            <Statistic
                                title="In Review"
                                value={statistics.in_review || 0}
                                valueStyle={{ color: '#faad14' }}
                            />
                        </Card>
                    </Col>
                    <Col span={5}>
                        <Card size="small" style={{ textAlign: 'center', borderColor: '#52c41a' }}>
                            <Statistic
                                title="Resolved"
                                value={statistics.resolved || 0}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card size="small" style={{ textAlign: 'center' }}>
                            <Statistic title="Closed" value={statistics.closed || 0} />
                        </Card>
                    </Col>
                </Row>

                {/* Filters */}
                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={7}>
                        <Input
                            placeholder="Search by senior name or OSCA ID..."
                            prefix={<SearchOutlined />}
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            onPressEnter={handleSearch}
                            allowClear
                        />
                    </Col>
                    <Col span={4}>
                        <Select
                            placeholder="Category"
                            allowClear
                            style={{ width: '100%' }}
                            value={filters.category}
                            onChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                        >
                            <Option value="benefit">Benefit Issue</Option>
                            <Option value="service">Service Concern</Option>
                            <Option value="facility">Facility Issue</Option>
                            <Option value="staff">Staff Concern</Option>
                            <Option value="other">Other</Option>
                        </Select>
                    </Col>
                    <Col span={4}>
                        <Select
                            placeholder="Status"
                            allowClear
                            style={{ width: '100%' }}
                            value={filters.status}
                            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                        >
                            <Option value="open">Open</Option>
                            <Option value="in_review">In Review</Option>
                            <Option value="resolved">Resolved</Option>
                            <Option value="closed">Closed</Option>
                        </Select>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<SearchOutlined />} onClick={handleSearch}>Search</Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>Reset</Button>
                        </Space>
                    </Col>
                </Row>

                {/* Table */}
                <Table
                    columns={columns}
                    dataSource={complaints}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        ...pagination,
                        showSizeChanger: false,
                        showTotal: (total) => `Total ${total} complaints`,
                    }}
                    onChange={(pag) => loadComplaints(pag.current)}
                    size="small"
                />
            </Card>

            {/* Detail / Respond Modal */}
            <Modal
                title={
                    <Space>
                        <ExclamationCircleOutlined />
                        Complaint Details
                    </Space>
                }
                open={detailModal}
                onCancel={() => setDetailModal(false)}
                footer={null}
                width={640}
            >
                {selectedComplaint && (
                    <div>
                        {/* Complaint Info */}
                        <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Text type="secondary">Senior:</Text>
                                    <br />
                                    <Text strong>
                                        <UserOutlined style={{ marginRight: 4 }} />
                                        {selectedComplaint.senior_name}
                                    </Text>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        OSCA ID: {selectedComplaint.osca_id}
                                    </Text>
                                </Col>
                                <Col span={12}>
                                    <Text type="secondary">Category:</Text>
                                    <br />
                                    {getCategoryTag(selectedComplaint.category)}
                                    {selectedComplaint.benefit_name && (
                                        <>
                                            <br /><br />
                                            <Text type="secondary">Related Benefit:</Text>
                                            <br />
                                            <Tag>{selectedComplaint.benefit_name}</Tag>
                                            {selectedComplaint.claim_amount && (
                                                <Text style={{ color: '#52c41a' }}>
                                                    {' '}₱{parseFloat(selectedComplaint.claim_amount).toLocaleString()}
                                                </Text>
                                            )}
                                        </>
                                    )}
                                </Col>
                            </Row>
                            <Divider style={{ margin: '12px 0' }} />
                            <Text type="secondary">Filed on:</Text>{' '}
                            <Text>{selectedComplaint.created_at}</Text>
                            <span style={{ marginLeft: 16 }}>
                                <Text type="secondary">Status:</Text>{' '}
                                {getStatusTag(selectedComplaint.status)}
                            </span>
                        </Card>

                        {/* Subject & Message */}
                        <Card size="small" style={{ marginBottom: 16 }}>
                            <Text strong style={{ fontSize: 15 }}>{selectedComplaint.subject}</Text>
                            <Divider style={{ margin: '8px 0' }} />
                            <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                                {selectedComplaint.message}
                            </Paragraph>
                        </Card>

                        {/* Previous Response */}
                        {selectedComplaint.admin_response && (
                            <Card
                                size="small"
                                style={{ marginBottom: 16, borderColor: '#52c41a', background: '#f6ffed' }}
                            >
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Previous response by {selectedComplaint.responded_by_name} on {selectedComplaint.responded_at}:
                                </Text>
                                <Paragraph style={{ marginBottom: 0, marginTop: 4, whiteSpace: 'pre-wrap' }}>
                                    {selectedComplaint.admin_response}
                                </Paragraph>
                            </Card>
                        )}

                        <Divider>Respond</Divider>

                        {/* Response Form */}
                        <Form form={respondForm} layout="vertical">
                            <Form.Item
                                name="status"
                                label="Update Status"
                                rules={[{ required: true, message: 'Select a status' }]}
                            >
                                <Select>
                                    <Option value="in_review">In Review</Option>
                                    <Option value="resolved">Resolved</Option>
                                    <Option value="closed">Closed</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item
                                name="admin_response"
                                label="Response Message"
                            >
                                <TextArea
                                    rows={4}
                                    placeholder="Write your response to the senior citizen..."
                                    maxLength={2000}
                                    showCount
                                />
                            </Form.Item>
                            <div style={{ textAlign: 'right' }}>
                                <Space>
                                    <Button onClick={() => setDetailModal(false)}>Cancel</Button>
                                    <Button
                                        type="primary"
                                        onClick={handleRespond}
                                        loading={responding}
                                    >
                                        Submit Response
                                    </Button>
                                </Space>
                            </div>
                        </Form>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default BenefitComplaints;
