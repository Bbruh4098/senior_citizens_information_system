import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card,
    Table,
    Input,
    Select,
    Button,
    Space,
    Tag,
    Typography,
    Row,
    Col,
    Statistic,
    Modal,
    Descriptions,
    message,
    Tooltip,
    Popconfirm,
    Popover,
} from 'antd';
import {
    SearchOutlined,
    PlusOutlined,
    EyeOutlined,
    EditOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    FileTextOutlined,
    ReloadOutlined,
    ClockCircleOutlined,
    SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { applicationsApi } from '../../services/api';
import ApplicationDetailsModal from '../../components/ApplicationDetailsModal';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Applications = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [applications, setApplications] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        application_type: '',
    });
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [selectedApplicationId, setSelectedApplicationId] = useState(null);

    useEffect(() => {
        fetchApplications();
        fetchStatistics();
    }, [pagination.current, pagination.pageSize, filters]);

    const fetchApplications = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.current,
                per_page: pagination.pageSize,
                search: filters.search || undefined,
                status: filters.status || undefined,
                application_type: filters.application_type || undefined,
            };
            const response = await applicationsApi.getList(params);
            const data = response.data;

            setApplications(data.data || []);
            setPagination(prev => ({
                ...prev,
                total: data.meta?.total || data.total || 0,
            }));
        } catch (error) {
            console.error('Failed to fetch applications:', error);
            message.error('Failed to load applications');
        } finally {
            setLoading(false);
        }
    };

    const fetchStatistics = async () => {
        try {
            const response = await applicationsApi.getStatistics();
            setStatistics(response.data.data || response.data);
        } catch (error) {
            console.error('Failed to fetch statistics:', error);
        }
    };

    const handleSearch = (value) => {
        setFilters(prev => ({ ...prev, search: value }));
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const handleStatusFilter = (value) => {
        setFilters(prev => ({ ...prev, status: value }));
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const handleTypeFilter = (value) => {
        setFilters(prev => ({ ...prev, application_type: value }));
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const handleTableChange = (paginationInfo) => {
        setPagination(prev => ({
            ...prev,
            current: paginationInfo.current,
            pageSize: paginationInfo.pageSize,
        }));
    };

    const handleView = (record) => {
        // Open details modal
        setSelectedApplicationId(record.id);
        setDetailsModalVisible(true);
    };

    const handleCloseDetailsModal = () => {
        setDetailsModalVisible(false);
        setSelectedApplicationId(null);
    };

    const handleEdit = (record) => {
        // Navigate to correct edit page based on application type
        // application_type_id: 1 = New ID, 2 = Renewal, 3 = Replace Lost, 4 = Replace Damaged
        const typeId = record.application_type_id || record.application_type?.id;

        if (typeId === 2) {
            // Renewal application
            navigate(`/admin/registration/renew?edit=${record.id}`);
        } else if (typeId === 3) {
            // Replace Lost ID application
            navigate(`/admin/registration/replace-lost?edit=${record.id}`);
        } else if (typeId === 4) {
            // Replace Damaged ID application (when implemented)
            navigate(`/admin/registration/replace-damaged?edit=${record.id}`);
        } else {
            // Default: New ID application
            navigate(`/admin/registration/new?edit=${record.id}`);
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            await applicationsApi.updateStatus(id, { status: newStatus });
            message.success(`Application ${newStatus.toLowerCase()} successfully`);
            fetchApplications();
            fetchStatistics();
        } catch (error) {
            console.error('Failed to update status:', error);
            message.error('Failed to update application status');
        }
    };

    const handleUpdateNotes = async (id, notes) => {
        try {
            await applicationsApi.updateNotes(id, { notes });
            message.success('Remarks updated');
            fetchApplications();
        } catch (error) {
            console.error('Failed to update remarks:', error);
            message.error('Failed to update remarks');
        }
    };

    // Display label mapping (DB value -> display label)
    const statusDisplayLabel = {
        'Draft': 'For Verification',
        'For Verification': 'For Approval',
    };
    const getDisplayLabel = (status) => statusDisplayLabel[status] || status;

    const getStatusTag = (status) => {
        const statusConfig = {
            'Pending': { color: 'default', icon: <ClockCircleOutlined /> },
            'Draft': { color: 'default', icon: <FileTextOutlined /> },
            'For Verification': { color: 'processing', icon: <SyncOutlined spin /> },
            'Verified': { color: 'blue', icon: <CheckCircleOutlined /> },
            'Approved': { color: 'success', icon: <CheckCircleOutlined /> },
            'Printed': { color: 'purple', icon: <FileTextOutlined /> },
            'Claimed': { color: 'green', icon: <CheckCircleOutlined /> },
        };
        const config = statusConfig[status] || { color: 'default', icon: null };
        return <Tag color={config.color} icon={config.icon}>{getDisplayLabel(status)}</Tag>;
    };

    const columns = [
        {
            title: 'Application #',
            dataIndex: 'application_number',
            key: 'application_number',
            width: 150,
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: 'Applicant Name',
            key: 'applicant_name',
            render: (_, record) => {
                // First try to get applicant_name from backend (for drafts without senior)
                if (record.applicant_name) {
                    return record.applicant_name;
                }
                // Fallback to senior data if available
                if (record.senior) {
                    return `${record.senior.first_name} ${record.senior.middle_name || ''} ${record.senior.last_name}`.trim();
                }
                // Last resort: try parsing applicant_data
                if (record.applicant_data?.personal_info) {
                    const p = record.applicant_data.personal_info;
                    return `${p.first_name || ''} ${p.middle_name || ''} ${p.last_name || ''}`.trim();
                }
                return <Text type="secondary">-</Text>;
            },
        },
        {
            title: 'Barangay',
            key: 'barangay',
            width: 150,
            render: (_, record) => {
                // First try senior's barangay
                if (record.senior?.barangay?.name) {
                    return record.senior.barangay.name;
                }
                // Fallback to applicant_data barangay name (if available)
                if (record.barangay_name) {
                    return record.barangay_name;
                }
                return <Text type="secondary">-</Text>;
            },
        },
        {
            title: 'Type',
            dataIndex: ['application_type', 'name'],
            key: 'type',
            width: 120,
            render: (text) => text || 'New ID',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 150,
            render: (status) => getStatusTag(status),
        },
        {
            title: 'Date',
            key: 'date',
            width: 120,
            render: (_, record) => {
                const date = record.submission_date || record.created_at;
                return date ? dayjs(date).format('MMM D, YYYY') : '-';
            },
        },
        {
            title: 'Submitted By',
            key: 'submitted_by',
            width: 130,
            render: (_, record) => {
                if (record.submitter) {
                    return `${record.submitter.first_name} ${record.submitter.last_name}`;
                }
                return <Text type="secondary">—</Text>;
            },
        },
        {
            title: 'Approved By',
            key: 'approved_by',
            width: 130,
            render: (_, record) => {
                if (record.approver) {
                    return `${record.approver.first_name} ${record.approver.last_name}`;
                }
                return <Text type="secondary">—</Text>;
            },
        },
        {
            title: 'Remarks',
            key: 'remarks',
            width: 160,
            render: (_, record) => {
                const RemarksContent = () => {
                    const [value, setValue] = useState(record.notes || '');
                    return (
                        <div style={{ width: 250 }}>
                            <TextArea
                                rows={3}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                placeholder="Add remarks..."
                                maxLength={1000}
                                showCount
                            />
                            <Button
                                type="primary"
                                size="small"
                                style={{ marginTop: 8, width: '100%' }}
                                onClick={() => handleUpdateNotes(record.id, value)}
                            >
                                Save
                            </Button>
                        </div>
                    );
                };
                return (
                    <Popover content={<RemarksContent />} title="Remarks" trigger="click">
                        {record.notes ? (
                            <Text
                                style={{ cursor: 'pointer', color: '#1890ff', maxWidth: 140 }}
                                ellipsis={{ tooltip: record.notes }}
                            >
                                {record.notes}
                            </Text>
                        ) : (
                            <Button type="link" size="small" style={{ padding: 0, color: '#bbb' }}>
                                + Add
                            </Button>
                        )}
                    </Popover>
                );
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 200,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="View Details">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            onClick={() => handleView(record)}
                        />
                    </Tooltip>
                    {(record.status === 'Pending' || record.status === 'Draft') && (
                        <Tooltip title="Edit Application">
                            <Button
                                type="text"
                                icon={<EditOutlined />}
                                onClick={() => handleEdit(record)}
                            />
                        </Tooltip>
                    )}
                    {record.status === 'For Verification' && (
                        <Popconfirm
                            title="Approve this application?"
                            onConfirm={() => handleStatusUpdate(record.id, 'Approved')}
                        >
                            <Tooltip title="Approve">
                                <Button
                                    type="text"
                                    icon={<CheckCircleOutlined />}
                                    style={{ color: '#52c41a' }}
                                />
                            </Tooltip>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>Applications</Title>
                    <Text type="secondary">Manage senior citizen ID applications</Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    onClick={() => navigate('/admin/registration/new')}
                >
                    New Application
                </Button>
            </div>

            {/* Statistics Cards */}
            {statistics && (
                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col xs={12} sm={6}>
                        <Card size="small">
                            <Statistic
                                title="For Verification"
                                value={statistics.pending || 0}
                                valueStyle={{ color: '#8c8c8c' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card size="small">
                            <Statistic
                                title="For Approval"
                                value={statistics.for_verification || 0}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card size="small">
                            <Statistic
                                title="Approved"
                                value={statistics.approved || 0}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card size="small">
                            <Statistic
                                title="Total"
                                value={statistics.total || 0}
                            />
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Quick Status Filters */}
            <Card size="small" style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Text strong style={{ marginRight: 8 }}>Quick Filters:</Text>
                    <Tag
                        color={!filters.status ? 'blue' : 'default'}
                        style={{ cursor: 'pointer', padding: '4px 12px' }}
                        onClick={() => handleStatusFilter('')}
                    >
                        All
                    </Tag>
                    <Tag
                        color={filters.status === 'Draft' ? 'blue' : 'default'}
                        style={{ cursor: 'pointer', padding: '4px 12px' }}
                        onClick={() => handleStatusFilter('Draft')}
                    >
                        <FileTextOutlined /> For Verification
                    </Tag>
                    <Tag
                        color={filters.status === 'For Verification' ? 'processing' : 'default'}
                        style={{ cursor: 'pointer', padding: '4px 12px' }}
                        onClick={() => handleStatusFilter('For Verification')}
                    >
                        <SyncOutlined /> For Approval
                    </Tag>
                    <Tag
                        color={filters.status === 'Approved' ? 'success' : 'default'}
                        style={{ cursor: 'pointer', padding: '4px 12px' }}
                        onClick={() => handleStatusFilter('Approved')}
                    >
                        <CheckCircleOutlined /> Approved
                    </Tag>

                </Space>
            </Card>

            {/* Filters */}
            <Card style={{ marginBottom: 16 }}>
                <Row gutter={16} align="middle">
                    <Col xs={24} sm={12} md={6}>
                        <Input.Search
                            placeholder="Search by name or application number"
                            allowClear
                            enterButton={<SearchOutlined />}
                            onSearch={handleSearch}
                            onChange={(e) => !e.target.value && handleSearch('')}
                        />
                    </Col>
                    <Col xs={24} sm={8} md={5}>
                        <Select
                            placeholder="Filter by Status"
                            allowClear
                            style={{ width: '100%' }}
                            onChange={handleStatusFilter}
                            value={filters.status || undefined}
                        >
                            <Option value="Draft">For Verification</Option>
                            <Option value="For Verification">For Approval</Option>
                            <Option value="Approved">Approved</Option>
                            <Option value="Printed">Printed</Option>
                            <Option value="Claimed">Claimed</Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={8} md={5}>
                        <Select
                            placeholder="Filter by Type"
                            allowClear
                            style={{ width: '100%' }}
                            onChange={handleTypeFilter}
                            value={filters.application_type || undefined}
                        >
                            <Option value="1">New ID</Option>
                            <Option value="2">Renewal</Option>
                            <Option value="3">Replace Lost ID</Option>
                            <Option value="4">Replace Damaged ID</Option>
                        </Select>
                    </Col>
                    <Col>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => {
                                setFilters({ search: '', status: '', application_type: '' });
                                setPagination(prev => ({ ...prev, current: 1 }));
                            }}
                        >
                            Reset
                        </Button>
                    </Col>
                </Row>
            </Card>

            {/* Applications Table */}
            <Card>
                <div style={{ overflowX: 'auto' }}>
                    <Table
                        columns={['Draft', 'For Verification'].includes(filters.status)
                            ? columns.filter(c => c.key !== 'approved_by')
                            : columns}
                        dataSource={applications}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            ...pagination,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} applications`,
                        }}
                        onChange={handleTableChange}
                        scroll={{ x: 800 }}
                    />
                </div>
            </Card>

            {/* Application Details Modal */}
            <ApplicationDetailsModal
                visible={detailsModalVisible}
                applicationId={selectedApplicationId}
                onClose={handleCloseDetailsModal}
            />
        </div>
    );
};

export default Applications;
