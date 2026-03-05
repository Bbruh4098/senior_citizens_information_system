import { useState, useEffect } from 'react';
import {
    Card,
    Tabs,
    Table,
    Button,
    Space,
    Tag,
    Input,
    Select,
    Modal,
    Form,
    message,
    Popconfirm,
    Typography,
    Row,
    Col,
    Badge,
    Tooltip,
    Divider,
    Transfer,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    SearchOutlined,
    ReloadOutlined,
    BranchesOutlined,
    EnvironmentOutlined,
    SwapOutlined,
    GlobalOutlined,
    RightOutlined,
    DownOutlined,
} from '@ant-design/icons';
import { branchApi, barangayManagementApi, districtApi } from '../../services/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

function BranchManagement() {
    // Field Office state
    const [branches, setBranches] = useState([]);
    const [branchLoading, setBranchLoading] = useState(false);
    const [branchModalVisible, setBranchModalVisible] = useState(false);
    const [branchModalMode, setBranchModalMode] = useState('create');
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [branchForm] = Form.useForm();

    // Barangay state
    const [barangays, setBarangays] = useState([]);
    const [allBarangays, setAllBarangays] = useState([]);
    const [barangayLoading, setBarangayLoading] = useState(false);
    const [barangayFilters, setBarangayFilters] = useState({ search: '', branch_id: null, district: null });
    const [barangayModalVisible, setBarangayModalVisible] = useState(false);
    const [barangayModalMode, setBarangayModalMode] = useState('create');
    const [selectedBarangay, setSelectedBarangay] = useState(null);
    const [barangayForm] = Form.useForm();

    // Assignment state
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [assignTargetBranch, setAssignTargetBranch] = useState(null);
    const [selectedBarangayIds, setSelectedBarangayIds] = useState([]);

    // District state
    const [districts, setDistricts] = useState([]);
    const [districtLoading, setDistrictLoading] = useState(false);
    const [districtModalVisible, setDistrictModalVisible] = useState(false);
    const [districtModalMode, setDistrictModalMode] = useState('create');
    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [districtForm] = Form.useForm();

    // District assignment state
    const [districtAssignModalVisible, setDistrictAssignModalVisible] = useState(false);
    const [districtAssignTarget, setDistrictAssignTarget] = useState(null);
    const [selectedDistrictBarangayIds, setSelectedDistrictBarangayIds] = useState([]);
    const [districtSearch, setDistrictSearch] = useState('');

    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadBranches();
        loadAllBarangays();
        loadBarangays();
        loadDistricts();
    }, []);

    // ==========================================
    // FIELD OFFICE OPERATIONS
    // ==========================================
    const loadBranches = async () => {
        setBranchLoading(true);
        try {
            const response = await branchApi.getList();
            setBranches(response.data.data);
        } catch (error) {
            message.error('Failed to load Field Offices');
        } finally {
            setBranchLoading(false);
        }
    };

    const openBranchModal = (mode, record = null) => {
        setBranchModalMode(mode);
        setSelectedBranch(record);
        if (record) {
            branchForm.setFieldsValue(record);
        } else {
            branchForm.resetFields();
        }
        setBranchModalVisible(true);
    };

    const handleBranchSubmit = async () => {
        try {
            const values = await branchForm.validateFields();
            setSubmitting(true);

            if (branchModalMode === 'create') {
                await branchApi.create(values);
                message.success('Field Office created successfully');
            } else {
                await branchApi.update(selectedBranch.id, values);
                message.success('Field Office updated successfully');
            }

            setBranchModalVisible(false);
            loadBranches();
        } catch (error) {
            message.error(error.response?.data?.error || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleBranchDelete = async (id) => {
        try {
            await branchApi.delete(id);
            message.success('Field Office deleted successfully');
            loadBranches();
        } catch (error) {
            message.error(error.response?.data?.error || 'Failed to delete');
        }
    };

    // ==========================================
    // BARANGAY OPERATIONS
    // ==========================================
    const loadAllBarangays = async () => {
        try {
            const response = await barangayManagementApi.getList();
            setAllBarangays(response.data.data);
        } catch (error) {
            console.error('Failed to load all barangays');
        }
    };

    const loadBarangays = async () => {
        setBarangayLoading(true);
        try {
            const params = { ...barangayFilters };
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });
            const response = await barangayManagementApi.getList(params);
            setBarangays(response.data.data);
            // Also refresh allBarangays when no filters are active
            if (!params.search && !params.branch_id) {
                setAllBarangays(response.data.data);
            }
        } catch (error) {
            message.error('Failed to load barangays');
        } finally {
            setBarangayLoading(false);
        }
    };

    const openBarangayModal = (mode, record = null) => {
        setBarangayModalMode(mode);
        setSelectedBarangay(record);
        if (record) {
            barangayForm.setFieldsValue(record);
        } else {
            barangayForm.resetFields();
        }
        setBarangayModalVisible(true);
    };

    const handleBarangaySubmit = async () => {
        try {
            const values = await barangayForm.validateFields();
            setSubmitting(true);

            if (barangayModalMode === 'create') {
                await barangayManagementApi.create(values);
                message.success('Barangay created successfully');
            } else {
                await barangayManagementApi.update(selectedBarangay.id, values);
                message.success('Barangay updated successfully');
            }

            setBarangayModalVisible(false);
            loadBarangays();
        } catch (error) {
            message.error(error.response?.data?.error || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleBarangayDelete = async (id) => {
        try {
            await barangayManagementApi.delete(id);
            message.success('Barangay deleted successfully');
            loadBarangays();
        } catch (error) {
            message.error(error.response?.data?.error || 'Failed to delete');
        }
    };

    const handleQuickAssign = async (barangayId, branchId) => {
        try {
            await barangayManagementApi.assign(barangayId, branchId);
            message.success('Assignment updated');
            loadBarangays();
            loadBranches(); // Update counts
        } catch (error) {
            message.error('Failed to assign');
        }
    };

    const handleUnassign = async (barangayId) => {
        try {
            await barangayManagementApi.unassign(barangayId);
            message.success('Barangay unassigned');
            loadBarangays();
            loadBranches();
        } catch (error) {
            message.error('Failed to unassign');
        }
    };

    // ==========================================
    // BULK ASSIGNMENT
    // ==========================================
    const openAssignModal = (branch) => {
        setAssignTargetBranch(branch);
        const currentIds = allBarangays
            .filter(b => b.branch_id === branch.id)
            .map(b => b.id);
        setSelectedBarangayIds(currentIds);
        setAssignModalVisible(true);
    };

    const handleBulkAssign = async () => {
        try {
            setSubmitting(true);
            await barangayManagementApi.bulkAssign(assignTargetBranch.id, selectedBarangayIds);
            message.success('Barangays assigned successfully');
            setAssignModalVisible(false);
            loadBarangays();
            loadBranches();
        } catch (error) {
            message.error('Failed to assign barangays');
        } finally {
            setSubmitting(false);
        }
    };

    // ==========================================
    // DISTRICT BULK ASSIGNMENT
    // ==========================================
    const openDistrictAssignModal = (district) => {
        setDistrictAssignTarget(district);
        const currentIds = allBarangays
            .filter(b => b.district === district.name)
            .map(b => b.id);
        setSelectedDistrictBarangayIds(currentIds);
        setDistrictAssignModalVisible(true);
    };

    const handleDistrictBulkAssign = async () => {
        try {
            setSubmitting(true);
            await districtApi.assignBarangays(districtAssignTarget.id, selectedDistrictBarangayIds);
            message.success('Barangays assigned to district successfully');
            setDistrictAssignModalVisible(false);
            loadAllBarangays();
            loadBarangays();
            loadDistricts();
        } catch (error) {
            message.error('Failed to assign barangays to district');
        } finally {
            setSubmitting(false);
        }
    };

    // ==========================================
    // DISTRICT OPERATIONS
    // ==========================================
    const loadDistricts = async () => {
        setDistrictLoading(true);
        try {
            const response = await districtApi.getList();
            setDistricts(response.data.data);
        } catch (error) {
            message.error('Failed to load districts');
        } finally {
            setDistrictLoading(false);
        }
    };

    const openDistrictModal = (mode, record = null) => {
        setDistrictModalMode(mode);
        setSelectedDistrict(record);
        if (record) {
            districtForm.setFieldsValue(record);
        } else {
            districtForm.resetFields();
        }
        setDistrictModalVisible(true);
    };

    const handleDistrictSubmit = async () => {
        try {
            const values = await districtForm.validateFields();
            setSubmitting(true);

            if (districtModalMode === 'create') {
                await districtApi.create(values);
                message.success('District created successfully');
            } else {
                await districtApi.update(selectedDistrict.id, values);
                message.success('District updated successfully');
            }

            setDistrictModalVisible(false);
            loadDistricts();
            loadBarangays(); // Refresh in case names changed
        } catch (error) {
            message.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDistrictDelete = async (id) => {
        try {
            await districtApi.delete(id);
            message.success('District deleted successfully');
            loadDistricts();
            loadBarangays(); // Refresh district assignments
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to delete');
        }
    };

    // ==========================================
    // TABLE COLUMNS
    // ==========================================
    const branchColumns = [
        {
            title: 'Code',
            dataIndex: 'code',
            key: 'code',
            width: 120,
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (name, record) => (
                <Space>
                    <BranchesOutlined />
                    <span>{name}</span>
                    {record.id === 1 && <Tag color="gold">Main Office</Tag>}
                </Space>
            ),
        },
        {
            title: 'Address',
            dataIndex: 'address',
            key: 'address',
            ellipsis: true,
        },
        {
            title: 'Contact',
            dataIndex: 'contact_number',
            key: 'contact_number',
        },
        {
            title: 'Barangays',
            dataIndex: 'barangays_count',
            key: 'barangays_count',
            render: (count, record) => (
                record.id > 1 ? (
                    <Badge count={count || 0} showZero style={{ backgroundColor: count ? '#52c41a' : '#d9d9d9' }} />
                ) : '-'
            ),
        },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (isActive) => (
                <Tag color={isActive ? 'success' : 'error'}>
                    {isActive ? 'Active' : 'Inactive'}
                </Tag>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 180,
            render: (_, record) => (
                record.id > 1 ? (
                    <Space size="small">
                        <Tooltip title="Edit">
                            <Button
                                type="text"
                                icon={<EditOutlined />}
                                onClick={() => openBranchModal('edit', record)}
                            />
                        </Tooltip>
                        <Tooltip title="Manage Barangays">
                            <Button
                                type="text"
                                icon={<SwapOutlined />}
                                onClick={() => openAssignModal(record)}
                            />
                        </Tooltip>
                        <Tooltip title="Delete">
                            <Popconfirm
                                title="Delete this Field Office?"
                                description="Must have no assigned barangays"
                                onConfirm={() => handleBranchDelete(record.id)}
                                okText="Delete"
                                okButtonProps={{ danger: true }}
                            >
                                <Button type="text" icon={<DeleteOutlined />} danger />
                            </Popconfirm>
                        </Tooltip>
                    </Space>
                ) : <Text type="secondary">-</Text>
            ),
        },
    ];

    const barangayColumns = [
        {
            title: 'Code',
            dataIndex: 'code',
            key: 'code',
            width: 100,
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (name) => (
                <Space>
                    <EnvironmentOutlined />
                    <span>{name}</span>
                </Space>
            ),
        },
        {
            title: 'District',
            dataIndex: 'district',
            key: 'district',
        },
        {
            title: 'Assigned To',
            key: 'branch',
            render: (_, record) => (
                record.branch_name ? (
                    <Tag color="blue">{record.branch_name}</Tag>
                ) : (
                    <Tag color="warning">Unassigned</Tag>
                )
            ),
        },
        {
            title: 'Quick Assign',
            key: 'assign',
            width: 200,
            render: (_, record) => (
                <Select
                    placeholder="Assign to..."
                    size="small"
                    style={{ width: 150 }}
                    value={record.branch_id}
                    onChange={(value) => handleQuickAssign(record.id, value)}
                    allowClear
                    onClear={() => handleUnassign(record.id)}
                >
                    {branches.filter(b => b.id > 1).map(branch => (
                        <Option key={branch.id} value={branch.id}>{branch.name}</Option>
                    ))}
                </Select>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Edit">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openBarangayModal('edit', record)}
                        />
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Popconfirm
                            title="Delete this barangay?"
                            description="Cannot delete if has registered seniors"
                            onConfirm={() => handleBarangayDelete(record.id)}
                            okText="Delete"
                            okButtonProps={{ danger: true }}
                        >
                            <Button type="text" icon={<DeleteOutlined />} danger />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    const districtColumns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (name) => (
                <Space>
                    <GlobalOutlined />
                    <span>{name}</span>
                </Space>
            ),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            render: (desc) => desc || <Text type="secondary">—</Text>,
        },
        {
            title: 'Barangays',
            dataIndex: 'barangays_count',
            key: 'barangays_count',
            width: 120,
            render: (count) => (
                <Badge count={count || 0} showZero style={{ backgroundColor: count ? '#52c41a' : '#d9d9d9' }} />
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 180,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Edit">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openDistrictModal('edit', record)}
                        />
                    </Tooltip>
                    <Tooltip title="Manage Barangays">
                        <Button
                            type="text"
                            icon={<SwapOutlined />}
                            onClick={() => openDistrictAssignModal(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Popconfirm
                            title="Delete this district?"
                            description="Barangays in this district will have their district cleared"
                            onConfirm={() => handleDistrictDelete(record.id)}
                            okText="Delete"
                            okButtonProps={{ danger: true }}
                        >
                            <Button type="text" icon={<DeleteOutlined />} danger />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <Title level={4} style={{ marginBottom: 24 }}>Field Office & Barangay Management</Title>

                <Tabs defaultActiveKey="branches">
                    <TabPane tab={<span><BranchesOutlined /> Field Offices</span>} key="branches">
                        <Row justify="end" style={{ marginBottom: 16 }}>
                            <Space>
                                <Button icon={<ReloadOutlined />} onClick={loadBranches}>
                                    Refresh
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => openBranchModal('create')}
                                >
                                    Add Field Office
                                </Button>
                            </Space>
                        </Row>
                        <Table
                            columns={branchColumns}
                            dataSource={branches}
                            rowKey="id"
                            loading={branchLoading}
                            pagination={false}
                        />
                    </TabPane>

                    <TabPane tab={<span><EnvironmentOutlined /> Barangays</span>} key="barangays">
                        <Row gutter={16} style={{ marginBottom: 16 }}>
                            <Col span={6}>
                                <Input
                                    placeholder="Search barangay name..."
                                    prefix={<SearchOutlined />}
                                    value={barangayFilters.search}
                                    onChange={(e) => setBarangayFilters(prev => ({ ...prev, search: e.target.value }))}
                                    onPressEnter={loadBarangays}
                                />
                            </Col>
                            <Col span={5}>
                                <Select
                                    placeholder="Filter by District"
                                    allowClear
                                    style={{ width: '100%' }}
                                    value={barangayFilters.district}
                                    onChange={(value) => setBarangayFilters(prev => ({ ...prev, district: value }))}
                                >
                                    <Option value="unassigned">No District</Option>
                                    {districts.map(d => (
                                        <Option key={d.id} value={d.name}>{d.name}</Option>
                                    ))}
                                </Select>
                            </Col>
                            <Col span={5}>
                                <Select
                                    placeholder="Filter by Field Office"
                                    allowClear
                                    style={{ width: '100%' }}
                                    value={barangayFilters.branch_id}
                                    onChange={(value) => setBarangayFilters(prev => ({ ...prev, branch_id: value }))}
                                >
                                    <Option value="unassigned">Unassigned</Option>
                                    {branches.filter(b => b.id > 1).map(branch => (
                                        <Option key={branch.id} value={branch.id}>{branch.name}</Option>
                                    ))}
                                </Select>
                            </Col>
                            <Col>
                                <Space>
                                    <Button icon={<SearchOutlined />} onClick={loadBarangays}>Search</Button>
                                    <Button icon={<ReloadOutlined />} onClick={() => {
                                        setBarangayFilters({ search: '', branch_id: null, district: null });
                                        loadBarangays();
                                    }}>Reset</Button>
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => openBarangayModal('create')}
                                    >
                                        Add Barangay
                                    </Button>
                                </Space>
                            </Col>
                        </Row>
                        <Table
                            columns={barangayColumns}
                            dataSource={barangays}
                            rowKey="id"
                            loading={barangayLoading}
                            pagination={{ pageSize: 20 }}
                            size="small"
                        />
                    </TabPane>

                    <TabPane tab={<span><GlobalOutlined /> Districts</span>} key="districts">
                        <Row gutter={16} style={{ marginBottom: 16 }}>
                            <Col span={6}>
                                <Input
                                    placeholder="Search barangay name..."
                                    prefix={<SearchOutlined />}
                                    value={districtSearch}
                                    onChange={(e) => setDistrictSearch(e.target.value)}
                                    allowClear
                                />
                            </Col>
                            <Col flex="auto" style={{ textAlign: 'right' }}>
                                <Space>
                                    <Button icon={<ReloadOutlined />} onClick={() => { loadDistricts(); loadAllBarangays(); }}>
                                        Refresh
                                    </Button>
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => openDistrictModal('create')}
                                    >
                                        Add District
                                    </Button>
                                </Space>
                            </Col>
                        </Row>
                        <Table
                            columns={districtColumns}
                            dataSource={districtSearch
                                ? districts.filter(d =>
                                    allBarangays.some(b =>
                                        b.district === d.name &&
                                        b.name.toLowerCase().includes(districtSearch.toLowerCase())
                                    )
                                )
                                : districts
                            }
                            rowKey="id"
                            loading={districtLoading}
                            pagination={false}
                            expandable={{
                                expandedRowRender: (record) => {
                                    const districtBarangays = allBarangays.filter(b => b.district === record.name);
                                    const searchLower = districtSearch?.toLowerCase() || '';
                                    return (
                                        <div style={{ padding: '8px 0' }}>
                                            <Text strong style={{ marginBottom: 8, display: 'block' }}>
                                                Barangays under {record.name}:
                                            </Text>
                                            {districtBarangays.length > 0 ? (
                                                <Space size={[4, 8]} wrap>
                                                    {districtBarangays.map(b => {
                                                        const isMatch = searchLower && b.name.toLowerCase().includes(searchLower);
                                                        return (
                                                            <Tag
                                                                key={b.id}
                                                                color={isMatch ? 'gold' : 'blue'}
                                                                icon={<EnvironmentOutlined />}
                                                                style={isMatch ? { fontWeight: 'bold', borderWidth: 2 } : {}}
                                                            >
                                                                {b.name}
                                                            </Tag>
                                                        );
                                                    })}
                                                </Space>
                                            ) : (
                                                <Text type="secondary">No barangays assigned to this district</Text>
                                            )}
                                        </div>
                                    );
                                },
                                rowExpandable: () => true,
                                defaultExpandAllRows: false,
                                expandedRowKeys: districtSearch
                                    ? districts
                                        .filter(d => allBarangays.some(b =>
                                            b.district === d.name &&
                                            b.name.toLowerCase().includes(districtSearch.toLowerCase())
                                        ))
                                        .map(d => d.id)
                                    : undefined,
                                expandIcon: ({ expanded, onExpand, record }) =>
                                    expanded ? (
                                        <DownOutlined style={{ cursor: 'pointer', fontSize: 12 }} onClick={e => onExpand(record, e)} />
                                    ) : (
                                        <RightOutlined style={{ cursor: 'pointer', fontSize: 12 }} onClick={e => onExpand(record, e)} />
                                    ),
                            }}
                        />
                    </TabPane>
                </Tabs>
            </Card>

            {/* Field Office Modal */}
            <Modal
                title={branchModalMode === 'create' ? 'Add Field Office' : 'Edit Field Office'}
                open={branchModalVisible}
                onCancel={() => setBranchModalVisible(false)}
                onOk={handleBranchSubmit}
                confirmLoading={submitting}
            >
                <Form form={branchForm} layout="vertical">
                    <Form.Item
                        name="code"
                        label="Code"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <Input placeholder="e.g., OSCA-FO8" />
                    </Form.Item>
                    <Form.Item
                        name="name"
                        label="Name"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <Input placeholder="e.g., Field Office 8" />
                    </Form.Item>
                    <Form.Item name="address" label="Address">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="contact_number" label="Contact Number">
                        <Input />
                    </Form.Item>
                    <Form.Item name="email" label="Email">
                        <Input type="email" />
                    </Form.Item>
                    <Form.Item name="branch_head" label="Field Office Head">
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Barangay Modal */}
            <Modal
                title={barangayModalMode === 'create' ? 'Add Barangay' : 'Edit Barangay'}
                open={barangayModalVisible}
                onCancel={() => setBarangayModalVisible(false)}
                onOk={handleBarangaySubmit}
                confirmLoading={submitting}
            >
                <Form form={barangayForm} layout="vertical">
                    <Form.Item
                        name="code"
                        label="Code"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <Input placeholder="e.g., ZC-099" />
                    </Form.Item>
                    <Form.Item
                        name="name"
                        label="Name"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <Input placeholder="Barangay name" />
                    </Form.Item>
                    <Form.Item name="district" label="District">
                        <Select allowClear placeholder="Select District">
                            {districts.map(d => (
                                <Option key={d.id} value={d.name}>{d.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    {barangayModalMode === 'create' && (
                        <Form.Item name="branch_id" label="Assign to Field Office">
                            <Select allowClear placeholder="Select Field Office (optional)">
                                {branches.filter(b => b.id > 1).map(branch => (
                                    <Option key={branch.id} value={branch.id}>{branch.name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
                </Form>
            </Modal>

            {/* Bulk Assignment Modal */}
            <Modal
                title={`Manage Barangays - ${assignTargetBranch?.name}`}
                open={assignModalVisible}
                onCancel={() => setAssignModalVisible(false)}
                onOk={handleBulkAssign}
                confirmLoading={submitting}
                width={800}
            >
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    Select barangays to assign to this Field Office.
                    Previously assigned barangays from other FOs will be automatically reassigned.
                </Text>
                <Select
                    mode="multiple"
                    placeholder="Select barangays"
                    style={{ width: '100%' }}
                    value={selectedBarangayIds}
                    onChange={setSelectedBarangayIds}
                    optionFilterProp="children"
                    showSearch
                    maxTagCount="responsive"
                >
                    {allBarangays.map(barangay => (
                        <Option key={barangay.id} value={barangay.id}>
                            {barangay.name}
                            {barangay.branch_name && barangay.branch_id !== assignTargetBranch?.id && (
                                <Text type="secondary"> (currently: {barangay.branch_name})</Text>
                            )}
                        </Option>
                    ))}
                </Select>
            </Modal>

            {/* District Modal */}
            <Modal
                title={districtModalMode === 'create' ? 'Add District' : 'Edit District'}
                open={districtModalVisible}
                onCancel={() => setDistrictModalVisible(false)}
                onOk={handleDistrictSubmit}
                confirmLoading={submitting}
            >
                <Form form={districtForm} layout="vertical">
                    <Form.Item
                        name="name"
                        label="Name"
                        rules={[{ required: true, message: 'District name is required' }]}
                    >
                        <Input placeholder="e.g., District 1" />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={2} placeholder="Optional description" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* District Barangay Assignment Modal */}
            <Modal
                title={`Manage Barangays - ${districtAssignTarget?.name}`}
                open={districtAssignModalVisible}
                onCancel={() => setDistrictAssignModalVisible(false)}
                onOk={handleDistrictBulkAssign}
                confirmLoading={submitting}
                width={800}
            >
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    Select barangays to assign to this district.
                    Previously assigned barangays from other districts will be automatically reassigned.
                </Text>
                <Select
                    mode="multiple"
                    placeholder="Select barangays"
                    style={{ width: '100%' }}
                    value={selectedDistrictBarangayIds}
                    onChange={setSelectedDistrictBarangayIds}
                    optionFilterProp="children"
                    showSearch
                    maxTagCount="responsive"
                >
                    {allBarangays.map(barangay => (
                        <Option key={barangay.id} value={barangay.id}>
                            {barangay.name}
                            {barangay.district && barangay.district !== districtAssignTarget?.name && (
                                <Text type="secondary"> (currently: {barangay.district})</Text>
                            )}
                        </Option>
                    ))}
                </Select>
            </Modal>
        </div>
    );
}

export default BranchManagement;
