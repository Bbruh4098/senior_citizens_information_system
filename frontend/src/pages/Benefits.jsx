import React, { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Tabs,
    Tag,
    Button,
    Space,
    Typography,
    Row,
    Col,
    Statistic,
    Select,
    Input,
    Modal,
    message,
    Tooltip,
    Badge,
    Descriptions,
    Divider,
    Alert,
    Avatar,
} from 'antd';
import {
    GiftOutlined,
    UserOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    DollarOutlined,
    ExclamationCircleOutlined,
    SearchOutlined,
    PlusOutlined,
    EyeOutlined,
    CloseCircleOutlined,
    DownloadOutlined,
    ManOutlined,
    WomanOutlined,
} from '@ant-design/icons';
import { benefitsApi } from '../services/api';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const Benefits = () => {
    const { user } = useAuth();
    const isMainAdmin = user?.role_id === 1;
    const currentYear = new Date().getFullYear();

    // State
    const [activeTab, setActiveTab] = useState('claims');
    const [loading, setLoading] = useState(false);
    const [claims, setClaims] = useState([]);
    const [eligible, setEligible] = useState([]);
    const [benefitTypes, setBenefitTypes] = useState([]);
    const [statistics, setStatistics] = useState({});
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [eligiblePagination, setEligiblePagination] = useState({ current: 1, pageSize: 10, total: 0 });

    // Senior History Modal
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [seniorHistory, setSeniorHistory] = useState(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [yearFilter, setYearFilter] = useState(currentYear);
    const [eligibleSearch, setEligibleSearch] = useState('');
    const [eligibleTypeFilter, setEligibleTypeFilter] = useState('');
    const [searchText, setSearchText] = useState('');

    // Initial load
    useEffect(() => {
        fetchBenefitTypes();
        fetchStatistics();
    }, []);

    // Load data when tab/filters change
    useEffect(() => {
        if (activeTab === 'claims') {
            fetchClaims();
        } else {
            fetchEligible();
        }
    }, [activeTab, statusFilter, typeFilter, yearFilter, searchText, pagination.current, eligiblePagination.current, eligibleSearch, eligibleTypeFilter]);

    const fetchBenefitTypes = async () => {
        try {
            const response = await benefitsApi.getTypes();
            setBenefitTypes(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch benefit types:', error);
        }
    };

    const fetchStatistics = async () => {
        try {
            const response = await benefitsApi.getStatistics();
            setStatistics(response.data.data || {});
        } catch (error) {
            console.error('Failed to fetch statistics:', error);
        }
    };

    const fetchClaims = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.current,
                per_page: pagination.pageSize,
                year: yearFilter,
            };
            if (statusFilter) params.status = statusFilter;
            if (typeFilter) params.benefit_type_id = typeFilter;
            if (searchText) params.search = searchText;

            const response = await benefitsApi.getClaims(params);
            setClaims(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.meta?.total || 0,
            }));
        } catch (error) {
            console.error('Failed to fetch claims:', error);
            message.error('Failed to load claims');
        } finally {
            setLoading(false);
        }
    };

    const fetchEligible = async () => {
        setLoading(true);
        try {
            const params = {
                page: eligiblePagination.current,
                per_page: eligiblePagination.pageSize,
            };
            if (eligibleSearch) params.search = eligibleSearch;
            if (eligibleTypeFilter) params.benefit_type_id = eligibleTypeFilter;

            const response = await benefitsApi.getEligible(params);
            setEligible(response.data.data || []);
            setEligiblePagination(prev => ({
                ...prev,
                total: response.data.meta?.total || 0,
            }));
        } catch (error) {
            console.error('Failed to fetch eligible seniors:', error);
            message.error('Failed to load eligible seniors');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            message.loading({ content: 'Exporting claims...', key: 'export' });
            const params = { year: yearFilter };
            if (statusFilter) params.status = statusFilter;
            if (typeFilter) params.benefit_type_id = typeFilter;
            if (searchText) params.search = searchText;

            const response = await benefitsApi.exportClaims(params);

            // Create download link
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `benefits_claims_${yearFilter}_${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            message.success({ content: 'Export completed!', key: 'export' });
        } catch (error) {
            console.error('Failed to export claims:', error);
            message.error({ content: 'Failed to export claims', key: 'export' });
        }
    };

    const handleExportEligible = async () => {
        try {
            message.loading({ content: 'Exporting eligible seniors...', key: 'exportEligible' });
            const params = {};
            if (eligibleSearch) params.search = eligibleSearch;
            if (eligibleTypeFilter) params.benefit_type_id = eligibleTypeFilter;

            const response = await benefitsApi.exportEligible(params);

            // Create download link
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `eligible_seniors_${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            message.success({ content: 'Export completed!', key: 'exportEligible' });
        } catch (error) {
            console.error('Failed to export eligible seniors:', error);
            message.error({ content: 'Failed to export eligible seniors', key: 'exportEligible' });
        }
    };

    const handleStatusUpdate = async (claimId, newStatus) => {
        Modal.confirm({
            title: `${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} Claim?`,
            icon: <ExclamationCircleOutlined />,
            content: `Are you sure you want to ${newStatus} this benefit claim?`,
            okText: 'Yes',
            okType: newStatus === 'rejected' ? 'danger' : 'primary',
            onOk: async () => {
                try {
                    await benefitsApi.updateStatus(claimId, { status: newStatus });
                    message.success(`Claim ${newStatus} successfully`);
                    fetchClaims();
                    fetchStatistics();
                } catch (error) {
                    message.error(error.response?.data?.message || 'Failed to update status');
                }
            },
        });
    };

    const handleCreateClaim = async (seniorId, benefitTypeId) => {
        Modal.confirm({
            title: 'Create Benefit Claim?',
            icon: <PlusOutlined />,
            content: 'This will create a new pending benefit claim for this senior citizen.',
            okText: 'Create Claim',
            onOk: async () => {
                try {
                    await benefitsApi.createClaim({
                        senior_id: seniorId,
                        benefit_type_id: benefitTypeId,
                    });
                    message.success('Benefit claim created successfully');
                    fetchEligible();
                    fetchStatistics();
                    setActiveTab('claims');
                } catch (error) {
                    message.error(error.response?.data?.message || 'Failed to create claim');
                }
            },
        });
    };

    const fetchSeniorHistory = async (seniorId) => {
        setHistoryLoading(true);
        setHistoryModalVisible(true);
        try {
            const response = await benefitsApi.getSeniorClaims(seniorId);
            setSeniorHistory(response.data.data);
        } catch (error) {
            console.error('Failed to fetch senior history:', error);
            message.error('Failed to load senior claim history');
            setHistoryModalVisible(false);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleCreateClaimFromHistory = async (seniorId, benefitTypeId, benefitName) => {
        try {
            await benefitsApi.createClaim({
                senior_id: seniorId,
                benefit_type_id: benefitTypeId,
            });
            message.success(`${benefitName} claim created successfully`);
            fetchSeniorHistory(seniorId); // Refresh the modal data
            fetchStatistics();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to create claim');
        }
    };

    const getStatusTag = (status) => {
        const colors = {
            pending: 'gold',
            approved: 'blue',
            released: 'green',
            rejected: 'red',
        };
        return <Tag color={colors[status]}>{status?.toUpperCase()}</Tag>;
    };

    // Claims table columns
    const claimsColumns = [
        {
            title: 'Senior Citizen',
            key: 'senior_citizen',
            width: 220,
            render: (_, record) => {
                const senior = record.senior || {};
                return (
                    <Space>
                        <Avatar
                            style={{
                                backgroundColor: senior.gender_id === 1 ? '#1890ff' : '#eb2f96'
                            }}
                            icon={senior.gender_id === 1 ? <ManOutlined /> : <WomanOutlined />}
                        />
                        <div>
                            <Text strong>{senior.full_name || `${senior.first_name || ''} ${senior.last_name || ''}`}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {senior.osca_id || 'No OSCA ID'}
                            </Text>
                        </div>
                    </Space>
                );
            },
        },
        {
            title: 'Barangay',
            dataIndex: ['senior', 'barangay', 'name'],
            key: 'barangay',
        },
        {
            title: 'Benefit Type',
            dataIndex: ['benefit_type', 'name'],
            key: 'benefit_type',
            render: (text) => text || '—',
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right',
            render: (amount) => `₱${parseFloat(amount).toLocaleString()}`,
        },
        {
            title: 'Date Filed',
            dataIndex: 'created_at',
            key: 'date_filed',
            width: 110,
            render: (date) => date ? dayjs(date).format('MMM D, YYYY') : '—',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status) => getStatusTag(status),
        },
        {
            title: 'Filed By',
            key: 'filed_by',
            width: 130,
            render: (_, record) => {
                if (record.claimer) {
                    return `${record.claimer.first_name} ${record.claimer.last_name}`;
                }
                return <Text type="secondary">—</Text>;
            },
        },
        {
            title: 'Processed By',
            key: 'processed_by',
            width: 130,
            render: (_, record) => {
                const user = record.approver || record.rejecter;
                if (user) {
                    return `${user.first_name} ${user.last_name}`;
                }
                return <Text type="secondary">—</Text>;
            },
        },
        {
            title: 'Released By',
            key: 'released_by',
            width: 130,
            render: (_, record) => {
                if (record.releaser) {
                    return `${record.releaser.first_name} ${record.releaser.last_name}`;
                }
                return <Text type="secondary">—</Text>;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 200,
            render: (_, record) => {
                // Backend enforces jurisdiction scope — all admins can manage claims within their scope

                return (
                    <Space size="small">
                        {record.status === 'pending' && (
                            <>
                                <Button
                                    type="primary"
                                    size="small"
                                    onClick={() => handleStatusUpdate(record.id, 'approved')}
                                >
                                    Approve
                                </Button>
                                <Button
                                    danger
                                    size="small"
                                    onClick={() => handleStatusUpdate(record.id, 'rejected')}
                                >
                                    Reject
                                </Button>
                            </>
                        )}
                        {record.status === 'approved' && (
                            <Button
                                type="primary"
                                size="small"
                                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                                onClick={() => handleStatusUpdate(record.id, 'released')}
                            >
                                Mark Released
                            </Button>
                        )}
                        {(record.status === 'released' || record.status === 'rejected') && (
                            <Text type="secondary">
                                {record.status === 'released' ? 'Completed' : 'Closed'}
                            </Text>
                        )}
                    </Space>
                );
            },
        },
    ];

    // Eligible seniors table columns
    const eligibleColumns = [
        {
            title: 'OSCA ID',
            dataIndex: 'osca_id',
            key: 'osca_id',
            render: (text) => text || '—',
        },
        {
            title: 'Senior Name',
            dataIndex: 'full_name',
            key: 'full_name',
        },
        {
            title: 'Age',
            dataIndex: 'age',
            key: 'age',
            width: 80,
            align: 'center',
            render: (age) => age,
        },
        {
            title: 'Barangay',
            dataIndex: 'barangay',
            key: 'barangay',
        },
        {
            title: 'Eligible Benefit',
            dataIndex: 'benefit_name',
            key: 'benefit_name',
            render: (text) => text || '—',
        },
        {
            title: 'Benefit Amount',
            dataIndex: 'formatted_amount',
            key: 'formatted_amount',
            align: 'right',
            render: (text) => text || '—',
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 200,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="View all claims/eligibility">
                        <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => fetchSeniorHistory(record.senior_id)}
                        >
                            View History
                        </Button>
                    </Tooltip>
                    <Button
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => handleCreateClaim(record.senior_id, record.benefit_type_id)}
                    >
                        Claim
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <Title level={2} style={{ marginBottom: 24 }}>
                <GiftOutlined style={{ marginRight: 12 }} />
                Benefits Eligibility and Claims
            </Title>

            {/* Statistics Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={8} md={4}>
                    <Card size="small">
                        <Statistic
                            title="Total Claims"
                            value={statistics.total_claims || 0}
                            prefix={<GiftOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={8} md={4}>
                    <Card size="small">
                        <Statistic
                            title="Pending"
                            value={statistics.pending || 0}
                            valueStyle={{ color: '#faad14' }}
                            prefix={<ClockCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={8} md={4}>
                    <Card size="small">
                        <Statistic
                            title="Approved"
                            value={statistics.approved || 0}
                            valueStyle={{ color: '#1890ff' }}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={8} md={4}>
                    <Card size="small">
                        <Statistic
                            title="Released"
                            value={statistics.released || 0}
                            valueStyle={{ color: '#52c41a' }}
                            prefix={<DollarOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={8} md={4}>
                    <Card size="small">
                        <Statistic
                            title="Eligible Unclaimed"
                            value={statistics.eligible_unclaimed || 0}
                            valueStyle={{ color: '#722ed1' }}
                            prefix={<UserOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={8} md={4}>
                    <Card size="small">
                        <Statistic
                            title="Total Released (₱)"
                            value={statistics.total_released_amount || 0}
                            valueStyle={{ color: '#52c41a' }}
                            prefix="₱"
                            formatter={(value) => parseFloat(value).toLocaleString()}
                        />
                    </Card>
                </Col>
            </Row>

            <Card>
                <Tabs activeKey={activeTab} onChange={setActiveTab}>
                    <TabPane
                        tab={
                            <span>
                                <GiftOutlined />
                                Claims ({statistics.total_claims || 0})
                            </span>
                        }
                        key="claims"
                    >
                        {/* Filters */}
                        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                            <Col xs={24} sm={12} md={6}>
                                <Input
                                    placeholder="Search by name or OSCA ID"
                                    prefix={<SearchOutlined />}
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    allowClear
                                />
                            </Col>
                            <Col xs={12} sm={6} md={4}>
                                <Select
                                    placeholder="Status"
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                    allowClear
                                    style={{ width: '100%' }}
                                >
                                    <Select.Option value="">All Status</Select.Option>
                                    <Select.Option value="pending">Pending</Select.Option>
                                    <Select.Option value="approved">Approved</Select.Option>
                                    <Select.Option value="released">Released</Select.Option>
                                    <Select.Option value="rejected">Rejected</Select.Option>
                                </Select>
                            </Col>
                            <Col xs={12} sm={6} md={4}>
                                <Select
                                    placeholder="Type"
                                    value={typeFilter}
                                    onChange={setTypeFilter}
                                    allowClear
                                    style={{ width: '100%' }}
                                >
                                    <Select.Option value="">All Types</Select.Option>
                                    {benefitTypes.map((type) => (
                                        <Select.Option key={type.id} value={type.id}>
                                            {type.name}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Col>
                            <Col xs={12} sm={6} md={3}>
                                <Select
                                    value={yearFilter}
                                    onChange={setYearFilter}
                                    style={{ width: '100%' }}
                                >
                                    {[currentYear, currentYear - 1, currentYear - 2].map((year) => (
                                        <Select.Option key={year} value={year}>
                                            {year}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Col>
                            <Col xs={12} sm={6} md={3}>
                                <Button
                                    icon={<DownloadOutlined />}
                                    onClick={handleExport}
                                    style={{ width: '100%' }}
                                >
                                    Export CSV
                                </Button>
                            </Col>
                        </Row>

                        <Table
                            columns={claimsColumns}
                            dataSource={claims}
                            rowKey="id"
                            loading={loading}
                            pagination={{
                                ...pagination,
                                showSizeChanger: true,
                                showTotal: (total) => `Total ${total} claims`,
                                onChange: (page, pageSize) =>
                                    setPagination({ ...pagination, current: page, pageSize }),
                            }}
                            scroll={{ x: 1400 }}
                        />
                    </TabPane>

                    <TabPane
                        tab={
                            <span>
                                <UserOutlined />
                                Eligible Seniors ({eligiblePagination.total})
                            </span>
                        }
                        key="eligible"
                    >
                        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                            <Col xs={24} sm={12} md={8}>
                                <Input
                                    placeholder="Search by name or OSCA ID"
                                    prefix={<SearchOutlined />}
                                    value={eligibleSearch}
                                    onChange={(e) => {
                                        setEligibleSearch(e.target.value);
                                        setEligiblePagination(prev => ({ ...prev, current: 1 }));
                                    }}
                                    allowClear
                                />
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Select
                                    placeholder="All Categories"
                                    value={eligibleTypeFilter}
                                    onChange={(val) => {
                                        setEligibleTypeFilter(val);
                                        setEligiblePagination(prev => ({ ...prev, current: 1 }));
                                    }}
                                    allowClear
                                    style={{ width: '100%' }}
                                >
                                    <Select.Option value="">All Categories</Select.Option>
                                    {benefitTypes.filter(t => t.amount > 0).map((type) => (
                                        <Select.Option key={type.id} value={type.id}>
                                            {type.name} ({type.min_age}+)
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Col>
                            <Col xs={24} sm={12} md={4}>
                                <Button
                                    icon={<DownloadOutlined />}
                                    onClick={handleExportEligible}
                                    style={{ width: '100%' }}
                                >
                                    Export CSV
                                </Button>
                            </Col>
                        </Row>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                            These seniors are eligible for benefits they haven't claimed yet.
                        </Text>

                        <Table
                            columns={eligibleColumns}
                            dataSource={eligible}
                            rowKey={(record) => `${record.senior_id}-${record.benefit_type_id}`}
                            loading={loading}
                            pagination={{
                                ...eligiblePagination,
                                showSizeChanger: true,
                                showTotal: (total) => `Total ${total} eligible`,
                                onChange: (page, pageSize) =>
                                    setEligiblePagination({ ...eligiblePagination, current: page, pageSize }),
                            }}
                            scroll={{ x: 800 }}
                        />
                    </TabPane>
                </Tabs>
            </Card>

            {/* Benefit Types Reference */}
            <Card title="Benefit Categories Reference" style={{ marginTop: 24 }} size="small">
                <Row gutter={[16, 8]}>
                    {benefitTypes.map((type) => (
                        <Col key={type.id} xs={12} sm={8} md={4}>
                            <Card size="small" style={{ textAlign: 'center' }}>
                                <Text strong>{type.name}</Text>
                                <br />
                                <Text type="secondary">{type.age_range} yrs</Text>
                                <br />
                                <Text style={{ color: '#52c41a' }}>{type.formatted_amount}</Text>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Card>

            {/* Senior Claim History Modal */}
            <Modal
                title={
                    <Space>
                        <UserOutlined />
                        <span>
                            {seniorHistory?.senior?.full_name || 'Senior'} - Claim History
                        </span>
                    </Space>
                }
                open={historyModalVisible}
                onCancel={() => {
                    setHistoryModalVisible(false);
                    setSeniorHistory(null);
                }}
                footer={null}
                width={800}
                loading={historyLoading}
            >
                {seniorHistory && (
                    <>
                        {/* Senior Info */}
                        <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
                            <Descriptions.Item label="OSCA ID">
                                <Text strong style={{ color: '#1890ff' }}>
                                    {seniorHistory.senior?.osca_id}
                                </Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Age">
                                <Badge count={seniorHistory.senior?.age} style={{ backgroundColor: '#108ee9' }} />
                            </Descriptions.Item>
                            <Descriptions.Item label="Barangay">
                                {seniorHistory.senior?.barangay}
                            </Descriptions.Item>
                        </Descriptions>

                        <Alert
                            message="Cumulative Eligibility"
                            description="Seniors are eligible for ALL benefits where their age meets or exceeds the minimum age requirement. A 100-year-old can claim Octogenarian, Nonagenarian, AND Centenarian benefits (if not yet claimed)."
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />

                        {/* Eligibility Cards */}
                        <Divider orientation="left">Eligibility by Category</Divider>
                        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
                            {seniorHistory.eligibility?.map((item, index) => (
                                <Col xs={24} sm={12} md={8} key={index}>
                                    <Card
                                        size="small"
                                        style={{
                                            borderColor: item.is_eligible
                                                ? item.has_claimed ? '#52c41a' : '#1890ff'
                                                : '#d9d9d9',
                                            borderWidth: 2,
                                        }}
                                    >
                                        <div style={{ textAlign: 'center' }}>
                                            <Text strong>{item.name}</Text>
                                            <div>
                                                <Text type="secondary">{item.min_age}+ yrs</Text>
                                            </div>
                                            <div style={{ margin: '8px 0' }}>
                                                <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>
                                                    {item.formatted_amount}
                                                </Text>
                                            </div>
                                            <div>
                                                {!item.is_eligible ? (
                                                    <Tag color="default">Not Yet Eligible</Tag>
                                                ) : item.has_claimed ? (
                                                    <Tag
                                                        color={
                                                            item.claim_status === 'released' ? 'green' :
                                                                item.claim_status === 'approved' ? 'blue' :
                                                                    item.claim_status === 'pending' ? 'gold' : 'default'
                                                        }
                                                        icon={
                                                            item.claim_status === 'released' ? <DollarOutlined /> :
                                                                item.claim_status === 'approved' ? <CheckCircleOutlined /> :
                                                                    <ClockCircleOutlined />
                                                        }
                                                    >
                                                        {item.claim_status?.toUpperCase()}
                                                    </Tag>
                                                ) : (
                                                    <Button
                                                        type="primary"
                                                        size="small"
                                                        icon={<PlusOutlined />}
                                                        onClick={() => handleCreateClaimFromHistory(
                                                            seniorHistory.senior?.id,
                                                            item.benefit_type_id,
                                                            item.name
                                                        )}
                                                    >
                                                        Create Claim
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </Col>
                            ))}
                        </Row>

                        {/* Claim History */}
                        {seniorHistory.claims?.length > 0 && (
                            <>
                                <Divider orientation="left">Claim History</Divider>
                                <Table
                                    size="small"
                                    columns={[
                                        { title: 'Benefit', dataIndex: 'benefit_name', key: 'benefit_name' },
                                        {
                                            title: 'Amount',
                                            dataIndex: 'amount',
                                            key: 'amount',
                                            render: (amt) => <Text style={{ color: '#52c41a' }}>₱{parseFloat(amt).toLocaleString()}</Text>
                                        },
                                        { title: 'Year', dataIndex: 'claim_year', key: 'claim_year' },
                                        { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => getStatusTag(s) },
                                        {
                                            title: 'Filed By', dataIndex: 'filed_by', key: 'filed_by',
                                            render: (text) => text || '—',
                                        },
                                        {
                                            title: 'Processed By', dataIndex: 'processed_by', key: 'processed_by',
                                            render: (text) => text || '—',
                                        },
                                        {
                                            title: 'Released By', dataIndex: 'released_by', key: 'released_by',
                                            render: (text) => text || '—',
                                        },
                                    ]}
                                    dataSource={seniorHistory.claims}
                                    rowKey="id"
                                    pagination={false}
                                />
                            </>
                        )}
                    </>
                )}
            </Modal>
        </div>
    );
};

export default Benefits;
