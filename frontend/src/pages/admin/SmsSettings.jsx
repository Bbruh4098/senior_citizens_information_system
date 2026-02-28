import { useState, useEffect, useCallback } from 'react';
import {
    Card,
    Tabs,
    Form,
    Input,
    Switch,
    Button,
    Table,
    Tag,
    Statistic,
    Row,
    Col,
    Typography,
    message,
    Space,
    Select,
    Alert,
    InputNumber,
    Tooltip,
} from 'antd';
import {
    SettingOutlined,
    MessageOutlined,
    BarChartOutlined,
    SaveOutlined,
    SendOutlined,
    InfoCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ReloadOutlined,
    ExclamationCircleOutlined,
} from '@ant-design/icons';
import { smsApi } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const SmsSettings = () => {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logs, setLogs] = useState({ data: [], total: 0 });
    const [logsLoading, setLogsLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [testSending, setTestSending] = useState(false);
    const [logFilters, setLogFilters] = useState({ page: 1, per_page: 15 });
    const [form] = Form.useForm();
    const selectedProvider = Form.useWatch('sms_provider', form);

    // Load settings
    const loadSettings = useCallback(async () => {
        try {
            setLoading(true);
            const response = await smsApi.getSettings();
            const d = response.data.data;
            setSettings(d);
            form.setFieldsValue({
                sms_enabled: d.sms_enabled === '1',
                sms_provider: d.sms_provider || 'twilio',
                twilio_account_sid: d.twilio_account_sid || '',
                twilio_auth_token: d.twilio_auth_token || '',
                twilio_phone_number: d.twilio_phone_number || '',
                semaphore_api_key: d.semaphore_api_key || '',
                otp_message_template: d.otp_message_template || '',
                reference_message_template: d.reference_message_template || '',
                max_otp_per_hour: parseInt(d.max_otp_per_hour) || 3,
                max_otp_per_day: parseInt(d.max_otp_per_day) || 10,
                max_sms_per_day: parseInt(d.max_sms_per_day) || 100,
            });
        } catch {
            message.error('Failed to load SMS settings');
        } finally {
            setLoading(false);
        }
    }, [form]);

    // Load logs
    const loadLogs = useCallback(async () => {
        try {
            setLogsLoading(true);
            const response = await smsApi.getLogs(logFilters);
            setLogs(response.data.data);
        } catch {
            message.error('Failed to load SMS logs');
        } finally {
            setLogsLoading(false);
        }
    }, [logFilters]);

    // Load stats
    const loadStats = useCallback(async () => {
        try {
            setStatsLoading(true);
            const response = await smsApi.getStats();
            setStats(response.data.data);
        } catch {
            message.error('Failed to load SMS statistics');
        } finally {
            setStatsLoading(false);
        }
    }, []);

    useEffect(() => { loadSettings(); }, [loadSettings]);
    useEffect(() => { loadLogs(); }, [loadLogs]);
    useEffect(() => { loadStats(); }, [loadStats]);

    // Save settings
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            await smsApi.updateSettings({
                sms_enabled: values.sms_enabled ? '1' : '0',
                sms_provider: values.sms_provider,
                twilio_account_sid: values.twilio_account_sid,
                twilio_auth_token: values.twilio_auth_token,
                twilio_phone_number: values.twilio_phone_number,
                semaphore_api_key: values.semaphore_api_key,
                otp_message_template: values.otp_message_template,
                reference_message_template: values.reference_message_template,
                max_otp_per_hour: String(values.max_otp_per_hour),
                max_otp_per_day: String(values.max_otp_per_day),
                max_sms_per_day: String(values.max_sms_per_day),
            });
            message.success('SMS settings saved successfully');
            loadSettings();
            loadStats();
        } catch {
            message.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    // Send test SMS
    const handleTestSms = async () => {
        if (!testPhone || !/^09\d{9}$/.test(testPhone)) {
            message.warning('Enter a valid PH mobile number (09XXXXXXXXX)');
            return;
        }
        try {
            setTestSending(true);
            const response = await smsApi.sendTest(testPhone);
            if (response.data.success) {
                message.success('Test SMS sent successfully!');
            } else {
                message.warning(response.data.message || 'Test SMS failed');
            }
            loadLogs();
            loadStats();
        } catch (error) {
            message.error(error.response?.data?.message || 'Failed to send test SMS');
        } finally {
            setTestSending(false);
        }
    };

    // Log table columns
    const logColumns = [
        {
            title: 'Date',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date) => dayjs(date).format('MMM DD, YYYY h:mm A'),
            width: 170,
        },
        {
            title: 'Phone',
            dataIndex: 'phone_number',
            key: 'phone_number',
            width: 130,
        },
        {
            title: 'Type',
            dataIndex: 'message_type',
            key: 'message_type',
            width: 100,
            render: (type) => {
                const colors = { otp: 'blue', reference: 'green', notification: 'orange' };
                return <Tag color={colors[type] || 'default'}>{type?.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 90,
            render: (status) => {
                const config = {
                    sent: { color: 'success', icon: <CheckCircleOutlined /> },
                    failed: { color: 'error', icon: <CloseCircleOutlined /> },
                    queued: { color: 'processing', icon: <ReloadOutlined spin /> },
                };
                const { color, icon } = config[status] || { color: 'default' };
                return <Tag color={color} icon={icon}>{status?.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Message',
            dataIndex: 'message',
            key: 'message',
            ellipsis: true,
        },
        {
            title: 'Error',
            dataIndex: 'error_message',
            key: 'error_message',
            ellipsis: true,
            width: 180,
            render: (error) => error ? <Text type="danger" style={{ fontSize: 12 }}>{error}</Text> : '-',
        },
    ];

    // Configuration Tab
    const ConfigTab = () => (
        <div>
            <Form form={form} layout="vertical" size="large">
                {/* Enable/Disable */}
                <Card size="small" style={{ marginBottom: 16 }}>
                    <Row align="middle" justify="space-between">
                        <Col>
                            <Space>
                                <MessageOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                                <div>
                                    <Text strong style={{ fontSize: 16 }}>SMS Sending</Text>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: 12 }}>Enable or disable all SMS functionality</Text>
                                </div>
                            </Space>
                        </Col>
                        <Col>
                            <Form.Item name="sms_enabled" valuePropName="checked" style={{ marginBottom: 0 }}>
                                <Switch checkedChildren="ON" unCheckedChildren="OFF" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                {/* Provider Selection */}
                <Card title="SMS Provider" size="small" style={{ marginBottom: 16 }}>
                    <Form.Item name="sms_provider" label="Active Provider">
                        <Select>
                            <Select.Option value="twilio">Twilio (Trial / Global)</Select.Option>
                            <Select.Option value="semaphore">Semaphore (Philippines)</Select.Option>
                        </Select>
                    </Form.Item>

                    {/* Twilio Credentials */}
                    {(selectedProvider === 'twilio' || (!selectedProvider && (settings.sms_provider || 'twilio') === 'twilio')) && (
                        <>
                            {/* <Alert
                                message="Twilio Setup"
                                description={
                                    <ol style={{ paddingLeft: 20, margin: '8px 0' }}>
                                        <li>Go to <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer">console.twilio.com</a> and sign up / log in</li>
                                        <li>Copy your <strong>Account SID</strong> and <strong>Auth Token</strong> from the dashboard</li>
                                        <li>Copy your <strong>Twilio phone number</strong> (e.g. +1234567890)</li>
                                        <li>On trial, you can only send to <strong>verified numbers</strong> — add yours in <em>Phone Numbers → Verified Caller IDs</em></li>
                                    </ol>
                                }
                                type="info"
                                showIcon
                                icon={<InfoCircleOutlined />}
                                style={{ marginBottom: 16 }}
                            /> */}
                            <Row gutter={16}>
                                <Col xs={24} sm={12}>
                                    <Form.Item name="twilio_account_sid" label="Account SID">
                                        <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item name="twilio_auth_token" label="Auth Token">
                                        <Input.Password placeholder="Your Twilio Auth Token" />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="twilio_phone_number"
                                        label={
                                            <span>
                                                Twilio Phone Number{' '}
                                                <Tooltip title="Your Twilio number in E.164 format, e.g. +14155238886">
                                                    <InfoCircleOutlined />
                                                </Tooltip>
                                            </span>
                                        }
                                    >
                                        <Input placeholder="+1XXXXXXXXXX" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </>
                    )}

                    {/* Semaphore Credentials */}
                    {selectedProvider === 'semaphore' && (
                        <>
                            <Alert
                                message="Semaphore Setup"
                                description={
                                    <ol style={{ paddingLeft: 20, margin: '8px 0' }}>
                                        <li>Go to <a href="https://semaphore.co" target="_blank" rel="noopener noreferrer">semaphore.co</a> and create an account</li>
                                        <li>Copy your <strong>API Key</strong> from your dashboard</li>
                                        <li>Semaphore works with all PH networks (Globe, Smart, DITO) at ₱0.50/SMS</li>
                                    </ol>
                                }
                                type="info"
                                showIcon
                                icon={<InfoCircleOutlined />}
                                style={{ marginBottom: 16 }}
                            />
                            <Row gutter={16}>
                                <Col xs={24} sm={12}>
                                    <Form.Item name="semaphore_api_key" label="API Key">
                                        <Input.Password placeholder="Your Semaphore API Key" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </>
                    )}

                    {/* Status indicator */}
                    <div style={{ marginTop: 8 }}>
                        {settings.is_configured ? (
                            <Tag icon={<CheckCircleOutlined />} color="success">
                                {(selectedProvider || settings.sms_provider || 'twilio').charAt(0).toUpperCase() + (selectedProvider || settings.sms_provider || 'twilio').slice(1)} configured
                            </Tag>
                        ) : (
                            <Tag icon={<ExclamationCircleOutlined />} color="warning">Provider not fully configured</Tag>
                        )}
                    </div>
                </Card>

                {/* Message Templates */}
                <Card title="Message Templates" size="small" style={{ marginBottom: 16 }}>
                    <Form.Item
                        name="otp_message_template"
                        label={
                            <span>
                                OTP Message Template{' '}
                                <Tooltip title="Use {otp} as placeholder for the OTP code">
                                    <InfoCircleOutlined />
                                </Tooltip>
                            </span>
                        }
                    >
                        <TextArea rows={2} placeholder="Your OSCA Senior Portal OTP is: {otp}. Valid for 10 minutes." />
                    </Form.Item>
                    <Form.Item
                        name="reference_message_template"
                        label={
                            <span>
                                Reference Number Template{' '}
                                <Tooltip title="Use {reference_number} as placeholder">
                                    <InfoCircleOutlined />
                                </Tooltip>
                            </span>
                        }
                    >
                        <TextArea rows={2} placeholder="Your OSCA application reference number is: {reference_number}." />
                    </Form.Item>
                </Card>

                {/* Rate Limiting */}
                <Card title="Rate Limiting" size="small" style={{ marginBottom: 16 }}>
                    <Row gutter={16}>
                        <Col xs={24} sm={8}>
                            <Form.Item name="max_otp_per_hour" label="Max OTP per Phone / Hour">
                                <InputNumber min={1} max={20} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item name="max_otp_per_day" label="Max OTP per Phone / Day">
                                <InputNumber min={1} max={100} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item name="max_sms_per_day" label="Max Total SMS / Day (Global)">
                                <InputNumber min={1} max={10000} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                {/* Save + Test */}
                <Row gutter={16}>
                    <Col xs={24} sm={12}>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            onClick={handleSave}
                            loading={saving}
                            size="large"
                            block
                        >
                            Save Settings
                        </Button>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Space.Compact style={{ width: '100%' }}>
                            <Input
                                placeholder="09XXXXXXXXX"
                                value={testPhone}
                                onChange={(e) => setTestPhone(e.target.value)}
                                maxLength={11}
                                size="large"
                            />
                            <Button
                                type="default"
                                icon={<SendOutlined />}
                                onClick={handleTestSms}
                                loading={testSending}
                                size="large"
                            >
                                Send Test
                            </Button>
                        </Space.Compact>
                    </Col>
                </Row>
            </Form>
        </div>
    );

    // Logs Tab
    const LogsTab = () => (
        <div>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={8}>
                    <Select
                        placeholder="Filter by type"
                        allowClear
                        style={{ width: '100%' }}
                        onChange={(val) => setLogFilters(prev => ({ ...prev, type: val, page: 1 }))}
                    >
                        <Select.Option value="otp">OTP</Select.Option>
                        <Select.Option value="reference">Reference</Select.Option>
                        <Select.Option value="notification">Notification</Select.Option>
                    </Select>
                </Col>
                <Col xs={24} sm={8}>
                    <Select
                        placeholder="Filter by status"
                        allowClear
                        style={{ width: '100%' }}
                        onChange={(val) => setLogFilters(prev => ({ ...prev, status: val, page: 1 }))}
                    >
                        <Select.Option value="sent">Sent</Select.Option>
                        <Select.Option value="failed">Failed</Select.Option>
                        <Select.Option value="queued">Queued</Select.Option>
                    </Select>
                </Col>
                <Col xs={24} sm={8}>
                    <Input
                        placeholder="Search phone number"
                        allowClear
                        onChange={(e) => setLogFilters(prev => ({ ...prev, phone: e.target.value, page: 1 }))}
                    />
                </Col>
            </Row>

            <Table
                columns={logColumns}
                dataSource={logs.data || []}
                rowKey="id"
                loading={logsLoading}
                pagination={{
                    current: logs.current_page || 1,
                    pageSize: logs.per_page || 15,
                    total: logs.total || 0,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} records`,
                    onChange: (page, pageSize) => setLogFilters(prev => ({ ...prev, page, per_page: pageSize })),
                }}
                scroll={{ x: 800 }}
                size="small"
            />
        </div>
    );

    // Statistics Tab
    const StatsTab = () => (
        <div>
            {!stats ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <Button icon={<ReloadOutlined />} onClick={loadStats} loading={statsLoading}>Load Statistics</Button>
                </div>
            ) : (
                <>
                    <Alert
                        message={
                            stats.is_enabled && stats.is_configured
                                ? 'SMS service is active and configured'
                                : !stats.is_enabled
                                    ? 'SMS service is currently disabled'
                                    : 'SMS service needs configuration'
                        }
                        type={stats.is_enabled && stats.is_configured ? 'success' : 'warning'}
                        showIcon
                        style={{ marginBottom: 24 }}
                    />

                    <Title level={5} style={{ marginBottom: 16 }}>Today</Title>
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={12} sm={6}>
                            <Card size="small">
                                <Statistic title="Total Sent" value={stats.today?.total || 0} valueStyle={{ color: '#1890ff' }} />
                            </Card>
                        </Col>
                        <Col xs={12} sm={6}>
                            <Card size="small">
                                <Statistic title="Successful" value={stats.today?.sent || 0} valueStyle={{ color: '#52c41a' }} />
                            </Card>
                        </Col>
                        <Col xs={12} sm={6}>
                            <Card size="small">
                                <Statistic title="Failed" value={stats.today?.failed || 0} valueStyle={{ color: '#ff4d4f' }} />
                            </Card>
                        </Col>
                        <Col xs={12} sm={6}>
                            <Card size="small">
                                <Statistic
                                    title="Daily Remaining"
                                    value={stats.daily_remaining}
                                    suffix={`/ ${stats.daily_limit}`}
                                    valueStyle={{ color: stats.daily_remaining < 10 ? '#ff4d4f' : '#52c41a' }}
                                />
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={12} sm={6}>
                            <Card size="small">
                                <Statistic title="OTP Messages" value={stats.today?.otp || 0} prefix={<MessageOutlined style={{ color: '#1890ff' }} />} />
                            </Card>
                        </Col>
                        <Col xs={12} sm={6}>
                            <Card size="small">
                                <Statistic title="Reference SMS" value={stats.today?.reference || 0} prefix={<MessageOutlined style={{ color: '#52c41a' }} />} />
                            </Card>
                        </Col>
                    </Row>

                    <Title level={5} style={{ marginBottom: 16 }}>This Month</Title>
                    <Row gutter={[16, 16]}>
                        <Col xs={12} sm={6}>
                            <Card size="small"><Statistic title="Total" value={stats.this_month?.total || 0} /></Card>
                        </Col>
                        <Col xs={12} sm={6}>
                            <Card size="small"><Statistic title="Successful" value={stats.this_month?.sent || 0} valueStyle={{ color: '#52c41a' }} /></Card>
                        </Col>
                        <Col xs={12} sm={6}>
                            <Card size="small"><Statistic title="Failed" value={stats.this_month?.failed || 0} valueStyle={{ color: '#ff4d4f' }} /></Card>
                        </Col>
                        <Col xs={12} sm={6}>
                            <Card size="small">
                                <Statistic
                                    title="Success Rate"
                                    value={stats.this_month?.total > 0 ? ((stats.this_month.sent / stats.this_month.total) * 100).toFixed(1) : 0}
                                    suffix="%"
                                    valueStyle={{ color: stats.this_month?.total > 0 && (stats.this_month.sent / stats.this_month.total) > 0.9 ? '#52c41a' : '#faad14' }}
                                />
                            </Card>
                        </Col>
                    </Row>
                </>
            )}
        </div>
    );

    const tabItems = [
        { key: 'config', label: <span><SettingOutlined /> Configuration</span>, children: <ConfigTab /> },
        { key: 'logs', label: <span><MessageOutlined /> SMS Logs</span>, children: <LogsTab /> },
        { key: 'stats', label: <span><BarChartOutlined /> Statistics</span>, children: <StatsTab /> },
    ];

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}>
                    <MessageOutlined style={{ marginRight: 8 }} />
                    SMS Settings
                </Title>
                <Text type="secondary">Configure SMS integration for OTP verification and notifications</Text>
            </div>

            <Card loading={loading}>
                <Tabs items={tabItems} size="large" />
            </Card>
        </div>
    );
};

export default SmsSettings;
