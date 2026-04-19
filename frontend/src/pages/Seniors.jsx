import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Table,
    Card,
    Input,
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
    Popover,
    Empty,
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
    FilterOutlined,
    FilterFilled,
} from '@ant-design/icons';
import { seniorsApi, benefitsApi, registrationApi } from '../services/api';
import SeniorEditModal from '../components/SeniorEditModal';
import SeniorProfileModal from '../components/SeniorProfileModal';

const { Title, Text } = Typography;

const STATUS_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'deceased', label: 'Deceased' },
];

const ColumnFilterPopover = ({ title, options, selected, onChange, labelKey = 'label', valueKey = 'value' }) => {
    const [search, setSearch] = useState('');
    const [tempSelected, setTempSelected] = useState(selected || []);
    const [open, setOpen] = useState(false);

    const filtered = options.filter((o) => {
        const label = typeof o === 'string' ? o : o[labelKey];
        return label?.toLowerCase().includes(search.toLowerCase());
    });

    const allValues = filtered.map((o) => (typeof o === 'string' ? o : o[valueKey]));
    const allSelected = allValues.length > 0 && allValues.every((v) => tempSelected.includes(v));

    const handleApply = () => {
        onChange(tempSelected);
        setOpen(false);
    };

    const handleClear = () => {
        setTempSelected([]);
    };

    const handleSelectAll = () => {
        if (allSelected) {
            setTempSelected(tempSelected.filter((v) => !allValues.includes(v)));
        } else {
            const merged = [...new Set([...tempSelected, ...allValues])];
            setTempSelected(merged);
        }
    };

    const handleToggle = (value) => {
        setTempSelected((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
        );
    };

    const isActive = selected && selected.length > 0;

    const content = (
        <div style={{ width: 250 }}>
            <Input
                placeholder={`Search ${title}...`}
                prefix={<SearchOutlined />}
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
                style={{ marginBottom: 8 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Button type="link" size="small" onClick={handleSelectAll} style={{ padding: 0 }}>
                    {allSelected ? 'Deselect All' : 'Select All'}
                </Button>
                <Button type="link" size="small" onClick={handleClear} style={{ padding: 0 }} danger>
                    Clear
                </Button>
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto', borderTop: '1px solid #f0f0f0', paddingTop: 6 }}>
                {filtered.length === 0 ? (
                    <Empty description="No options" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '8px 0' }} />
                ) : (
                    filtered.map((option) => {
                        const label = typeof option === 'string' ? option : option[labelKey];
                        const value = typeof option === 'string' ? option : option[valueKey];
                        return (
                            <div
                                key={value}
                                style={{ padding: '4px 0', cursor: 'pointer' }}
                                onClick={() => handleToggle(value)}
                            >
                                <Checkbox checked={tempSelected.includes(value)}>
                                    <Text style={{ fontSize: 13 }}>{label}</Text>
                                </Checkbox>
                            </div>
                        );
                    })
                )}
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button size="small" onClick={() => { setTempSelected(selected || []); setOpen(false); }}>
                    Cancel
                </Button>
                <Button type="primary" size="small" onClick={handleApply}>
                    Apply
                </Button>
            </div>
        </div>
    );

    return (
        <Popover
            content={content}
            trigger="click"
            open={open}
            onOpenChange={(v) => {
                setOpen(v);
                if (v) {
                    setTempSelected(selected || []);
                    setSearch('');
                }
            }}
            placement="bottomLeft"
        >
            {isActive ? (
                <FilterFilled style={{ color: '#1890ff', cursor: 'pointer', marginLeft: 4 }} />
            ) : (
                <FilterOutlined style={{ color: '#bfbfbf', cursor: 'pointer', marginLeft: 4 }} />
            )}
        </Popover>
    );
};

const Seniors = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [seniors, setSeniors] = useState([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [filters, setFilters] = useState({
        search: '',
        status: ['all'],
        barangay_id: [],
        gender_id: [],
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
    const [genders, setGenders] = useState([]);

    // Claim History Modal State
    const [claimHistoryModal, setClaimHistoryModal] = useState({ visible: false, loading: false, data: null });

    // Edit Modal State
    const [editModal, setEditModal] = useState({ visible: false, seniorId: null });

    useEffect(() => {
        fetchSeniors();
        fetchStatistics();
        loadBarangays();
        loadGenders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadBarangays = async () => {
        try {
            const response = await registrationApi.getBarangays();
            setBarangays(response.data.data || []);
        } catch (error) {
            console.error('Failed to load barangays:', error);
        }
    };

    const loadGenders = async () => {
        try {
            const response = await registrationApi.getLookupOptions();
            setGenders(response.data.data?.genders || []);
        } catch (error) {
            console.error('Failed to load genders:', error);
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
                status: currentFilters.status?.length ? currentFilters.status.join(',') : undefined,
                barangay_id: currentFilters.barangay_id?.length ? currentFilters.barangay_id.join(',') : undefined,
                gender_id: currentFilters.gender_id?.length ? currentFilters.gender_id.join(',') : undefined,
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

    const handleMultiFilterChange = (key, values) => {
        const newFilters = { ...filters, [key]: values };
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
                status: filters.status?.length ? filters.status.join(',') : undefined,
                barangay_id: filters.barangay_id?.length ? filters.barangay_id.join(',') : undefined,
                gender_id: filters.gender_id?.length ? filters.gender_id.join(',') : undefined,
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
        } catch {
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

    const renderFilterTitle = (label, options, selected, onApply) => (
        <Space size={4}>
            {label}
            <ColumnFilterPopover
                title={label}
                options={options}
                selected={selected}
                onChange={onApply}
            />
        </Space>
    );

    const getGenderLabel = (genderId) => {
        if (!genderId) return '—';
        return genders.find((g) => g.id === genderId)?.name || '—';
    };

    const ageCategoryOptions = [
        { label: 'Sexagenarians (60-69)', value: 'sexagenarians' },
        { label: 'Septuagenarians (70-79)', value: 'septuagenarians' },
        { label: 'Octogenarians (80-89)', value: 'octogenarians' },
        { label: 'Nonagenarians (90-99)', value: 'nonagenarians' },
        { label: 'Centenarians (100+)', value: 'centenarians' },
    ];

    const columns = [
        {
            title: 'Senior Citizen',
            key: 'name',
            render: (_, record) => (
                <Space>
                    <Avatar
                        style={{
                            backgroundColor: record.gender_id === 1 ? '#1890ff' : record.gender_id === 2 ? '#eb2f96' : '#722ed1'
                        }}
                        icon={record.gender_id === 1 ? <ManOutlined /> : record.gender_id === 2 ? <WomanOutlined /> : <UserOutlined />}
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
            title: renderFilterTitle('Age', ageCategoryOptions, filters.age_categories, handleAgeCategoryChange),
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
            title: renderFilterTitle(
                'Barangay',
                barangays.map((b) => ({ label: b.name, value: b.id })),
                filters.barangay_id,
                (values) => handleMultiFilterChange('barangay_id', values)
            ),
            key: 'barangay',
            render: (_, record) => record.barangay?.name || '-',
        },
        {
            title: renderFilterTitle(
                'Gender',
                genders.map((g) => ({ label: g.name, value: g.id })),
                filters.gender_id,
                (values) => handleMultiFilterChange('gender_id', values)
            ),
            key: 'gender',
            dataIndex: 'gender_id',
            width: 120,
            render: (genderId) => getGenderLabel(genderId),
        },
        {
            title: renderFilterTitle(
                'Status',
                STATUS_OPTIONS,
                filters.status,
                (values) => handleMultiFilterChange('status', values)
            ),
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
                    <Col xs={24} sm={12} md={12}>
                        <Input
                            placeholder="Search by name or OSCA ID..."
                            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                            allowClear
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={12} style={{ textAlign: 'right' }}>
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
