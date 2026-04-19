import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Card,
    Table,
    Tabs,
    InputNumber,
    Tag,
    Button,
    Space,
    Typography,
    Row,
    Col,
    Statistic,
    Input,
    Modal,
    message,
    Tooltip,
    Badge,
    Descriptions,
    Divider,
    Alert,
    Avatar,
    DatePicker,
    Checkbox,
    Popover,
    Empty,
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
    FilterOutlined,
    FilterFilled,
    CloseOutlined,
} from '@ant-design/icons';
import { benefitsApi } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

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
            // Deselect all visible
            setTempSelected(tempSelected.filter((v) => !allValues.includes(v)));
        } else {
            // Add all visible
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
            <Tooltip title={`Filter by ${title}`}>
                {isActive ? (
                    <FilterFilled style={{ color: '#1890ff', cursor: 'pointer', marginLeft: 4 }} />
                ) : (
                    <FilterOutlined style={{ color: '#bfbfbf', cursor: 'pointer', marginLeft: 4 }} />
                )}
            </Tooltip>
        </Popover>
    );
};

const Benefits = () => {
    // State
    const [activeTab, setActiveTab] = useState('claims');
    const [loading, setLoading] = useState(false);
    const [claims, setClaims] = useState([]);
    const [eligible, setEligible] = useState([]);
    const [benefitTypes, setBenefitTypes] = useState([]);
    const [statistics, setStatistics] = useState({});
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [eligiblePagination, setEligiblePagination] = useState({ current: 1, pageSize: 10, total: 0 });

    // Filter options from API
    const [filterOptions, setFilterOptions] = useState({ barangays: [], districts: [], genders: [] });

    // Senior History Modal
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [seniorHistory, setSeniorHistory] = useState(null);

    // Filters — multi-select arrays
    const [statusFilter, setStatusFilter] = useState([]);
    const [typeFilter, setTypeFilter] = useState([]);
    const [barangayFilter, setBarangayFilter] = useState([]);
    const [districtFilter, setDistrictFilter] = useState([]);
    const [genderFilter, setGenderFilter] = useState([]);
    const [dateRange, setDateRange] = useState([dayjs().startOf('year'), dayjs()]);
    const [searchText, setSearchText] = useState('');

    // Eligible tab filters
    const [eligibleSearch, setEligibleSearch] = useState('');
    const [eligibleBarangayFilter, setEligibleBarangayFilter] = useState([]);
    const [eligibleTypeFilter, setEligibleTypeFilter] = useState([]);
    const [eligibleGenderFilter, setEligibleGenderFilter] = useState([]);
    const [eligibleMinAge, setEligibleMinAge] = useState(null);
    const [eligibleMaxAge, setEligibleMaxAge] = useState(null);
    const [eligibleMinAmount, setEligibleMinAmount] = useState(null);
    const [eligibleMaxAmount, setEligibleMaxAmount] = useState(null);

    // Debounce timer for search
    const searchTimer = useRef(null);

    // Build filter params object (reused by claims, stats, export)
    const buildFilterParams = useCallback(() => {
        const params = {};
        if (statusFilter.length > 0) params.status = statusFilter.join(',');
        if (typeFilter.length > 0) params.benefit_type_id = typeFilter.join(',');
        if (barangayFilter.length > 0) params.barangay_ids = barangayFilter.join(',');
        if (districtFilter.length > 0) params.district = districtFilter.join(',');
        if (genderFilter.length > 0) params.gender_id = genderFilter.join(',');
        if (dateRange && dateRange[0] && dateRange[1]) {
            params.date_from = dateRange[0].format('YYYY-MM-DD');
            params.date_to = dateRange[1].format('YYYY-MM-DD');
        }
        if (searchText) params.search = searchText;
        return params;
    }, [statusFilter, typeFilter, barangayFilter, districtFilter, genderFilter, dateRange, searchText]);

    // Initial load
    useEffect(() => {
        fetchBenefitTypes();
        fetchFilterOptions();
    }, []);

    // Load claims + stats whenever filters change
    useEffect(() => {
        if (activeTab === 'claims') {
            fetchClaims();
        } else {
            fetchEligible();
        }
    }, [activeTab, statusFilter, typeFilter, barangayFilter, districtFilter, genderFilter, dateRange, searchText, pagination.current, pagination.pageSize, eligiblePagination.current, eligibleSearch, eligibleTypeFilter, eligibleBarangayFilter, eligibleGenderFilter, eligibleMinAge, eligibleMaxAge, eligibleMinAmount, eligibleMaxAmount]);

    // Fetch statistics whenever filters change
    useEffect(() => {
        fetchStatistics();
    }, [statusFilter, typeFilter, barangayFilter, districtFilter, dateRange, searchText]);

    const fetchBenefitTypes = async () => {
        try {
            const response = await benefitsApi.getTypes();
            setBenefitTypes(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch benefit types:', error);
        }
    };

    const fetchFilterOptions = async () => {
        try {
            const response = await benefitsApi.getFilterOptions();
            setFilterOptions(response.data.data || { barangays: [], districts: [], genders: [] });
        } catch (error) {
            console.error('Failed to fetch filter options:', error);
        }
    };

    const fetchStatistics = async () => {
        try {
            const params = buildFilterParams();
            const response = await benefitsApi.getStatistics(params);
            setStatistics(response.data.data || {});
        } catch (error) {
            console.error('Failed to fetch statistics:', error);
        }
    };

    const fetchClaims = async () => {
        setLoading(true);
        try {
            const params = {
                ...buildFilterParams(),
                page: pagination.current,
                per_page: pagination.pageSize,
            };

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
            if (eligibleTypeFilter.length > 0) params.benefit_type_id = eligibleTypeFilter.join(',');
            if (eligibleBarangayFilter.length > 0) params.barangay_ids = eligibleBarangayFilter.join(',');
            if (eligibleGenderFilter.length > 0) params.gender_id = eligibleGenderFilter.join(',');
            if (eligibleMinAge) params.min_age = eligibleMinAge;
            if (eligibleMaxAge) params.max_age = eligibleMaxAge;
            if (eligibleMinAmount) params.min_amount = eligibleMinAmount;
            if (eligibleMaxAmount) params.max_amount = eligibleMaxAmount;

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
            const params = buildFilterParams();

            const response = await benefitsApi.exportClaims(params);

            // Create download link
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `benefits_claims_${Date.now()}.xlsx`;
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
            if (eligibleTypeFilter.length > 0) params.benefit_type_id = eligibleTypeFilter.join(',');
            if (eligibleBarangayFilter.length > 0) params.barangay_ids = eligibleBarangayFilter.join(',');
            if (eligibleGenderFilter.length > 0) params.gender_id = eligibleGenderFilter.join(',');
            if (eligibleMinAge) params.min_age = eligibleMinAge;
            if (eligibleMaxAge) params.max_age = eligibleMaxAge;
            if (eligibleMinAmount) params.min_amount = eligibleMinAmount;
            if (eligibleMaxAmount) params.max_amount = eligibleMaxAmount;

            const response = await benefitsApi.exportEligible(params);

            // Create download link
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `eligible_seniors_${Date.now()}.xlsx`;
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

    // Debounced search handler
    const handleSearchChange = (e) => {
        const value = e.target.value;
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            setSearchText(value);
            setPagination(prev => ({ ...prev, current: 1 }));
        }, 400);
    };

    // Remove a specific filter
    const handleRemoveFilter = (filterType, value) => {
        switch (filterType) {
            case 'status':
                setStatusFilter(prev => prev.filter(v => v !== value));
                break;
            case 'type':
                setTypeFilter(prev => prev.filter(v => v !== value));
                break;
            case 'barangay':
                setBarangayFilter(prev => prev.filter(v => v !== value));
                break;
            case 'district':
                setDistrictFilter(prev => prev.filter(v => v !== value));
                break;
            case 'gender':
                setGenderFilter(prev => prev.filter(v => v !== value));
                break;
            default:
                break;
        }
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const handleClearAllFilters = () => {
        setStatusFilter([]);
        setTypeFilter([]);
        setBarangayFilter([]);
        setDistrictFilter([]);
        setGenderFilter([]);
        setDateRange([dayjs().startOf('year'), dayjs()]);
        setSearchText('');
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const hasActiveFilters = statusFilter.length > 0 || typeFilter.length > 0 || barangayFilter.length > 0 || districtFilter.length > 0 || genderFilter.length > 0;

    // Filter option lists
    const statusOptions = [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Released', value: 'released' },
        { label: 'Rejected', value: 'rejected' },
    ];

    const typeOptions = benefitTypes.map(t => ({ label: t.name, value: t.id }));

    const barangayOptions = (filterOptions.barangays || []).map(b => ({
        label: b.name,
        value: b.id,
    }));

    const districtOptions = (filterOptions.districts || []).map(d => ({
        label: d,
        value: d,
    }));

    const genderOptions = (filterOptions.genders || []).map(g => ({
        label: g.name,
        value: g.id,
    }));

    const getGenderLabel = (genderId) => {
        if (!genderId) return '—';
        return genderOptions.find((g) => g.value === genderId)?.label || '—';
    };

    // Helper to render column title with filter icon
    const renderFilterTitle = (label, options, selected, onApply) => (
        <Space size={4}>
            {label}
            <ColumnFilterPopover
                title={label}
                options={options}
                selected={selected}
                onChange={(values) => {
                    onApply(values);
                    setPagination(prev => ({ ...prev, current: 1 }));
                }}
            />
        </Space>
    );

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
                                backgroundColor: senior.gender_id === 1 ? '#1890ff' : senior.gender_id === 2 ? '#eb2f96' : '#8c8c8c'
                            }}
                            icon={senior.gender_id === 1 ? <ManOutlined /> : senior.gender_id === 2 ? <WomanOutlined /> : <UserOutlined />}
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
            title: renderFilterTitle('Barangay', barangayOptions, barangayFilter, setBarangayFilter),
            dataIndex: ['senior', 'barangay', 'name'],
            key: 'barangay',
        },
        {
            title: renderFilterTitle('District', districtOptions, districtFilter, setDistrictFilter),
            key: 'district',
            dataIndex: ['senior', 'barangay', 'district'],
            render: (text) => text || '—',
        },
        {
            title: renderFilterTitle('Gender', genderOptions, genderFilter, setGenderFilter),
            key: 'gender',
            dataIndex: ['senior', 'gender_id'],
            render: (genderId) => getGenderLabel(genderId),
        },
        {
            title: renderFilterTitle('Benefit Type', typeOptions, typeFilter, setTypeFilter),
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
            title: renderFilterTitle('Status', statusOptions, statusFilter, setStatusFilter),
            dataIndex: 'status',
            key: 'status',
            width: 120,
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

    // Eligible tab filter option lists
    const eligibleBarangayOptions = (() => {
        const seen = new Set();
        return (filterOptions.barangays || []).map(b => {
            if (seen.has(b.id)) return null;
            seen.add(b.id);
            return { label: b.name, value: b.id };
        }).filter(Boolean);
    })();

    const eligibleBenefitOptions = benefitTypes.filter(t => t.amount > 0).map(t => ({
        label: t.name,
        value: t.id,
    }));

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
            title: renderFilterTitle('Gender', genderOptions, eligibleGenderFilter, (values) => {
                setEligibleGenderFilter(values);
                setEligiblePagination(prev => ({ ...prev, current: 1 }));
            }),
            dataIndex: 'gender_id',
            key: 'gender',
            render: (genderId) => getGenderLabel(genderId),
        },
        {
            title: renderFilterTitle('Barangay', eligibleBarangayOptions, eligibleBarangayFilter, (values) => {
                setEligibleBarangayFilter(values);
                setEligiblePagination(prev => ({ ...prev, current: 1 }));
            }),
            dataIndex: 'barangay',
            key: 'barangay',
        },
        {
            title: renderFilterTitle('Eligible Benefit', eligibleBenefitOptions, eligibleTypeFilter, (values) => {
                setEligibleTypeFilter(values);
                setEligiblePagination(prev => ({ ...prev, current: 1 }));
            }),
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

    // Render active filter tags
    const renderActiveFilters = () => {
        const tags = [];

        statusFilter.forEach(s => {
            tags.push(
                <Tag
                    key={`status-${s}`}
                    closable
                    onClose={() => handleRemoveFilter('status', s)}
                    color="blue"
                    style={{ marginBottom: 4 }}
                >
                    Status: {s.charAt(0).toUpperCase() + s.slice(1)}
                </Tag>
            );
        });

        typeFilter.forEach(id => {
            const t = benefitTypes.find(bt => bt.id === id);
            tags.push(
                <Tag
                    key={`type-${id}`}
                    closable
                    onClose={() => handleRemoveFilter('type', id)}
                    color="purple"
                    style={{ marginBottom: 4 }}
                >
                    Type: {t?.name || id}
                </Tag>
            );
        });

        barangayFilter.forEach(id => {
            const b = (filterOptions.barangays || []).find(br => br.id === id);
            tags.push(
                <Tag
                    key={`brgy-${id}`}
                    closable
                    onClose={() => handleRemoveFilter('barangay', id)}
                    color="green"
                    style={{ marginBottom: 4 }}
                >
                    Barangay: {b?.name || id}
                </Tag>
            );
        });

        districtFilter.forEach(d => {
            tags.push(
                <Tag
                    key={`dist-${d}`}
                    closable
                    onClose={() => handleRemoveFilter('district', d)}
                    color="orange"
                    style={{ marginBottom: 4 }}
                >
                    District: {d}
                </Tag>
            );
        });

        genderFilter.forEach(id => {
            const g = (filterOptions.genders || []).find((gender) => gender.id === id);
            tags.push(
                <Tag
                    key={`gender-${id}`}
                    closable
                    onClose={() => handleRemoveFilter('gender', id)}
                    color="magenta"
                    style={{ marginBottom: 4 }}
                >
                    Gender: {g?.name || id}
                </Tag>
            );
        });

        if (!hasActiveFilters || tags.length === 0) return null;

        return (
            <div style={{ marginBottom: 12 }}>
                <Space size={[4, 4]} wrap>
                    <Text type="secondary" style={{ fontSize: 12 }}>Active filters:</Text>
                    {tags}
                    <Button
                        type="link"
                        size="small"
                        danger
                        icon={<CloseOutlined />}
                        onClick={handleClearAllFilters}
                        style={{ fontSize: 12, padding: '0 4px' }}
                    >
                        Clear All
                    </Button>
                </Space>
            </div>
        );
    };

    return (
        <div style={{ padding: 24 }}>
            <Title level={2} style={{ marginBottom: 24 }}>
                <GiftOutlined style={{ marginRight: 12 }} />
                Benefits Eligibility and Claims
            </Title>

            {/* Statistics Cards — dynamic to filters */}
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

                <Col xs={12} sm={8} md={8}>
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
                                Claims ({pagination.total || 0})
                            </span>
                        }
                        key="claims"
                    >
                        {/* Search + Date Range + Export */}
                        <Row gutter={[16, 16]} style={{ marginBottom: 12 }}>
                            <Col xs={24} sm={12} md={7}>
                                <Input
                                    placeholder="Search by name or OSCA ID"
                                    prefix={<SearchOutlined />}
                                    defaultValue={searchText}
                                    onChange={handleSearchChange}
                                    allowClear
                                />
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <RangePicker
                                    value={dateRange}
                                    onChange={(dates) => {
                                        setDateRange(dates);
                                        setPagination(prev => ({ ...prev, current: 1 }));
                                    }}
                                    style={{ width: '100%' }}
                                    format="MMM D, YYYY"
                                    allowClear
                                    placeholder={['Start date', 'End date']}
                                />
                            </Col>
                            <Col xs={24} sm={12} md={3}>
                                <Button
                                    icon={<DownloadOutlined />}
                                    onClick={handleExport}
                                    style={{ width: '100%' }}
                                >
                                    Export
                                </Button>
                            </Col>
                        </Row>

                        {/* Active filter tags */}
                        {renderActiveFilters()}

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
                            scroll={{ x: 1600 }}
                            size="middle"
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
                        <Row gutter={[16, 16]} style={{ marginBottom: 12 }}>
                            <Col xs={24} sm={12} md={6}>
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
                                <Space.Compact style={{ width: '100%' }}>
                                    <InputNumber
                                        placeholder="Min Age"
                                        min={60}
                                        max={150}
                                        value={eligibleMinAge}
                                        onChange={(val) => {
                                            setEligibleMinAge(val);
                                            setEligiblePagination(prev => ({ ...prev, current: 1 }));
                                        }}
                                        style={{ width: '50%' }}
                                    />
                                    <InputNumber
                                        placeholder="Max Age"
                                        min={60}
                                        max={150}
                                        value={eligibleMaxAge}
                                        onChange={(val) => {
                                            setEligibleMaxAge(val);
                                            setEligiblePagination(prev => ({ ...prev, current: 1 }));
                                        }}
                                        style={{ width: '50%' }}
                                    />
                                </Space.Compact>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Space.Compact style={{ width: '100%' }}>
                                    <InputNumber
                                        placeholder="Min ₱"
                                        min={0}
                                        value={eligibleMinAmount}
                                        onChange={(val) => {
                                            setEligibleMinAmount(val);
                                            setEligiblePagination(prev => ({ ...prev, current: 1 }));
                                        }}
                                        style={{ width: '50%' }}
                                        formatter={(value) => value ? `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                                        parser={(value) => value.replace(/₱\s?|(,*)/g, '')}
                                    />
                                    <InputNumber
                                        placeholder="Max ₱"
                                        min={0}
                                        value={eligibleMaxAmount}
                                        onChange={(val) => {
                                            setEligibleMaxAmount(val);
                                            setEligiblePagination(prev => ({ ...prev, current: 1 }));
                                        }}
                                        style={{ width: '50%' }}
                                        formatter={(value) => value ? `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                                        parser={(value) => value.replace(/₱\s?|(,*)/g, '')}
                                    />
                                </Space.Compact>
                            </Col>
                            <Col xs={24} sm={12} md={3}>
                                <Button
                                    icon={<DownloadOutlined />}
                                    onClick={handleExportEligible}
                                    style={{ width: '100%' }}
                                >
                                    Export
                                </Button>
                            </Col>
                        </Row>

                        {/* Active eligible filter tags */}
                        {(eligibleBarangayFilter.length > 0 || eligibleTypeFilter.length > 0 || eligibleGenderFilter.length > 0 || eligibleMinAge || eligibleMaxAge || eligibleMinAmount || eligibleMaxAmount) && (
                            <div style={{ marginBottom: 12 }}>
                                <Space size={[4, 4]} wrap>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Active filters:</Text>
                                    {eligibleBarangayFilter.map(id => {
                                        const b = (filterOptions.barangays || []).find(br => br.id === id);
                                        return (
                                            <Tag key={`e-brgy-${id}`} closable onClose={() => setEligibleBarangayFilter(prev => prev.filter(v => v !== id))} color="green" style={{ marginBottom: 4 }}>
                                                Barangay: {b?.name || id}
                                            </Tag>
                                        );
                                    })}
                                    {eligibleTypeFilter.map(id => {
                                        const t = benefitTypes.find(bt => bt.id === id);
                                        return (
                                            <Tag key={`e-type-${id}`} closable onClose={() => setEligibleTypeFilter(prev => prev.filter(v => v !== id))} color="purple" style={{ marginBottom: 4 }}>
                                                Benefit: {t?.name || id}
                                            </Tag>
                                        );
                                    })}
                                    {eligibleGenderFilter.map(id => {
                                        const g = (filterOptions.genders || []).find((gender) => gender.id === id);
                                        return (
                                            <Tag key={`e-gender-${id}`} closable onClose={() => setEligibleGenderFilter(prev => prev.filter(v => v !== id))} color="magenta" style={{ marginBottom: 4 }}>
                                                Gender: {g?.name || id}
                                            </Tag>
                                        );
                                    })}
                                    {eligibleMinAge && <Tag closable onClose={() => setEligibleMinAge(null)} color="cyan" style={{ marginBottom: 4 }}>Min Age: {eligibleMinAge}</Tag>}
                                    {eligibleMaxAge && <Tag closable onClose={() => setEligibleMaxAge(null)} color="cyan" style={{ marginBottom: 4 }}>Max Age: {eligibleMaxAge}</Tag>}
                                    {eligibleMinAmount && <Tag closable onClose={() => setEligibleMinAmount(null)} color="gold" style={{ marginBottom: 4 }}>Min ₱{eligibleMinAmount.toLocaleString()}</Tag>}
                                    {eligibleMaxAmount && <Tag closable onClose={() => setEligibleMaxAmount(null)} color="gold" style={{ marginBottom: 4 }}>Max ₱{eligibleMaxAmount.toLocaleString()}</Tag>}
                                    <Button
                                        type="link"
                                        size="small"
                                        danger
                                        icon={<CloseOutlined />}
                                        onClick={() => {
                                            setEligibleBarangayFilter([]);
                                            setEligibleTypeFilter([]);
                                            setEligibleGenderFilter([]);
                                            setEligibleMinAge(null);
                                            setEligibleMaxAge(null);
                                            setEligibleMinAmount(null);
                                            setEligibleMaxAmount(null);
                                        }}
                                        style={{ fontSize: 12, padding: '0 4px' }}
                                    >
                                        Clear All
                                    </Button>
                                </Space>
                            </div>
                        )}

                        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
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
