import { useState, useEffect, useCallback } from 'react';
import {
    Card,
    Tabs,
    Table,
    Button,
    Space,
    Switch,
    Modal,
    Form,
    Input,
    InputNumber,
    message,
    Typography,
    Tag,
    Tooltip,
    Empty,
    Spin,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DatabaseOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
} from '@ant-design/icons';
import { dropdownApi } from '../../services/api';

const { Title, Text } = Typography;

// Per-tab configuration: human labels, column defs, form fields
const TAB_CONFIG = {
    genders: {
        label: 'Genders',
        singular: 'Gender',
        columns: [
            { key: 'name', title: 'Name', required: true },
            { key: 'code', title: 'Code', required: false, width: 120 },
        ],
    },
    civil_statuses: {
        label: 'Civil Statuses',
        singular: 'Civil Status',
        columns: [
            { key: 'name', title: 'Name', required: true },
        ],
    },
    educational_attainment: {
        label: 'Educational Attainment',
        singular: 'Educational Attainment',
        columns: [
            { key: 'level', title: 'Level', required: true },
        ],
    },
    announcement_types: {
        label: 'Announcement Types',
        singular: 'Announcement Type',
        columns: [
            { key: 'name', title: 'Name', required: true },
            { key: 'code', title: 'Code', required: false, width: 120 },
            { key: 'description', title: 'Description', required: false, inputType: 'textarea' },
        ],
    },
    application_types: {
        label: 'Application Types',
        singular: 'Application Type',
        columns: [
            { key: 'name', title: 'Name', required: true },
            { key: 'code', title: 'Code', required: false, width: 120 },
            { key: 'description', title: 'Description', required: false, inputType: 'textarea' },
            { key: 'processing_days', title: 'Processing Days', required: false, inputType: 'number' },
        ],
    },
    mobility_levels: {
        label: 'Mobility Levels',
        singular: 'Mobility Level',
        columns: [
            { key: 'level', title: 'Level', required: true },
            { key: 'description', title: 'Description', required: false, inputType: 'textarea' },
        ],
    },
};

const DataManagement = () => {
    const [activeTab, setActiveTab] = useState('genders');
    const [data, setData] = useState({});
    const [loading, setLoading] = useState({});
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
    const [editingRecord, setEditingRecord] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    // Load data for a specific tab
    const loadTab = useCallback(async (type) => {
        setLoading((prev) => ({ ...prev, [type]: true }));
        try {
            const res = await dropdownApi.getAll(type);
            setData((prev) => ({ ...prev, [type]: res.data.data }));
        } catch {
            message.error('Failed to load data');
        } finally {
            setLoading((prev) => ({ ...prev, [type]: false }));
        }
    }, []);

    // Load active tab on mount / tab change
    useEffect(() => {
        if (!data[activeTab]) {
            loadTab(activeTab);
        }
    }, [activeTab, loadTab]); // eslint-disable-line react-hooks/exhaustive-deps

    // Open create/edit modal
    const openModal = (mode, record = null) => {
        setModalMode(mode);
        setEditingRecord(record);
        if (mode === 'edit' && record) {
            form.setFieldsValue(record);
        } else {
            form.resetFields();
        }
        setModalOpen(true);
    };

    // Submit create/edit
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            if (modalMode === 'create') {
                await dropdownApi.create(activeTab, values);
                message.success('Option created');
            } else {
                await dropdownApi.update(activeTab, editingRecord.id, values);
                message.success('Option updated');
            }

            setModalOpen(false);
            form.resetFields();
            loadTab(activeTab);
        } catch (err) {
            if (err?.response?.data?.errors) {
                const errors = err.response.data.errors;
                const firstKey = Object.keys(errors)[0];
                message.error(errors[firstKey][0]);
            } else if (err?.errorFields) {
                // form validation error, ignore
            } else {
                message.error('Operation failed');
            }
        } finally {
            setSaving(false);
        }
    };

    // Toggle enabled
    const handleToggle = async (record) => {
        try {
            await dropdownApi.toggleEnabled(activeTab, record.id);
            message.success(record.is_enabled ? 'Option disabled' : 'Option enabled');
            loadTab(activeTab);
        } catch {
            message.error('Failed to toggle option');
        }
    };

    // Move item up/down in sort order
    const handleMove = async (record, direction) => {
        const items = data[activeTab] || [];
        const idx = items.findIndex((r) => r.id === record.id);
        if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === items.length - 1)) return;

        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        const newOrder = items.map((item, i) => {
            if (i === idx) return { id: item.id, sort_order: swapIdx };
            if (i === swapIdx) return { id: item.id, sort_order: idx };
            return { id: item.id, sort_order: i };
        });

        try {
            await dropdownApi.reorder(activeTab, newOrder);
            loadTab(activeTab);
        } catch {
            message.error('Failed to reorder');
        }
    };

    // Build columns for the active tab
    const buildColumns = (tabKey) => {
        const config = TAB_CONFIG[tabKey];
        if (!config) return [];

        const cols = [];

        // Sort order column
        cols.push({
            title: '#',
            dataIndex: 'sort_order',
            width: 60,
            align: 'center',
            render: (_, record, index) => (
                <Text type="secondary">{index + 1}</Text>
            ),
        });

        // Data columns
        config.columns.forEach((col) => {
            cols.push({
                title: col.title,
                dataIndex: col.key,
                width: col.width,
                ellipsis: col.inputType === 'textarea',
                render: (val) => val || <Text type="secondary">—</Text>,
            });
        });

        // Status column
        cols.push({
            title: 'Status',
            dataIndex: 'is_enabled',
            width: 100,
            align: 'center',
            render: (val) => (
                <Tag color={val ? 'green' : 'default'} bordered={false}>
                    {val ? 'Enabled' : 'Disabled'}
                </Tag>
            ),
        });

        // Actions column
        cols.push({
            title: 'Actions',
            key: 'actions',
            width: 200,
            align: 'center',
            render: (_, record, index) => (
                <Space size="small">
                    <Tooltip title="Move up">
                        <Button
                            size="small"
                            icon={<ArrowUpOutlined />}
                            disabled={index === 0}
                            onClick={() => handleMove(record, 'up')}
                        />
                    </Tooltip>
                    <Tooltip title="Move down">
                        <Button
                            size="small"
                            icon={<ArrowDownOutlined />}
                            disabled={index === (data[tabKey]?.length || 0) - 1}
                            onClick={() => handleMove(record, 'down')}
                        />
                    </Tooltip>
                    <Tooltip title="Edit">
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => openModal('edit', record)}
                        />
                    </Tooltip>
                    <Tooltip title={record.is_enabled ? 'Disable this option' : 'Enable this option'}>
                        <Switch
                            size="small"
                            checked={record.is_enabled}
                            onChange={() => handleToggle(record)}
                        />
                    </Tooltip>
                </Space>
            ),
        });

        return cols;
    };

    // Build form fields for the active tab
    const buildFormFields = (tabKey) => {
        const config = TAB_CONFIG[tabKey];
        if (!config) return null;

        return config.columns.map((col) => {
            if (col.inputType === 'number') {
                return (
                    <Form.Item
                        key={col.key}
                        name={col.key}
                        label={col.title}
                        rules={col.required ? [{ required: true, message: `${col.title} is required` }] : []}
                    >
                        <InputNumber min={1} style={{ width: '100%' }} placeholder={`Enter ${col.title.toLowerCase()}`} />
                    </Form.Item>
                );
            }
            if (col.inputType === 'textarea') {
                return (
                    <Form.Item
                        key={col.key}
                        name={col.key}
                        label={col.title}
                        rules={col.required ? [{ required: true, message: `${col.title} is required` }] : []}
                    >
                        <Input.TextArea rows={2} placeholder={`Enter ${col.title.toLowerCase()}`} />
                    </Form.Item>
                );
            }
            return (
                <Form.Item
                    key={col.key}
                    name={col.key}
                    label={col.title}
                    rules={col.required ? [{ required: true, message: `${col.title} is required` }] : []}
                >
                    <Input placeholder={`Enter ${col.title.toLowerCase()}`} />
                </Form.Item>
            );
        });
    };

    // Tab items
    const tabItems = Object.entries(TAB_CONFIG).map(([key, config]) => ({
        key,
        label: config.label,
        children: (
            <Spin spinning={loading[key] || false}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary">
                        {(data[key] || []).length} option{(data[key] || []).length !== 1 ? 's' : ''} configured
                    </Text>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => openModal('create')}
                    >
                        Add {config.singular}
                    </Button>
                </div>
                <Table
                    dataSource={data[key] || []}
                    columns={buildColumns(key)}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                    locale={{ emptyText: <Empty description={`No ${config.label.toLowerCase()} configured`} /> }}
                    rowClassName={(record) => !record.is_enabled ? 'disabled-row' : ''}
                />
            </Spin>
        ),
    }));

    const activeConfig = TAB_CONFIG[activeTab];

    return (
        <div style={{ padding: '0 4px' }}>
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}>
                    <DatabaseOutlined style={{ marginRight: 8 }} />
                    Data Management
                </Title>
                <Text type="secondary">
                    Manage dropdown options used across registration forms and other modules
                </Text>
            </div>

            <Card>
                <Tabs
                    activeKey={activeTab}
                    onChange={(key) => setActiveTab(key)}
                    items={tabItems}
                    type="card"
                />
            </Card>

            {/* Create / Edit Modal */}
            <Modal
                title={`${modalMode === 'create' ? 'Add' : 'Edit'} ${activeConfig?.singular || 'Option'}`}
                open={modalOpen}
                onCancel={() => { setModalOpen(false); form.resetFields(); }}
                onOk={handleSubmit}
                confirmLoading={saving}
                okText={modalMode === 'create' ? 'Create' : 'Save'}
                destroyOnClose
                width={480}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    {buildFormFields(activeTab)}
                </Form>
            </Modal>

            <style>{`
                .disabled-row {
                    opacity: 0.5;
                }
                .disabled-row td {
                    background: #fafafa !important;
                }
            `}</style>
        </div>
    );
};

export default DataManagement;
