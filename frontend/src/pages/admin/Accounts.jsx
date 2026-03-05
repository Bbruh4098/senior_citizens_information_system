import { useState, useEffect } from 'react';
import {
    Card,
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
    Tooltip,
    Divider,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    SearchOutlined,
    ReloadOutlined,
    LockOutlined,
    CheckCircleOutlined,
    StopOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { accountsApi } from '../../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

function Accounts() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState({ roles: [], branches: [], barangays: [] });
    const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });
    const [filters, setFilters] = useState({ search: '', role_id: null, is_active: null });

    // Modal states
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [filteredBarangays, setFilteredBarangays] = useState([]);
    const [loadingBarangays, setLoadingBarangays] = useState(false);

    useEffect(() => {
        loadAccounts();
        loadOptions();
    }, []);

    const loadAccounts = async (page = 1) => {
        setLoading(true);
        try {
            const params = {
                page,
                per_page: pagination.pageSize,
                ...filters,
            };
            // Remove null/empty values
            Object.keys(params).forEach(key => {
                if (params[key] === null || params[key] === '') {
                    delete params[key];
                }
            });

            const response = await accountsApi.getList(params);
            setAccounts(response.data.data);
            setPagination(prev => ({
                ...prev,
                current: response.data.meta.current_page,
                total: response.data.meta.total,
            }));
        } catch (error) {
            message.error('Failed to load accounts');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadOptions = async () => {
        try {
            const response = await accountsApi.getOptions();
            setOptions(response.data.data);
        } catch (error) {
            console.error('Failed to load options:', error);
        }
    };

    const handleSearch = () => {
        loadAccounts(1);
    };

    const handleTableChange = (newPagination) => {
        loadAccounts(newPagination.current);
    };

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedAccount(null);
        form.resetFields();
        setModalVisible(true);
    };

    const openEditModal = (record) => {
        setModalMode('edit');
        setSelectedAccount(record);
        form.setFieldsValue({
            ...record,
            password: undefined, // Don't show password
        });
        // Load barangays for the current branch if Barangay Admin
        if (record.role_id === 3 && record.branch_id) {
            loadBarangaysByBranch(record.branch_id);
        } else {
            setFilteredBarangays([]);
        }
        setModalVisible(true);
    };

    const openPasswordModal = (record) => {
        setSelectedAccount(record);
        passwordForm.resetFields();
        setPasswordModalVisible(true);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            if (modalMode === 'create') {
                await accountsApi.create(values);
                message.success('Account created successfully');
            } else {
                // Remove password if empty (not changing it)
                if (!values.password) {
                    delete values.password;
                }
                await accountsApi.update(selectedAccount.id, values);
                message.success('Account updated successfully');
            }

            setModalVisible(false);
            loadAccounts(pagination.current);
        } catch (error) {
            if (error.response?.data?.error) {
                message.error(error.response.data.error);
            } else if (error.response?.data?.errors) {
                const firstError = Object.values(error.response.data.errors)[0];
                message.error(firstError[0]);
            } else {
                message.error('Operation failed');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handlePasswordReset = async () => {
        try {
            const values = await passwordForm.validateFields();
            setSubmitting(true);
            await accountsApi.resetPassword(selectedAccount.id, values.password);
            message.success('Password reset successfully');
            setPasswordModalVisible(false);
        } catch (error) {
            message.error('Failed to reset password');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (record) => {
        try {
            await accountsApi.toggleStatus(record.id);
            message.success(record.is_active ? 'Account disabled' : 'Account enabled');
            loadAccounts(pagination.current);
        } catch (error) {
            message.error(error.response?.data?.error || 'Operation failed');
        }
    };

    const handleDelete = async (record) => {
        try {
            await accountsApi.delete(record.id);
            message.success('Account deleted successfully');
            loadAccounts(pagination.current);
        } catch (error) {
            message.error(error.response?.data?.error || 'Failed to delete account');
        }
    };

    const getRoleColor = (roleId) => {
        switch (roleId) {
            case 1: return 'gold';
            case 2: return 'blue';
            case 3: return 'green';
            default: return 'default';
        }
    };

    const getRoleName = (roleId) => {
        const role = options.roles.find(r => r.id === roleId);
        return role?.name || 'Unknown';
    };

    const columns = [
        {
            title: 'Employee ID',
            dataIndex: 'employee_id',
            key: 'employee_id',
            width: 120,
        },
        {
            title: 'Name',
            key: 'name',
            render: (_, record) => (
                <Space>
                    <UserOutlined />
                    <span>{`${record.first_name} ${record.last_name}`}</span>
                </Space>
            ),
        },
        {
            title: 'Username',
            dataIndex: 'username',
            key: 'username',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            ellipsis: true,
        },
        {
            title: 'Role',
            dataIndex: 'role_id',
            key: 'role_id',
            render: (roleId) => (
                <Tag color={getRoleColor(roleId)}>
                    {getRoleName(roleId)}
                </Tag>
            ),
        },
        {
            title: 'Field Office / Barangay',
            key: 'assignment',
            render: (_, record) => {
                if (record.role_id === 1) return <Text type="secondary">Main Office</Text>;
                if (record.branch) {
                    if (record.barangay) {
                        return (
                            <Space direction="vertical" size={0}>
                                <Text>{record.branch.name}</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {record.barangay.name}
                                </Text>
                            </Space>
                        );
                    }
                    return record.branch.name;
                }
                return '-';
            },
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
                <Space size="small">
                    <Tooltip title="Edit">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openEditModal(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Reset Password">
                        <Button
                            type="text"
                            icon={<LockOutlined />}
                            onClick={() => openPasswordModal(record)}
                        />
                    </Tooltip>
                    <Tooltip title={record.is_active ? 'Disable' : 'Enable'}>
                        <Popconfirm
                            title={`${record.is_active ? 'Disable' : 'Enable'} this account?`}
                            onConfirm={() => handleToggleStatus(record)}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button
                                type="text"
                                icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
                                danger={record.is_active}
                            />
                        </Popconfirm>
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Popconfirm
                            title="Delete this account?"
                            description="This action cannot be undone."
                            onConfirm={() => handleDelete(record)}
                            okText="Delete"
                            okButtonProps={{ danger: true }}
                            cancelText="Cancel"
                        >
                            <Button type="text" icon={<DeleteOutlined />} danger />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    const selectedRoleId = Form.useWatch('role_id', form);
    const selectedBranchId = Form.useWatch('branch_id', form);

    // Load barangays when branch is selected/changed
    const loadBarangaysByBranch = async (branchId) => {
        if (!branchId) {
            setFilteredBarangays([]);
            return;
        }
        setLoadingBarangays(true);
        try {
            const response = await accountsApi.getBarangaysByBranch(branchId);
            setFilteredBarangays(response.data.data);
        } catch (error) {
            console.error('Failed to load barangays:', error);
            setFilteredBarangays([]);
        } finally {
            setLoadingBarangays(false);
        }
    };

    // Handle branch change - fetch barangays and clear barangay field
    const handleBranchChange = (branchId) => {
        form.setFieldValue('barangay_id', undefined);
        loadBarangaysByBranch(branchId);
    };

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                    <Col>
                        <Title level={4} style={{ margin: 0 }}>Account Management</Title>
                    </Col>
                    <Col>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={openCreateModal}
                        >
                            Create Account
                        </Button>
                    </Col>
                </Row>

                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={8}>
                        <Input
                            placeholder="Search by name, username, or email"
                            prefix={<SearchOutlined />}
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            onPressEnter={handleSearch}
                        />
                    </Col>
                    <Col span={4}>
                        <Select
                            placeholder="Filter by Role"
                            allowClear
                            style={{ width: '100%' }}
                            value={filters.role_id}
                            onChange={(value) => setFilters(prev => ({ ...prev, role_id: value }))}
                        >
                            {options.roles.map(role => (
                                <Option key={role.id} value={role.id}>{role.name}</Option>
                            ))}
                        </Select>
                    </Col>
                    <Col span={4}>
                        <Select
                            placeholder="Filter by Status"
                            allowClear
                            style={{ width: '100%' }}
                            value={filters.is_active}
                            onChange={(value) => setFilters(prev => ({ ...prev, is_active: value }))}
                        >
                            <Option value={1}>Active</Option>
                            <Option value={0}>Inactive</Option>
                        </Select>
                    </Col>
                    <Col>
                        <Space>
                            <Button icon={<SearchOutlined />} onClick={handleSearch}>
                                Search
                            </Button>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => {
                                    setFilters({ search: '', role_id: null, is_active: null });
                                    loadAccounts(1);
                                }}
                            >
                                Reset
                            </Button>
                        </Space>
                    </Col>
                </Row>

                <Table
                    columns={columns}
                    dataSource={accounts}
                    rowKey="id"
                    loading={loading}
                    pagination={pagination}
                    onChange={handleTableChange}
                />
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                title={modalMode === 'create' ? 'Create Account' : 'Edit Account'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={handleSubmit}
                confirmLoading={submitting}
                width={700}
            >
                <Form form={form} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="employee_id"
                                label="Employee ID"
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <Input placeholder="e.g., EMP001" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="username"
                                label="Username"
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <Input placeholder="Username for login" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                name="first_name"
                                label="First Name"
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="middle_name" label="Middle Name">
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="last_name"
                                label="Last Name"
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="email"
                                label="Email"
                                rules={[
                                    { required: true, message: 'Required' },
                                    { type: 'email', message: 'Invalid email' },
                                ]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="mobile_number" label="Mobile Number">
                                <Input placeholder="09XXXXXXXXX" />
                            </Form.Item>
                        </Col>
                    </Row>

                    {modalMode === 'create' && (
                        <Form.Item
                            name="password"
                            label="Password"
                            rules={[
                                { required: true, message: 'Required' },
                                { min: 6, message: 'Minimum 6 characters' },
                            ]}
                        >
                            <Input.Password placeholder="Minimum 6 characters" />
                        </Form.Item>
                    )}

                    <Divider />

                    <Form.Item
                        name="role_id"
                        label="Role"
                        rules={[{ required: true, message: 'Required' }]}
                    >
                        <Select placeholder="Select Role">
                            {options.roles.map(role => (
                                <Option key={role.id} value={role.id}>{role.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    {(selectedRoleId === 2 || selectedRoleId === 3) && (
                        <Form.Item
                            name="branch_id"
                            label="Field Office"
                            rules={[{ required: true, message: 'Required for this role' }]}
                        >
                            <Select
                                placeholder="Select Field Office"
                                onChange={handleBranchChange}
                            >
                                {options.branches.map(branch => (
                                    <Option key={branch.id} value={branch.id}>{branch.name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}

                    {selectedRoleId === 3 && (
                        <Form.Item
                            name="barangay_id"
                            label="Barangay"
                            rules={[{ required: true, message: 'Required for Barangay Admin' }]}
                            extra={!selectedBranchId ? 'Select a Field Office first' : ''}
                        >
                            <Select
                                placeholder={selectedBranchId ? 'Select Barangay' : 'Select Field Office first'}
                                showSearch
                                optionFilterProp="children"
                                loading={loadingBarangays}
                                disabled={!selectedBranchId}
                            >
                                {filteredBarangays.map(barangay => (
                                    <Option key={barangay.id} value={barangay.id}>
                                        {barangay.name}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}

                    <Form.Item name="position" label="Position">
                        <Input placeholder="e.g., Field Office Manager" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Password Reset Modal */}
            <Modal
                title="Reset Password"
                open={passwordModalVisible}
                onCancel={() => setPasswordModalVisible(false)}
                onOk={handlePasswordReset}
                confirmLoading={submitting}
            >
                <Form form={passwordForm} layout="vertical">
                    <Form.Item
                        name="password"
                        label="New Password"
                        rules={[
                            { required: true, message: 'Required' },
                            { min: 6, message: 'Minimum 6 characters' },
                        ]}
                    >
                        <Input.Password placeholder="Enter new password" />
                    </Form.Item>
                    <Form.Item
                        name="confirm_password"
                        label="Confirm Password"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: 'Required' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Passwords do not match'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password placeholder="Confirm new password" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

export default Accounts;
