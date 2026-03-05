import { useState, useEffect } from 'react';
import {
    Modal,
    Form,
    Input,
    Select,
    DatePicker,
    Row,
    Col,
    Divider,
    message,
    Spin,
    Switch,
    Space,
} from 'antd';
import dayjs from 'dayjs';
import { seniorsApi, registrationApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const { Option } = Select;
const { TextArea } = Input;

function SeniorEditModal({ visible, seniorId, onClose, onSuccess }) {
    const { user } = useAuth();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [senior, setSenior] = useState(null);
    const [barangays, setBarangays] = useState([]);
    const [lookupOptions, setLookupOptions] = useState(null);

    useEffect(() => {
        if (visible && seniorId) {
            fetchSenior();
            fetchLookupOptions();
            fetchBarangays();
        }
    }, [visible, seniorId]);

    const fetchSenior = async () => {
        setLoading(true);
        try {
            const response = await seniorsApi.getById(seniorId);
            const seniorData = response.data.data;
            setSenior(seniorData);

            // Set form values
            form.setFieldsValue({
                first_name: seniorData.first_name,
                middle_name: seniorData.middle_name,
                last_name: seniorData.last_name,
                extension: seniorData.extension,
                birthdate: seniorData.birthdate ? dayjs(seniorData.birthdate) : null,
                gender_id: seniorData.gender_id,
                civil_status_id: seniorData.civil_status_id,
                barangay_id: seniorData.barangay_id,
                birthplace: seniorData.birthplace,
                house_number: seniorData.house_number,
                street: seniorData.street,
                purok: seniorData.purok,
                educational_attainment_id: seniorData.educational_attainment_id,
                is_active: seniorData.is_active,
                is_deceased: seniorData.is_deceased,
                mobile_number: seniorData.contact?.mobile,
                telephone: seniorData.contact?.telephone,
                email: seniorData.contact?.email,
                notes: seniorData.notes,
            });
        } catch (error) {
            console.error('Failed to fetch senior:', error);
            message.error('Failed to load senior information');
        } finally {
            setLoading(false);
        }
    };

    const fetchLookupOptions = async () => {
        try {
            const response = await registrationApi.getLookupOptions();
            setLookupOptions(response.data.data);
        } catch (error) {
            console.error('Failed to fetch lookup options:', error);
        }
    };

    const fetchBarangays = async () => {
        try {
            const response = await registrationApi.getBarangays();
            setBarangays(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch barangays:', error);
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            // Format birthdate
            const payload = {
                ...values,
                birthdate: values.birthdate ? values.birthdate.format('YYYY-MM-DD') : null,
            };

            await seniorsApi.update(seniorId, payload);
            message.success('Senior citizen information updated successfully');
            onSuccess?.();
            onClose();
        } catch (error) {
            if (error.errorFields) {
                // Form validation error
                return;
            }
            console.error('Failed to update senior:', error);
            message.error(error.response?.data?.message || 'Failed to update senior citizen');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        setSenior(null);
        onClose();
    };

    return (
        <Modal
            title={`Edit Senior Citizen: ${senior?.first_name || ''} ${senior?.last_name || ''}`}
            open={visible}
            onOk={handleSubmit}
            onCancel={handleCancel}
            confirmLoading={saving}
            width={800}
            okText="Save Changes"
        >
            <Spin spinning={loading}>
                <Form
                    form={form}
                    layout="vertical"
                    requiredMark="optional"
                >
                    {/* Personal Information */}
                    <Divider orientation="left">Personal Information</Divider>
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
                        <Col span={6}>
                            <Form.Item
                                name="last_name"
                                label="Last Name"
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={2}>
                            <Form.Item name="extension" label="Ext.">
                                <Input placeholder="Jr" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                name="birthdate"
                                label="Birthdate"
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="gender_id"
                                label="Gender"
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <Select placeholder="Select Gender">
                                    {lookupOptions?.genders?.map(g => (
                                        <Option key={g.id} value={g.id}>{g.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="civil_status_id"
                                label="Civil Status"
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <Select placeholder="Select Status">
                                    {lookupOptions?.civil_statuses?.map(cs => (
                                        <Option key={cs.id} value={cs.id}>{cs.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="educational_attainment_id" label="Educational Attainment">
                                <Select placeholder="Select" allowClear>
                                    {lookupOptions?.educational_attainments?.map(ea => (
                                        <Option key={ea.id} value={ea.id}>{ea.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* Address */}
                    <Divider orientation="left">Address</Divider>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="house_number" label="House No.">
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="street" label="Street">
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="barangay_id"
                                label="Barangay"
                                rules={[{ required: true, message: 'Required' }]}
                            >
                                <Select
                                    placeholder="Select Barangay"
                                    showSearch
                                    optionFilterProp="children"
                                >
                                    {barangays.map(b => (
                                        <Option key={b.id} value={b.id}>{b.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* Contact Information */}
                    <Divider orientation="left">Contact Information</Divider>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="mobile_number" label="Mobile Number">
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="telephone" label="Telephone">
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="email" label="Email">
                                <Input type="email" />
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* Status */}
                    <Divider orientation="left">Status</Divider>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="is_active" label="Active" valuePropName="checked">
                                <Switch checkedChildren="Yes" unCheckedChildren="No" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="is_deceased" label="Deceased" valuePropName="checked">
                                <Switch checkedChildren="Yes" unCheckedChildren="No" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="notes" label="Notes">
                                <TextArea rows={3} placeholder="Additional notes..." />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Spin>
        </Modal>
    );
}

export default SeniorEditModal;
