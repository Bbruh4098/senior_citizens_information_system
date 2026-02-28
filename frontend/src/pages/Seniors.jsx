import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Table,
    Card,
    Input,
    Select,
    Button,
    Space,
    Tag,
    Row,
    Col,
    Statistic,
    Typography,
    Avatar,
    Tooltip,
    message,
    Checkbox,
    Modal,
    Descriptions,
    Divider,
} from 'antd';
import {
    SearchOutlined,
    UserOutlined,
    EyeOutlined,
    DownloadOutlined,
    ManOutlined,
    WomanOutlined,
    TeamOutlined,
    GiftOutlined,
    PlusOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    DollarOutlined,
    EditOutlined,
} from '@ant-design/icons';
import { seniorsApi, benefitsApi, registrationApi } from '../services/api';
import SeniorEditModal from '../components/SeniorEditModal';
import SeniorProfileModal from '../components/SeniorProfileModal';

const { Title, Text } = Typography;
const { Option } = Select;

const Seniors = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [seniors, setSeniors] = useState([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 15,
        total: 0,
    });
    const [filters, setFilters] = useState({
        search: '',
        status: 'active',
        barangay_id: null,
        age_categories: [], // For age filter: octogenarians, nonagenarians, centenarians
    });
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        male: 0,
        female: 0,
    });
    const [profileModal, setProfileModal] = useState({ visible: false, seniorId: null });
    const [barangays, setBarangays] = useState([]);

    // Claim History Modal State
    const [claimHistoryModal, setClaimHistoryModal] = useState({ visible: false, loading: false, data: null });

    // Edit Modal State
    const [editModal, setEditModal] = useState({ visible: false, seniorId: null });

    useEffect(() => {
        fetchSeniors();
        fetchStatistics();
        loadBarangays();
    }, []);

    const loadBarangays = async () => {
        try {
            const response = await registrationApi.getBarangays();
            setBarangays(response.data.data || []);
        } catch (error) {
            console.error('Failed to load barangays:', error);
        }
    };

    const fetchSeniors = async (page = 1, pageSize = 15, customFilters = null) => {
        setLoading(true);
        try {
            const currentFilters = customFilters || filters;
            const params = {
                page,
                per_page: pageSize,
                search: currentFilters.search || undefined,
                status: currentFilters.status || undefined,
                barangay_id: currentFilters.barangay_id || undefined,
                age_categories: currentFilters.age_categories.length > 0 ? currentFilters.age_categories.join(',') : undefined,
            };
            const response = await seniorsApi.getList(params);
            const { data, current_page, per_page, total } = response.data.data;

            setSeniors(data);
            setPagination({
                current: current_page,
                pageSize: per_page,
                total,
            });
        } catch (error) {
            console.error('Error fetching seniors:', error);
            message.error('Failed to load seniors');
        } finally {
            setLoading(false);
        }
    };

    const fetchStatistics = async () => {
        try {
            const response = await seniorsApi.getStatistics();
            setStats(response.data.data);
        } catch (error) {
            console.error('Error fetching statistics:', error);
        }
    };

    const handleTableChange = (paginationConfig) => {
        fetchSeniors(paginationConfig.current, paginationConfig.pageSize);
    };

    const handleSearch = (value) => {
        const newFilters = { ...filters, search: value };
        setFilters(newFilters);
        fetchSeniors(1, pagination.pageSize, newFilters);
    };

    const handleStatusChange = (value) => {
        const newFilters = { ...filters, status: value };
        setFilters(newFilters);
        fetchSeniors(1, pagination.pageSize, newFilters);
    };

    const handleAgeCategoryChange = (checkedValues) => {
        const newFilters = { ...filters, age_categories: checkedValues };
        setFilters(newFilters);
        fetchSeniors(1, pagination.pageSize, newFilters);
    };

    const handleExport = async () => {
        try {
            const params = {
                search: filters.search || undefined,
                status: filters.status || undefined,
                barangay_id: filters.barangay_id || undefined,
                age_categories: filters.age_categories.length > 0 ? filters.age_categories.join(',') : undefined,
            };
            const response = await seniorsApi.export(params);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `seniors_export_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            message.success('Export downloaded successfully');
        } catch (error) {
            message.error('Export failed');
        }
    };

    const fetchClaimHistory = async (seniorId) => {
        setClaimHistoryModal({ visible: true, loading: true, data: null });
        try {
            const response = await benefitsApi.getSeniorClaims(seniorId);
            setClaimHistoryModal({ visible: true, loading: false, data: response.data.data });
        } catch (error) {
            console.error('Failed to fetch claim history:', error);
            message.error('Failed to load benefits history');
            setClaimHistoryModal({ visible: false, loading: false, data: null });
        }
    };

    const handleCreateClaimFromSeniors = async (seniorId, benefitTypeId, benefitName) => {
        try {
            await benefitsApi.createClaim({
                senior_id: seniorId,
                benefit_type_id: benefitTypeId,
            });
            message.success(`${benefitName} claim created successfully`);
            fetchClaimHistory(seniorId);
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to create claim');
        }
    };

    const getStatusTag = (record) => {
        if (record.is_deceased) {
            return <Tag color="default">Deceased</Tag>;
        }
        if (!record.is_active) {
            return <Tag color="orange">Inactive</Tag>;
        }
        return <Tag color="green">Active</Tag>;
    };

    const getAgeCategoryTag = (age) => {
        if (age >= 100) return <Tag color="gold">Centenarian</Tag>;
        if (age >= 90) return <Tag color="purple">Nonagenarian</Tag>;
        if (age >= 80) return <Tag color="blue">Octogenarian</Tag>;
        if (age >= 70) return <Tag color="cyan">Septuagenarian</Tag>;
        if (age >= 60) return <Tag color="green">Sexagenarian</Tag>;
        return null;
    };

    const columns = [
        {
            title: 'Senior Citizen',
            key: 'name',
            render: (_, record) => (
                <Space>
                    <Avatar
                        style={{
                            backgroundColor: record.gender_id === 1 ? '#1890ff' : '#eb2f96'
                        }}
                        icon={record.gender_id === 1 ? <ManOutlined /> : <WomanOutlined />}
                    />
                    <div>
                        <Text strong>{record.full_name || `${record.first_name} ${record.last_name}`}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {record.osca_id || 'No OSCA ID'}
                        </Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Age',
            dataIndex: 'age',
            key: 'age',
            width: 120,
            render: (age) => (
                <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: 16 }}>{age}</Text>
                    {getAgeCategoryTag(age)}
                </Space>
            ),
        },
        {
            title: 'Barangay',
            key: 'barangay',
            render: (_, record) => record.barangay?.name || '-',
        },
        {
            title: 'Registration',
            key: 'registration_status',
            render: (_, record) => (
                <Tag color={record.registration_status?.code === 'approved' ? 'green' : 'blue'}>
                    {record.registration_status?.name || 'Pending'}
                </Tag>
            ),
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => getStatusTag(record),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="View Profile">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            onClick={() => setProfileModal({ visible: true, seniorId: record.id })}
                        />
                    </Tooltip>
                    <Tooltip title="Edit">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => setEditModal({ visible: true, seniorId: record.id })}
                        />
                    </Tooltip>
                    <Tooltip title="Benefits History">
                        <Button
                            type="text"
                            icon={<GiftOutlined />}
                            onClick={() => fetchClaimHistory(record.id)}
                        />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    const ageCategoryOptions = [
        { label: 'Sexagenarians (60-69)', value: 'sexagenarians' },
        { label: 'Septuagenarians (70-79)', value: 'septuagenarians' },
        { label: 'Octogenarians (80-89)', value: 'octogenarians' },
        { label: 'Nonagenarians (90-99)', value: 'nonagenarians' },
        { label: 'Centenarians (100+)', value: 'centenarians' },
    ];

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}>Senior Citizens</Title>
                <Text type="secondary">Manage registered senior citizens</Text>
            </div>

            {/* Statistics Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                    <Card bodyStyle={{ padding: 16 }}>
                        <Statistic
                            title="Total Registered"
                            value={stats.total}
                            prefix={<TeamOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card bodyStyle={{ padding: 16 }}>
                        <Statistic
                            title="Active"
                            value={stats.active}
                            valueStyle={{ color: '#52c41a' }}
                            prefix={<UserOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card bodyStyle={{ padding: 16 }}>
                        <Statistic
                            title="Male"
                            value={stats.male}
                            valueStyle={{ color: '#1890ff' }}
                            prefix={<ManOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card bodyStyle={{ padding: 16 }}>
                        <Statistic
                            title="Female"
                            value={stats.female}
                            valueStyle={{ color: '#eb2f96' }}
                            prefix={<WomanOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Age Category Quick Filters */}
            <Card size="small" style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Text strong style={{ marginRight: 8 }}>Age Categories:</Text>
                    <Checkbox.Group
                        options={ageCategoryOptions}
                        value={filters.age_categories}
                        onChange={handleAgeCategoryChange}
                    />
                    {filters.age_categories.length > 0 && (
                        <Button
                            type="link"
                            size="small"
                            onClick={() => handleAgeCategoryChange([])}
                        >
                            Clear
                        </Button>
                    )}
                </Space>
            </Card>

            {/* Filters & Actions */}
            <Card style={{ marginBottom: 16, borderRadius: 8 }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={8}>
                        <Input
                            placeholder="Search by name or OSCA ID..."
                            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                            allowClear
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </Col>
                    <Col xs={12} sm={4}>
                        <Select
                            placeholder="Status"
                            style={{ width: '100%' }}
                            defaultValue="active"
                            onChange={handleStatusChange}
                        >
                            <Option value="">All Status</Option>
                            <Option value="active">Active</Option>
                            <Option value="inactive">Inactive</Option>
                            <Option value="deceased">Deceased</Option>
                        </Select>
                    </Col>
                    <Col xs={12} sm={4}>
                        <Select
                            placeholder="All Barangays"
                            style={{ width: '100%' }}
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            onChange={(value) => {
                                const newFilters = { ...filters, barangay_id: value };
                                setFilters(newFilters);
                                setPagination(prev => ({ ...prev, current: 1 }));
                                fetchSeniors(1, pagination.pageSize, newFilters);
                            }}
                        >
                            {barangays.map(b => (
                                <Option key={b.id} value={b.id}>{b.name}</Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} style={{ textAlign: 'right' }}>
                        <Space wrap>
                            <Button
                                icon={<DownloadOutlined />}
                                onClick={handleExport}
                            >
                                Export Excel
                            </Button>
                            <Button
                                type="primary"
                                onClick={() => navigate('/admin/registration/new')}
                            >
                                + New Registration
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* Table */}
            <Card style={{ borderRadius: 8 }}>
                <div style={{ overflowX: 'auto' }}>
                    <Table
                        columns={columns}
                        dataSource={seniors}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            ...pagination,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} seniors`,
                        }}
                        onChange={handleTableChange}
                        scroll={{ x: 800 }}
                    />
                </div>
            </Card>

            {/* Senior Profile Modal */}
            <SeniorProfileModal
                visible={profileModal.visible}
                seniorId={profileModal.seniorId}
                onClose={() => setProfileModal({ visible: false, seniorId: null })}
            />

            {/* Benefits History Modal */}
            <Modal
                title={
                    <Space>
                        <GiftOutlined />
                        <span>
                            {claimHistoryModal.data?.senior?.full_name || 'Senior'} - Benefits History
                        </span>
                    </Space>
                }
                open={claimHistoryModal.visible}
                onCancel={() => setClaimHistoryModal({ visible: false, loading: false, data: null })}
                footer={null}
                width={700}
                loading={claimHistoryModal.loading}
            >
                {claimHistoryModal.data && (
                    <>
                        <Descriptions size="small" column={3} style={{ marginBottom: 16 }}>
                            <Descriptions.Item label="OSCA ID">
                                <Tag color="blue">{claimHistoryModal.data.senior?.osca_id}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Age">
                                <Tag color="purple">{claimHistoryModal.data.senior?.age}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Barangay">
                                {claimHistoryModal.data.senior?.barangay || '-'}
                            </Descriptions.Item>
                        </Descriptions>

                        <Divider orientation="left">Eligibility by Category</Divider>
                        <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
                            {claimHistoryModal.data.eligibility?.map((item, index) => (
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
                                            <div><Text type="secondary">{item.min_age}+ yrs</Text></div>
                                            <div style={{ margin: '8px 0' }}>
                                                <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>
                                                    {item.formatted_amount}
                                                </Text>
                                            </div>
                                            <div>
                                                {!item.is_eligible ? (
                                                    <Tag color="default">Not Eligible</Tag>
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
                                                        onClick={() => handleCreateClaimFromSeniors(
                                                            claimHistoryModal.data.senior?.id,
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

                        {claimHistoryModal.data.claims?.length > 0 && (
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
                                        {
                                            title: 'Status', dataIndex: 'status', key: 'status', render: (s) => (
                                                <Tag color={s === 'released' ? 'green' : s === 'approved' ? 'blue' : s === 'pending' ? 'gold' : 'red'}>
                                                    {s?.toUpperCase()}
                                                </Tag>
                                            )
                                        },
                                        { title: 'Filed', dataIndex: 'created_at', key: 'created_at' },
                                    ]}
                                    dataSource={claimHistoryModal.data.claims}
                                    rowKey="id"
                                    pagination={false}
                                />
                            </>
                        )}
                    </>
                )}
            </Modal>

            {/* Senior Edit Modal */}
            <SeniorEditModal
                visible={editModal.visible}
                seniorId={editModal.seniorId}
                onClose={() => setEditModal({ visible: false, seniorId: null })}
                onSuccess={() => {
                    fetchSeniors();
                    fetchStatistics();
                }}
            />
        </div>
    );
};

export default Seniors;
