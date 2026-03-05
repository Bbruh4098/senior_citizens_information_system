import { useState, useEffect } from 'react';
import {
    Card, Table, Tag, Input, Select, DatePicker, Row, Col, Space, Typography,
    Modal, Descriptions, Button, Statistic, Tooltip, Badge,
} from 'antd';
import {
    AuditOutlined, SearchOutlined, ReloadOutlined, EyeOutlined,
    UserOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { auditLogApi } from '../../services/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Color map for action types
const getActionColor = (action) => {
    // if (action.includes('create') || action === 'login') return 'green';
    // if (action.includes('update')) return 'blue';
    // if (action.includes('delete')) return 'red';
    // if (action.includes('toggle') || action.includes('reset')) return 'orange';
    // if (action === 'logout') return 'default';
    // if (action.includes('archive')) return 'purple';
    // if (action.includes('approved') || action.includes('approve')) return 'cyan';
    // if (action.includes('rejected') || action.includes('reject')) return 'magenta';
    // if (action.includes('released') || action.includes('release')) return 'geekblue';
    // if (action.includes('claim') || action.includes('benefit')) return 'gold';
    return 'default';
};

const AuditLog = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [filters, setFilters] = useState({ search: '', action: undefined, user_id: undefined });
    const [dateRange, setDateRange] = useState(null);
    const [stats, setStats] = useState({});
    const [statsLoading, setStatsLoading] = useState(false);

    // Detail modal
    const [detailModal, setDetailModal] = useState({ visible: false, item: null, loading: false });

    // Filter options (from stats endpoint)
    const [actionTypes, setActionTypes] = useState([]);
    const [admins, setAdmins] = useState([]);

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, []);

    const fetchLogs = async (page = 1) => {
        setLoading(true);
        try {
            const params = {
                page,
                per_page: pagination.pageSize,
                ...filters,
            };
            if (dateRange && dateRange.length === 2) {
                params.from_date = dateRange[0].format('YYYY-MM-DD');
                params.to_date = dateRange[1].format('YYYY-MM-DD');
            }
            // Remove empty values
            Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });

            const response = await auditLogApi.getList(params);
            const data = response.data.data;
            setLogs(data.data || []);
            setPagination({
                current: data.current_page,
                pageSize: data.per_page,
                total: data.total,
            });
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const response = await auditLogApi.getStats();
            const data = response.data.data;
            setStats(data);
            setActionTypes(data.action_types || []);
            setAdmins(data.admins || []);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    const openDetail = async (record) => {
        setDetailModal({ visible: true, item: null, loading: true });
        try {
            const response = await auditLogApi.getById(record.id);
            setDetailModal({ visible: true, item: response.data.data, loading: false });
        } catch {
            setDetailModal({ visible: false, item: null, loading: false });
        }
    };

    const handleSearch = () => fetchLogs(1);

    const handleReset = () => {
        setFilters({ search: '', action: undefined, user_id: undefined });
        setDateRange(null);
        fetchLogs(1);
    };

    const columns = [
        {
            title: 'Timestamp',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 170,
            render: (date) => date ? dayjs(date).format('MMM D, YYYY h:mm A') : '-',
        },
        {
            title: 'Admin',
            key: 'user',
            width: 160,
            render: (_, record) => (
                <Space size={4}>
                    <UserOutlined style={{ color: '#8c8c8c' }} />
                    <Text>{record.user?.name || 'System'}</Text>
                </Space>
            ),
        },
        {
            title: 'Action',
            dataIndex: 'action',
            key: 'action',
            width: 180,
            render: (action, record) => (
                <Tag bordered={false}>{record.action_label}</Tag>
            ),
        },
        {
            title: 'Target',
            key: 'target',
            width: 180,
            render: (_, record) => (
                <div>
                    <Text strong style={{ fontSize: 13 }}>
                        {record.target_name || '—'}
                    </Text>
                    {record.target_type && (
                        <div>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {record.target_type.replace(/_/g, ' ')}
                            </Text>
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: 'IP',
            dataIndex: 'ip_address',
            key: 'ip_address',
            width: 120,
            render: (ip) => <Text type="secondary" style={{ fontSize: 12 }}>{ip || '-'}</Text>,
        },
        {
            title: '',
            key: 'actions',
            width: 50,
            render: (_, record) => record.has_changes ? (
                <Tooltip title="View Changes">
                    <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)} />
                </Tooltip>
            ) : null,
        },
    ];

    // Render diff between old and new values
    const renderDiff = (oldValues, newValues) => {
        if (!oldValues && !newValues) return <Text type="secondary">No value changes recorded</Text>;

        const allKeys = new Set([
            ...Object.keys(oldValues || {}),
            ...Object.keys(newValues || {}),
        ]);

        return (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                    <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Field</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#cf1322' }}>Old Value</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#389e0d' }}>New Value</th>
                    </tr>
                </thead>
                <tbody>
                    {[...allKeys].map(key => (
                        <tr key={key} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '6px 12px', fontWeight: 500 }}>
                                {key.replace(/_/g, ' ').replace(/\bid\b/g, 'ID')}
                            </td>
                            <td style={{ padding: '6px 12px', color: '#cf1322', background: '#fff2f0' }}>
                                {oldValues?.[key] !== undefined ? String(oldValues[key]) : '—'}
                            </td>
                            <td style={{ padding: '6px 12px', color: '#389e0d', background: '#f6ffed' }}>
                                {newValues?.[key] !== undefined ? String(newValues[key]) : '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}>
                    <AuditOutlined style={{ marginRight: 12, color: '#4338ca' }} />
                    Audit Log
                </Title>
            </div>

            {/* Stats Row */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6} lg={4}>
                    <Card bodyStyle={{ padding: 16 }} loading={statsLoading}>
                        <Statistic title="Total Logs" value={stats.total_logs || 0} />
                    </Card>
                </Col>
                <Col xs={12} sm={6} lg={4}>
                    <Card bodyStyle={{ padding: 16 }} loading={statsLoading}>
                        <Statistic title="Today" value={stats.today_count || 0} valueStyle={{ color: '#1890ff' }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6} lg={4}>
                    <Card bodyStyle={{ padding: 16 }} loading={statsLoading}>
                        <Statistic
                            title="Most Active Today"
                            value={stats.top_admin_today?.name || '—'}
                            suffix={stats.top_admin_today ? <Badge count={stats.top_admin_today.count} style={{ backgroundColor: '#52c41a' }} /> : null}
                            valueStyle={{ fontSize: 16 }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Filters */}
            <Card style={{ marginBottom: 16, borderRadius: 8 }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} sm={6}>
                        <Input
                            placeholder="Search description..."
                            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                            allowClear
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            onPressEnter={handleSearch}
                        />
                    </Col>
                    <Col xs={12} sm={4}>
                        <Select
                            placeholder="Action"
                            allowClear
                            style={{ width: '100%' }}
                            value={filters.action}
                            onChange={(v) => setFilters(prev => ({ ...prev, action: v }))}
                        >
                            {actionTypes.map(a => (
                                <Option key={a} value={a}>
                                    <Tag color={getActionColor(a)} style={{ marginRight: 4 }}>
                                        {a.replace(/_/g, ' ')}
                                    </Tag>
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={12} sm={4}>
                        <Select
                            placeholder="Admin"
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            style={{ width: '100%' }}
                            value={filters.user_id}
                            onChange={(v) => setFilters(prev => ({ ...prev, user_id: v }))}
                        >
                            {admins.map(a => (
                                <Option key={a.id} value={a.id}>{a.name}</Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={6}>
                        <RangePicker
                            style={{ width: '100%' }}
                            value={dateRange}
                            onChange={setDateRange}
                        />
                    </Col>
                    <Col xs={24} sm={4} style={{ textAlign: 'right' }}>
                        <Space>
                            <Button icon={<SearchOutlined />} onClick={handleSearch}>Search</Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>Reset</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* Table */}
            <Card style={{ borderRadius: 8 }}>
                <Table
                    columns={columns}
                    dataSource={logs}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showTotal: (total) => `${total} log entries`,
                    }}
                    onChange={(pag) => fetchLogs(pag.current)}
                    size="small"
                    scroll={{ x: 900 }}
                />
            </Card>

            {/* Detail Modal */}
            <Modal
                title={
                    <Space>
                        <ClockCircleOutlined />
                        <span>Audit Log Detail</span>
                        {detailModal.item && (
                            <Tag color={getActionColor(detailModal.item.action)}>
                                {detailModal.item.action_label}
                            </Tag>
                        )}
                    </Space>
                }
                open={detailModal.visible}
                onCancel={() => setDetailModal({ visible: false, item: null, loading: false })}
                footer={null}
                width={700}
            >
                {detailModal.item && (
                    <>
                        <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                            <Descriptions.Item label="Admin">
                                {detailModal.item.user?.name || 'System'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Timestamp">
                                {dayjs(detailModal.item.created_at).format('MMM D, YYYY h:mm:ss A')}
                            </Descriptions.Item>
                            <Descriptions.Item label="Target">
                                {detailModal.item.target_name || '—'}
                                {detailModal.item.target_type && (
                                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                                        ({detailModal.item.target_type.replace(/_/g, ' ')})
                                    </Text>
                                )}
                            </Descriptions.Item>
                            <Descriptions.Item label="IP Address">
                                {detailModal.item.ip_address || '—'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Description" span={2}>
                                {detailModal.item.description || '—'}
                            </Descriptions.Item>
                        </Descriptions>

                        <Title level={5} style={{ marginBottom: 12 }}>Changes</Title>
                        {renderDiff(detailModal.item.old_values, detailModal.item.new_values)}
                    </>
                )}
            </Modal>
        </div>
    );
};

export default AuditLog;
