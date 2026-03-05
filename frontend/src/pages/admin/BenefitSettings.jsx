import { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Button,
    Space,
    Tag,
    Modal,
    Form,
    Input,
    InputNumber,
    Switch,
    Select,
    message,
    Popconfirm,
    Typography,
    Row,
    Col,
    Tooltip,
    Alert,
    Divider,
    Radio,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    ReloadOutlined,
    GiftOutlined,
    CheckCircleOutlined,
    StopOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import { benefitTypesApi, registrationApi, districtApi, barangayManagementApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

function BenefitSettings() {
    const { user } = useAuth();
    const [benefitTypes, setBenefitTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedType, setSelectedType] = useState(null);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [barangays, setBarangays] = useState([]);
    const [branches, setBranches] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [targetScope, setTargetScope] = useState('all');
    const [scopeBarangayMode, setScopeBarangayMode] = useState('all');

    const isMainAdmin = user?.role_id === 1;

    useEffect(() => {
        loadBenefitTypes();
        loadBarangays();
        loadBranches();
        loadDistricts();
    }, []);

    const loadBenefitTypes = async () => {
        setLoading(true);
        try {
            const response = await benefitTypesApi.getAll();
            setBenefitTypes(response.data.data);
        } catch (error) {
            message.error('Failed to load benefit types');
        } finally {
            setLoading(false);
        }
    };

    const loadBarangays = async () => {
        try {
            const response = await barangayManagementApi.getList();
            setBarangays(response.data.data || []);
        } catch (error) {
            console.error('Failed to load barangays:', error);
        }
    };

    const loadBranches = async () => {
        try {
            const response = await registrationApi.getLookupOptions();
            setBranches(response.data.data?.branches || []);
        } catch (error) {
            console.error('Failed to load branches:', error);
        }
    };

    const loadDistricts = async () => {
        try {
            const response = await districtApi.getList();
            setDistricts(response.data.data || []);
        } catch (error) {
            console.error('Failed to load districts:', error);
        }
    };

    const openModal = (mode, record = null) => {
        setModalMode(mode);
        setSelectedType(record);
        if (record) {
            const formValues = {
                ...record,
                barangay_ids: record.barangay_ids || [],
                district_id: record.district_id || undefined,
            };
            form.setFieldsValue(formValues);
            setTargetScope(record.target_scope || 'all');
            // Determine if specific barangays were selected for district/branch scope
            const hasSpecificBarangays = (record.target_scope === 'district' || record.target_scope === 'branch')
                && record.barangay_ids && record.barangay_ids.length > 0;
            setScopeBarangayMode(hasSpecificBarangays ? 'specific' : 'all');
        } else {
            form.resetFields();
            form.setFieldsValue({
                is_one_time: false,
                target_scope: isMainAdmin ? 'all' : 'branch',
            });
            setTargetScope(isMainAdmin ? 'all' : 'branch');
            setScopeBarangayMode('all');
        }
        setModalVisible(true);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            // Clear barangay_ids if scope is district/branch with 'all' barangay mode
            if ((values.target_scope === 'district' || values.target_scope === 'branch') && scopeBarangayMode === 'all') {
                values.barangay_ids = [];
            }

            if (modalMode === 'create') {
                await benefitTypesApi.create(values);
                message.success('Benefit type created successfully');
            } else {
                await benefitTypesApi.update(selectedType.id, values);
                message.success('Benefit type updated successfully');
            }

            setModalVisible(false);
            loadBenefitTypes();
        } catch (error) {
            message.error(error.response?.data?.error || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggle = async (record) => {
        try {
            await benefitTypesApi.toggle(record.id);
            message.success(record.is_active ? 'Benefit type deactivated' : 'Benefit type activated');
            loadBenefitTypes();
        } catch (error) {
            message.error('Failed to toggle status');
        }
    };

    const handleDelete = async (id) => {
        try {
            await benefitTypesApi.delete(id);
            message.success('Benefit type deleted successfully');
            loadBenefitTypes();
        } catch (error) {
            message.error(error.response?.data?.error || 'Failed to delete');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(amount);
    };

    const columns = [
        {
            title: 'Benefit',
            dataIndex: 'name',
            key: 'name',
            render: (name, record) => (
                <Space>
                    <GiftOutlined style={{ color: '#1890ff' }} />
                    <span>{name}</span>
                </Space>
            ),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
            render: (desc) => desc || <Text type="secondary">—</Text>,
        },
        {
            title: 'Age Range',
            key: 'age',
            render: (_, record) => (
                <Tag color="blue">
                    {record.min_age}
                    {record.max_age ? ` - ${record.max_age}` : '+'}
                </Tag>
            ),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount) => (
                <Text strong style={{ color: '#52c41a' }}>
                    {formatCurrency(amount)}
                </Text>
            ),
        },
        {
            title: 'Frequency',
            key: 'frequency',
            render: (_, record) => (
                <Tag color={record.is_one_time ? 'purple' : 'cyan'}>
                    {record.frequency_description || (record.is_one_time ? 'One-time' : 'No limit')}
                </Tag>
            ),
        },
        {
            title: 'Target',
            key: 'target',
            render: (_, record) => {
                if (record.target_scope === 'all') {
                    return <Tag color="green">All Barangays</Tag>;
                }
                if (record.target_scope === 'branch') {
                    return <Tag color="blue">{record.branch?.name || 'Field Office'}</Tag>;
                }
                if (record.target_scope === 'district') {
                    return <Tag color="geekblue">{record.district?.name || 'District'}</Tag>;
                }
                return (
                    <Tooltip title={record.barangays?.map(b => b.name).join(', ')}>
                        <Tag color="orange">{record.barangays?.length || 0} Barangays</Tag>
                    </Tooltip>
                );
            },
        },
        {
            title: 'Eligibility',
            key: 'eligibility',
            render: (_, record) => {
                const sectors = record.required_sectors || [];
                const subCats = record.required_sub_categories || [];
                if (sectors.length === 0 && subCats.length === 0) {
                    return <Text type="secondary">All seniors</Text>;
                }
                const mode = record.association_mode === 'all' ? 'ALL of' : 'ANY of';
                const items = [...sectors, ...subCats];
                return (
                    <Tooltip title={`Must match ${mode}: ${items.join(', ')}`}>
                        <Space size={2} wrap>
                            <TeamOutlined style={{ color: '#722ed1' }} />
                            <Text style={{ fontSize: 12 }}>{mode}:</Text>
                            {items.slice(0, 2).map(item => (
                                <Tag key={item} color="purple" style={{ fontSize: 11 }}>{item}</Tag>
                            ))}
                            {items.length > 2 && <Tag>+{items.length - 2}</Tag>}
                        </Space>
                    </Tooltip>
                );
            },
        },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (isActive) => (
                <Tag color={isActive ? 'green' : 'red'} icon={isActive ? <CheckCircleOutlined /> : <StopOutlined />}>
                    {isActive ? 'Active' : 'Inactive'}
                </Tag>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Edit">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openModal('edit', record)}
                        />
                    </Tooltip>
                    <Tooltip title={record.is_active ? 'Deactivate' : 'Activate'}>
                        <Button
                            type="text"
                            icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                            onClick={() => handleToggle(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete this benefit type?"
                        description="This cannot be undone. Benefit types with existing claims cannot be deleted."
                        onConfirm={() => handleDelete(record.id)}
                        okText="Delete"
                        cancelText="Cancel"
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];



    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                    <Col>
                        <Title level={4} style={{ margin: 0 }}>Benefits Configuration</Title>
                        <Text type="secondary">Configure benefits available for senior citizens</Text>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<ReloadOutlined />} onClick={loadBenefitTypes}>
                                Refresh
                            </Button>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => openModal('create')}
                            >
                                Add New Benefit
                            </Button>
                        </Space>
                    </Col>
                </Row>

                <Alert
                    message="Benefit Eligibility"
                    description="Seniors are automatically eligible for benefits based on their age, barangay, and association (target sectors / sub-categories). Configure eligibility criteria for each benefit type."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <Table
                    dataSource={benefitTypes}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                />
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                title={modalMode === 'create' ? 'Add New Benefit' : 'Edit Benefit'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={handleSubmit}
                confirmLoading={submitting}
                width={700}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="name"
                        label="Benefit Name"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <Input placeholder="e.g., Centenarian Cash Gift" />
                    </Form.Item>

                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={2} placeholder="Brief description of the benefit" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="min_age"
                                label="Minimum Age"
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <InputNumber
                                    min={60}
                                    max={120}
                                    style={{ width: '100%' }}
                                    placeholder="60"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="max_age"
                                label="Maximum Age (optional)"
                                help="Leave empty for no maximum"
                            >
                                <InputNumber
                                    min={60}
                                    max={150}
                                    style={{ width: '100%' }}
                                    placeholder="Optional"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="amount"
                        label="Amount (PHP)"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <InputNumber
                            min={0}
                            step={100}
                            style={{ width: '100%' }}
                            formatter={value => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/₱\s?|(,*)/g, '')}
                        />
                    </Form.Item>

                    <Divider orientation="left">Frequency Settings</Divider>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="is_one_time"
                                label="One-time Benefit"
                                valuePropName="checked"
                                help="If enabled, seniors can only claim once"
                            >
                                <Switch />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="claim_interval_days"
                                label="Claim Frequency (days)"
                                help="Leave empty for no limit. E.g., 30=monthly, 90=quarterly, 365=yearly"
                            >
                                <InputNumber
                                    min={1}
                                    max={3650}
                                    style={{ width: '100%' }}
                                    placeholder="e.g., 30 for monthly"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left">Target Barangays</Divider>

                    <Form.Item
                        name="target_scope"
                        label="Scope"
                        help="Which barangays can access this benefit"
                    >
                        <Select
                            onChange={(val) => {
                                setTargetScope(val);
                                setScopeBarangayMode('all');
                                form.setFieldsValue({ barangay_ids: [], branch_id: undefined, district_id: undefined });
                            }}
                            disabled={!isMainAdmin}
                        >
                            {isMainAdmin && <Option value="all">All Barangays</Option>}
                            <Option value="branch">Specific Field Office</Option>
                            {isMainAdmin && <Option value="district">By District</Option>}
                            <Option value="barangays">Specific Barangays</Option>
                        </Select>
                    </Form.Item>

                    {targetScope === 'branch' && (
                        <>
                            <Form.Item
                                name="branch_id"
                                label="Field Office"
                                rules={[{ required: targetScope === 'branch', message: 'Required' }]}
                            >
                                <Select
                                    placeholder="Select field office"
                                    showSearch
                                    optionFilterProp="children"
                                    onChange={() => {
                                        setScopeBarangayMode('all');
                                        form.setFieldsValue({ barangay_ids: [] });
                                    }}
                                >
                                    {branches.map(b => (
                                        <Option key={b.id} value={b.id}>{b.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item label="Barangay Coverage">
                                <Select
                                    value={scopeBarangayMode}
                                    onChange={(val) => {
                                        setScopeBarangayMode(val);
                                        if (val === 'all') form.setFieldsValue({ barangay_ids: [] });
                                    }}
                                >
                                    <Option value="all">
                                        All barangays under {branches.find(b => b.id === form.getFieldValue('branch_id'))?.name || 'selected Field Office'}
                                    </Option>
                                    <Option value="specific">Specific barangays only</Option>
                                </Select>
                            </Form.Item>

                            {scopeBarangayMode === 'specific' && (
                                <Form.Item
                                    name="barangay_ids"
                                    label="Select Barangays"
                                    rules={[{ required: true, message: 'Select at least one barangay' }]}
                                >
                                    <Select
                                        mode="multiple"
                                        placeholder="Select barangays"
                                        showSearch
                                        optionFilterProp="children"
                                        style={{ width: '100%' }}
                                    >
                                        {barangays
                                            .filter(b => b.branch_id === form.getFieldValue('branch_id'))
                                            .map(b => (
                                                <Option key={b.id} value={b.id}>{b.name}</Option>
                                            ))}
                                    </Select>
                                </Form.Item>
                            )}
                        </>
                    )}

                    {targetScope === 'district' && (
                        <>
                            <Form.Item
                                name="district_id"
                                label="District"
                                rules={[{ required: targetScope === 'district', message: 'Select a district' }]}
                            >
                                <Select
                                    placeholder="Select district"
                                    showSearch
                                    optionFilterProp="children"
                                    onChange={() => {
                                        setScopeBarangayMode('all');
                                        form.setFieldsValue({ barangay_ids: [] });
                                    }}
                                >
                                    {districts.map(d => (
                                        <Option key={d.id} value={d.id}>{d.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item label="Barangay Coverage">
                                <Select
                                    value={scopeBarangayMode}
                                    onChange={(val) => {
                                        setScopeBarangayMode(val);
                                        if (val === 'all') form.setFieldsValue({ barangay_ids: [] });
                                    }}
                                >
                                    <Option value="all">
                                        All barangays under {districts.find(d => d.id === form.getFieldValue('district_id'))?.name || 'selected District'}
                                    </Option>
                                    <Option value="specific">Specific barangays only</Option>
                                </Select>
                            </Form.Item>

                            {scopeBarangayMode === 'specific' && (
                                <Form.Item
                                    name="barangay_ids"
                                    label="Select Barangays"
                                    rules={[{ required: true, message: 'Select at least one barangay' }]}
                                >
                                    <Select
                                        mode="multiple"
                                        placeholder="Select barangays"
                                        showSearch
                                        optionFilterProp="children"
                                        style={{ width: '100%' }}
                                    >
                                        {barangays
                                            .filter(b => {
                                                const selectedDistrict = districts.find(d => d.id === form.getFieldValue('district_id'));
                                                return selectedDistrict && b.district === selectedDistrict.name;
                                            })
                                            .map(b => (
                                                <Option key={b.id} value={b.id}>{b.name}</Option>
                                            ))}
                                    </Select>
                                </Form.Item>
                            )}
                        </>
                    )}

                    {targetScope === 'barangays' && (
                        <Form.Item
                            name="barangay_ids"
                            label="Barangays"
                            rules={[{ required: targetScope === 'barangays', message: 'Select at least one barangay' }]}
                        >
                            <Select
                                mode="multiple"
                                placeholder="Select barangays"
                                showSearch
                                optionFilterProp="children"
                                style={{ width: '100%' }}
                            >
                                {barangays.map(b => (
                                    <Option key={b.id} value={b.id}>{b.name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}

                    <Divider orientation="left">Association Eligibility</Divider>

                    <Alert
                        message="Optional: Restrict this benefit to seniors with specific associations"
                        description="Leave both fields empty to allow all seniors. If filled, only seniors matching the selected sectors/sub-categories will be eligible."
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />

                    <Form.Item
                        name="required_sectors"
                        label="Required Target Sectors"
                    >
                        <Select
                            mode="multiple"
                            placeholder="Leave empty for no restriction"
                            allowClear
                            style={{ width: '100%' }}
                        >
                            <Option value="PNGNA">PNGNA</Option>
                            <Option value="WEPC">WEPC</Option>
                            <Option value="PWD">PWD</Option>
                            <Option value="YNSP">YNSP</Option>
                            <Option value="PASP">PASP</Option>
                            <Option value="KIA/WIA">KIA/WIA</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="required_sub_categories"
                        label="Required Sub-Categories"
                    >
                        <Select
                            mode="multiple"
                            placeholder="Leave empty for no restriction"
                            allowClear
                            style={{ width: '100%' }}
                        >
                            <Option value="Solo Parents">Solo Parents</Option>
                            <Option value="Indigenous Person (IP)">Indigenous Person (IP)</Option>
                            <Option value="Recovering Person who used drugs">Recovering Person who used drugs</Option>
                            <Option value="4P's DSWD Beneficiaries">4P's (DSWD Beneficiaries)</Option>
                            <Option value="Street Dwellers">Street Dwellers</Option>
                            <Option value="Psychosocial/Mental/Learning Disability">Psychosocial/Mental/Learning Disability</Option>
                            <Option value="Stateless Person/Asylum">Stateless Person/Asylum</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="association_mode"
                        label="Matching Mode"
                        help="'Must match ALL' = senior must belong to every selected item. 'Must match ANY' = senior only needs at least one."
                        initialValue="any"
                    >
                        <Radio.Group>
                            <Radio.Button value="any">Must match ANY (at least one)</Radio.Button>
                            <Radio.Button value="all">Must match ALL</Radio.Button>
                        </Radio.Group>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

export default BenefitSettings;
