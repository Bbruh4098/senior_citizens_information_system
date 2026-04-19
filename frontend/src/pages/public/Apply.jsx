import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Typography, Form, Input, Select, DatePicker, Button, Steps, Result, message, Divider, Spin, InputNumber, Tag, Checkbox } from 'antd';
import {
    UserOutlined,
    UsergroupAddOutlined,
    ApartmentOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    ArrowLeftOutlined,
    ArrowRightOutlined,
    SearchOutlined,
    PlusOutlined,
    DeleteOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { publicApi } from '../../services/api';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Apply = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [referenceNumber, setReferenceNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [smsSent, setSmsSent] = useState(false);
    const [barangays, setBarangays] = useState([]);
    const [loadingBarangays, setLoadingBarangays] = useState(true);
    const [form] = Form.useForm();
    const [calculatedAge, setCalculatedAge] = useState(null);
    const [familyMembers, setFamilyMembers] = useState([]);
    const [privacyAgreed, setPrivacyAgreed] = useState(false);
    const [registrationType, setRegistrationType] = useState(null); // 'self' or 'assisted'
    const [showRelOther, setShowRelOther] = useState(false); // toggle inline 'Other' input for relationship

    // Status check state
    const [checkMode, setCheckMode] = useState(false);
    const [checkRef, setCheckRef] = useState('');
    const [checkLoading, setCheckLoading] = useState(false);
    const [statusData, setStatusData] = useState(null);

    // Lookup options (simplified for public form)
    const genders = [
        { id: 1, name: 'Male' },
        { id: 2, name: 'Female' },
    ];

    const educationalAttainments = [
        { id: 1, name: 'No Formal Education' },
        { id: 2, name: 'Elementary Level' },
        { id: 3, name: 'Elementary Graduate' },
        { id: 4, name: 'High School Level' },
        { id: 5, name: 'High School Graduate' },
        { id: 6, name: 'Vocational' },
        { id: 7, name: 'College Level' },
        { id: 8, name: 'College Graduate' },
        { id: 9, name: 'Post Graduate' },
    ];

    const civilStatuses = [
        { id: 1, name: 'Single' },
        { id: 2, name: 'Married' },
        { id: 3, name: 'Separated' },
        { id: 4, name: 'Widow' },
        { id: 5, name: 'Widower' },
        { id: 6, name: 'Divorced' },
        { id: 7, name: 'Annulled' },
        { id: 8, name: 'Single Parent' },
    ];

    const targetSectors = [
        { value: 'PNGNA', label: 'PNGNA', description: 'Pambansang Nagkakaisa ng mga Nakatatanda' },
        { value: 'WEPC', label: 'WEPC', description: 'Women Empowerment Program for the Community' },
        { value: 'PWD', label: 'PWD', description: 'Person with Disability' },
        { value: 'YNSP', label: 'YNSP', description: 'Yakap ng Nagkakaisa sa Serbisyo ng Pangulo' },
        { value: 'PASP', label: 'PASP', description: 'Pag-asa at Suporta ng Pangulo' },
        { value: 'KIA/WIA', label: 'KIA/WIA', description: 'Killed in Action / Wounded in Action' },
    ];

    const subCategories = [
        { value: 'Solo Parents', label: 'Solo Parents' },
        { value: 'Indigenous Person (IP)', label: 'IP - Indigenous Person' },
        { value: 'Recovering Person who used drugs', label: 'Recovering Person who used drugs' },
        { value: "4P's DSWD Beneficiaries", label: "4P's (DSWD Beneficiaries)" },
        { value: 'Street Dwellers', label: 'Street Dwellers' },
        { value: 'Psychosocial/Mental/Learning Disability', label: 'Psychosocial / Mental / Learning Disability' },
        { value: 'Stateless Person/Asylum', label: 'Stateless Person / Asylum Seeker' },
    ];

    const steps = [
        { title: 'Type', icon: <TeamOutlined /> },
        { title: 'Info', icon: <UserOutlined /> },
        { title: 'Family', icon: <UsergroupAddOutlined /> },
        { title: 'Sectors', icon: <ApartmentOutlined /> },
        { title: 'Review', icon: <FileTextOutlined /> },
    ];

    useEffect(() => {
        loadBarangays();
    }, []);

    const loadBarangays = async () => {
        try {
            const response = await publicApi.getBarangays();
            setBarangays(response.data.data || []);
        } catch (error) {
            console.error('Failed to load barangays:', error);
            setBarangays([
                { id: 1, name: 'Arena Blanco' }, { id: 2, name: 'Ayala' }, { id: 3, name: 'Baliwasan' },
                { id: 4, name: 'Calarian' }, { id: 5, name: 'Camino Nuevo' }, { id: 6, name: 'Canelar' },
            ]);
        } finally {
            setLoadingBarangays(false);
        }
    };

    const calculateAge = useCallback((birthdate) => {
        if (!birthdate) {
            setCalculatedAge(null);
            return;
        }
        const birth = dayjs(birthdate);
        const today = dayjs();
        const age = today.diff(birth, 'year');
        setCalculatedAge(age >= 0 ? age : null);
    }, []);

    const getAgeCategory = (age) => {
        if (age >= 100) return { label: 'Centenarian', color: 'gold' };
        if (age >= 90) return { label: 'Nonagenarian', color: 'purple' };
        if (age >= 80) return { label: 'Octogenarian', color: 'blue' };
        if (age >= 70) return { label: 'Septuagenarian', color: 'cyan' };
        if (age >= 60) return { label: 'Sexagenarian', color: 'green' };
        return null;
    };

    const handleBirthdateChange = (date) => {
        calculateAge(date);
        form.setFieldValue('birthdate', date);
    };

    // Family member management
    const addFamilyMember = () => {
        setFamilyMembers([
            ...familyMembers,
            { id: Date.now(), first_name: '', middle_name: '', last_name: '', extension: '', birthdate: null, relationship: '', age: '', monthly_salary: '', mobile_number: '', telephone_number: '', email: '' },
        ]);
    };

    const removeFamilyMember = (id) => {
        setFamilyMembers(familyMembers.filter((m) => m.id !== id));
    };

    const updateFamilyMember = (id, field, value) => {
        setFamilyMembers(prev =>
            prev.map((m) => {
                if (m.id !== id) return m;
                const updated = { ...m, [field]: value };
                // Auto-calculate age when birthdate changes
                if (field === 'birthdate' && value) {
                    updated.age = dayjs().diff(dayjs(value), 'year');
                } else if (field === 'birthdate' && !value) {
                    updated.age = '';
                }
                return updated;
            })
        );
    };

    const handleNext = async () => {
        // Block Step 0 if no registration type or privacy not agreed
        if (currentStep === 0) {
            if (!registrationType) {
                message.warning('Please select who is filling out this form.');
                return;
            }
            if (!privacyAgreed) {
                message.warning('Please read and agree to the Data Privacy Notice before proceeding.');
                return;
            }
            // If assisted, validate assistant fields from form
            if (registrationType === 'assisted') {
                try {
                    const fieldsToValidate = ['assistant_first_name', 'assistant_last_name', 'assistant_relationship', 'assistant_contact'];
                    await form.validateFields(fieldsToValidate);
                } catch {
                    message.warning('Please fill in all assistant information.');
                    return;
                }
            }
            const values = form.getFieldsValue();
            setFormData({ ...formData, ...values, registration_type: registrationType });
            setCurrentStep(currentStep + 1);
            return;
        }
        try {
            const values = await form.validateFields();
            const definedValues = Object.fromEntries(
                Object.entries(values).filter(([, v]) => v !== undefined)
            );
            setFormData({ ...formData, ...definedValues });

            // Validate family member required fields
            if (currentStep === 2 && familyMembers.length > 0) {
                const invalidMembers = familyMembers.filter(
                    m => !m.first_name?.trim() || !m.last_name?.trim() || !m.relationship?.trim() || m.relationship === '__other__'
                );
                if (invalidMembers.length > 0) {
                    message.warning('Please fill in First Name, Last Name, and Relationship for all family members, or remove incomplete entries.');
                    return;
                }
            }

            if (currentStep < steps.length - 1) {
                setCurrentStep(currentStep + 1);
            }
        } catch (error) {
            message.warning('Please fill in all required fields');
        }
    };

    const handlePrev = () => {
        // Save current values before going back
        const values = form.getFieldsValue();
        const definedValues = Object.fromEntries(
            Object.entries(values).filter(([, v]) => v !== undefined)
        );
        setFormData({ ...formData, ...definedValues });
        setCurrentStep(currentStep - 1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Prepare data for API
            const submitData = {
                // Personal info
                first_name: formData.first_name,
                middle_name: formData.middle_name,
                last_name: formData.last_name,
                extension: formData.extension,
                birthdate: formData.birthdate ? dayjs(formData.birthdate).format('YYYY-MM-DD') : null,
                gender_id: formData.gender_id,
                civil_status_id: formData.civil_status_id,

                // Address
                barangay_id: formData.barangay_id,
                house_number: formData.house_number,
                street: formData.street,

                // Contact
                mobile_number: formData.mobile_number,
                telephone_number: formData.telephone_number,
                email: formData.email,

                // Background
                educational_attainment_id: formData.educational_attainment_id,
                monthly_salary: formData.monthly_salary,
                occupation: formData.occupation,
                other_skills: formData.other_skills,

                // Family
                family_members: familyMembers.filter(m => m.first_name),

                // Associations
                target_sectors: formData.target_sectors || [],
                sub_categories: formData.sub_categories || [],

                // Registration type & assistant info
                registration_type: registrationType,
                assistant_first_name: registrationType === 'assisted' ? formData.assistant_first_name : null,
                assistant_middle_name: registrationType === 'assisted' ? (formData.assistant_middle_name || null) : null,
                assistant_last_name: registrationType === 'assisted' ? formData.assistant_last_name : null,
                assistant_extension: registrationType === 'assisted' ? (formData.assistant_extension || null) : null,
                assistant_relationship: registrationType === 'assisted' ? formData.assistant_relationship : null,
                assistant_contact: registrationType === 'assisted' ? formData.assistant_contact : null,
            };

            const response = await publicApi.apply(submitData);
            setReferenceNumber(response.data.reference_number);
            setSmsSent(response.data.sms_sent || false);
            setSubmitted(true);
            message.success('Application submitted successfully!');
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Failed to submit application. Please try again.';
            if (error.response?.status === 409) {
                setReferenceNumber(error.response.data.reference_number);
                message.warning(`You already have an application: ${error.response.data.reference_number}`);
            } else {
                message.error(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCheckStatus = async () => {
        if (!checkRef.trim()) {
            message.warning('Please enter your reference number');
            return;
        }
        setCheckLoading(true);
        setStatusData(null);
        try {
            const response = await publicApi.checkStatus(checkRef.trim());
            setStatusData(response.data.data);
        } catch (error) {
            if (error.response?.status === 404) {
                message.error('Application not found. Please check your reference number.');
            } else {
                message.error('Failed to check status');
            }
        } finally {
            setCheckLoading(false);
        }
    };

    // Status check view
    if (checkMode) {
        return (
            <div>
                <section style={{
                    background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
                    color: 'white',
                    padding: '60px 24px 80px',
                    textAlign: 'center',
                }}>
                    <div style={{ maxWidth: 800, margin: '0 auto' }}>
                        <Title level={1} style={{ color: 'white', marginBottom: 16 }}>Check Application Status</Title>
                        <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18 }}>
                            Enter your reference number to check the status of your application.
                        </Paragraph>
                    </div>
                </section>

                <section style={{ padding: '60px 24px', background: '#f9fafb' }}>
                    <div style={{ maxWidth: 600, margin: '0 auto' }}>
                        <Card style={{ borderRadius: 16 }}>
                            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                                <Input
                                    size="large"
                                    placeholder="Enter reference number (e.g., PRE-20260130-1234)"
                                    value={checkRef}
                                    onChange={(e) => setCheckRef(e.target.value)}
                                    onPressEnter={handleCheckStatus}
                                    style={{ borderRadius: 8 }}
                                />
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<SearchOutlined />}
                                    onClick={handleCheckStatus}
                                    loading={checkLoading}
                                    style={{ background: '#4338ca', borderRadius: 8 }}
                                >
                                    Check
                                </Button>
                            </div>

                            {statusData && (
                                <Card style={{ background: '#f9fafb', borderRadius: 12 }}>
                                    <Row gutter={[16, 16]}>
                                        <Col span={24}>
                                            <Text type="secondary">Reference Number</Text>
                                            <div><Text strong style={{ fontSize: 18, color: '#4338ca' }}>{statusData.reference_number}</Text></div>
                                        </Col>
                                        <Col span={24}>
                                            <Text type="secondary">Status</Text>
                                            <div>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '4px 12px',
                                                    borderRadius: 20,
                                                    background: statusData.status === 'approved' ? '#d1fae5' :
                                                        statusData.status === 'rejected' ? '#fee2e2' :
                                                        statusData.status === 'for_approval' ? '#dbeafe' : '#f3f4f6',
                                                    color: statusData.status === 'approved' ? '#059669' :
                                                        statusData.status === 'rejected' ? '#dc2626' :
                                                        statusData.status === 'for_approval' ? '#2563eb' : '#6b7280',
                                                    fontWeight: 600,
                                                }}>
                                                    {statusData.status_label}
                                                </span>
                                            </div>
                                        </Col>
                                        <Col xs={12}>
                                            <Text type="secondary">Applicant</Text>
                                            <div><Text strong>{statusData.applicant_name}</Text></div>
                                        </Col>
                                        <Col xs={12}>
                                            <Text type="secondary">Barangay</Text>
                                            <div><Text strong>{statusData.barangay || '-'}</Text></div>
                                        </Col>
                                    </Row>
                                </Card>
                            )}

                            <div style={{ marginTop: 24, textAlign: 'center' }}>
                                <Button onClick={() => setCheckMode(false)} style={{ borderRadius: 8 }}>
                                    ← Back to Application Form
                                </Button>
                            </div>
                        </Card>
                    </div>
                </section>
            </div>
        );
    }

    if (submitted) {
        return (
            <div style={{ padding: '80px 24px', minHeight: '80vh', background: '#f9fafb' }}>
                <div style={{ maxWidth: 600, margin: '0 auto' }}>
                    <Card style={{ borderRadius: 16, textAlign: 'center' }}>
                        <Result
                            status="success"
                            icon={<CheckCircleOutlined style={{ color: '#059669' }} />}
                            title="Application Submitted!"
                            subTitle={
                                <div>
                                    <Paragraph>Your pre-registration has been received. Please save your reference number:</Paragraph>
                                    <div style={{
                                        background: '#eef2ff',
                                        padding: '16px 24px',
                                        borderRadius: 12,
                                        margin: '16px 0',
                                    }}>
                                        <Text strong style={{ fontSize: 24, color: '#4338ca', letterSpacing: 2 }}>
                                            {referenceNumber}
                                        </Text>
                                    </div>
                                    <Paragraph type="secondary">
                                        Your application will be reviewed by the Admin. Visit the OSCA office with your documents to complete registration.
                                    </Paragraph>
                                    {smsSent && (
                                        <Paragraph style={{ color: '#059669', fontWeight: 500 }}>
                                            ✓ Reference number has been sent to your mobile number via SMS.
                                        </Paragraph>
                                    )}
                                </div>
                            }
                            extra={[
                                <Button
                                    key="check"
                                    type="primary"
                                    onClick={() => { setSubmitted(false); setCheckMode(true); setCheckRef(referenceNumber); }}
                                    style={{ background: '#4338ca', borderRadius: 8 }}
                                >
                                    Track Status
                                </Button>,
                                <Link to="/" key="home">
                                    <Button style={{ borderRadius: 8 }}>Back to Home</Button>
                                </Link>,
                            ]}
                        />
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Hero */}
            <section style={{
                background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
                color: 'white',
                padding: '60px 24px 80px',
                textAlign: 'center',
            }}>
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    <Title level={1} style={{ color: 'white', marginBottom: 16 }}>Pre-Registration</Title>
                    <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18 }}>
                        Pre-register for your Senior Citizen ID online. Complete this form and visit our office with your documents.
                    </Paragraph>
                    <Button
                        ghost
                        size="large"
                        onClick={() => setCheckMode(true)}
                        style={{ marginTop: 16, borderRadius: 8 }}
                    >
                        Already applied? Check your status →
                    </Button>
                </div>
            </section>

            {/* Form */}
            <section style={{ padding: '60px 24px', background: '#f9fafb' }}>
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    <Card style={{ borderRadius: 16 }}>
                        <Steps
                            current={currentStep}
                            items={steps.map(s => ({ title: s.title, icon: s.icon }))}
                            style={{ marginBottom: 40 }}
                            size="small"
                            responsive={false}
                        />

                        <Form
                            form={form}
                            layout="vertical"
                            initialValues={formData}
                            preserve={true}
                        >
                            {/* Step 0: Registration Type */}
                            {currentStep === 0 && (
                                <div>
                                    <Title level={4} style={{ color: '#1890ff', marginBottom: 8 }}>
                                        Who is filling out this form?
                                    </Title>
                                    <Paragraph type="secondary" style={{ marginBottom: 24 }}>
                                        Please select who is completing this pre-registration form.
                                    </Paragraph>

                                    <Row gutter={16} style={{ marginBottom: 24 }}>
                                        <Col xs={24} sm={12}>
                                            <Card
                                                hoverable
                                                onClick={() => setRegistrationType('self')}
                                                style={{
                                                    borderRadius: 12,
                                                    border: registrationType === 'self' ? '2px solid #4338ca' : '2px solid #e5e7eb',
                                                    background: registrationType === 'self' ? '#eef2ff' : '#fff',
                                                    textAlign: 'center',
                                                    padding: '16px 12px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <UserOutlined style={{ fontSize: 36, color: registrationType === 'self' ? '#4338ca' : '#9ca3af', marginBottom: 12 }} />
                                                <Title level={5} style={{ margin: 0, color: registrationType === 'self' ? '#4338ca' : undefined }}>
                                                    I am the Senior Citizen
                                                </Title>
                                                <Text type="secondary" style={{ fontSize: 13 }}>I am registering myself</Text>
                                            </Card>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Card
                                                hoverable
                                                onClick={() => setRegistrationType('assisted')}
                                                style={{
                                                    borderRadius: 12,
                                                    border: registrationType === 'assisted' ? '2px solid #4338ca' : '2px solid #e5e7eb',
                                                    background: registrationType === 'assisted' ? '#eef2ff' : '#fff',
                                                    textAlign: 'center',
                                                    padding: '16px 12px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <TeamOutlined style={{ fontSize: 36, color: registrationType === 'assisted' ? '#4338ca' : '#9ca3af', marginBottom: 12 }} />
                                                <Title level={5} style={{ margin: 0, color: registrationType === 'assisted' ? '#4338ca' : undefined }}>
                                                    I am assisting a Senior
                                                </Title>
                                                <Text type="secondary" style={{ fontSize: 13 }}>Family member, caregiver, etc.</Text>
                                            </Card>
                                        </Col>
                                    </Row>

                                    {registrationType === 'assisted' && (
                                        <Card style={{ background: '#f9fafb', borderRadius: 12, marginBottom: 24 }}>
                                            <Title level={5} style={{ color: '#4338ca', marginBottom: 16 }}>
                                                Assistant Information
                                            </Title>
                                            <Row gutter={16}>
                                                <Col xs={24} sm={8}>
                                                    <Form.Item
                                                        name="assistant_first_name"
                                                        label={<span>First Name <span style={{ color: '#fa8c16' }}>*</span></span>}
                                                        rules={[{ required: true, message: 'First name is required' }]}
                                                    >
                                                        <Input placeholder="First name" size="large" />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} sm={8}>
                                                    <Form.Item name="assistant_middle_name" label="Middle Name">
                                                        <Input placeholder="Middle name (optional)" size="large" />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} sm={8}>
                                                    <Form.Item
                                                        name="assistant_last_name"
                                                        label={<span>Last Name <span style={{ color: '#fa8c16' }}>*</span></span>}
                                                        rules={[{ required: true, message: 'Last name is required' }]}
                                                    >
                                                        <Input placeholder="Last name" size="large" />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                            <Row gutter={16}>
                                                <Col xs={24} sm={8}>
                                                    <Form.Item name="assistant_extension" label="Extension">
                                                        <Input placeholder="e.g. Jr., Sr., III" size="large" />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} sm={8}>
                                                    <Form.Item
                                                        name="assistant_relationship"
                                                        label={<span>Relationship to Senior <span style={{ color: '#fa8c16' }}>*</span></span>}
                                                        rules={[{ required: true, message: 'Relationship is required' }]}
                                                    >
                                                        {showRelOther ? (
                                                            <Input
                                                                placeholder="Type relationship"
                                                                size="large"
                                                                addonAfter={
                                                                    <a onClick={() => {
                                                                        setShowRelOther(false);
                                                                        form.setFieldsValue({ assistant_relationship: undefined });
                                                                    }}
                                                                        style={{ fontSize: 12 }}
                                                                    >Back</a>
                                                                }
                                                            />
                                                        ) : (
                                                            <Select
                                                                placeholder="Select relationship"
                                                                size="large"
                                                                onChange={(val) => {
                                                                    if (val === '__other__') {
                                                                        setShowRelOther(true);
                                                                        form.setFieldsValue({ assistant_relationship: '' });
                                                                    }
                                                                }}
                                                            >
                                                                <Option value="Son">Son</Option>
                                                                <Option value="Daughter">Daughter</Option>
                                                                <Option value="Grandchild">Grandchild</Option>
                                                                <Option value="Spouse">Spouse</Option>
                                                                <Option value="Nephew/Niece">Nephew/Niece</Option>
                                                                <Option value="Caregiver">Caregiver</Option>
                                                                <Option value="Social Worker">Social Worker</Option>
                                                                <Option value="Barangay Official">Barangay Official</Option>
                                                                <Option value="__other__">Other (specify)</Option>
                                                            </Select>
                                                        )}
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} sm={8}>
                                                    <Form.Item
                                                        name="assistant_contact"
                                                        label={<span>Contact Number <span style={{ color: '#fa8c16' }}>*</span></span>}
                                                        rules={[
                                                            { required: true, message: 'Contact number is required' },
                                                            { pattern: /^09\d{9}$/, message: 'Must be a valid PH number (09XXXXXXXXX)' },
                                                        ]}
                                                    >
                                                        <Input placeholder="09XX-XXX-XXXX" size="large" maxLength={11} />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                        </Card>
                                    )}

                                    {/* Data Privacy Notice */}
                                    <Card
                                        style={{
                                            background: '#f0f5ff',
                                            border: '1px solid #adc6ff',
                                            borderRadius: 12,
                                        }}
                                    >
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                                            <SafetyCertificateOutlined style={{ fontSize: 20, color: '#1d39c4' }} />
                                            <Title level={5} style={{ margin: 0, color: '#1d39c4' }}>Data Privacy Notice</Title>
                                        </div>
                                        <div style={{
                                            background: 'white',
                                            borderRadius: 8,
                                            padding: '12px 16px',
                                            marginBottom: 12,
                                            maxHeight: 300,
                                            overflowY: 'auto',
                                            fontSize: 13,
                                            lineHeight: 1.7,
                                            color: '#444',
                                            border: '1px solid #e8e8e8',
                                        }}>
                                            <p style={{ marginBottom: 8 }}>
                                                In compliance with <strong>Republic Act No. 10173</strong>, also known as the
                                                <strong> Data Privacy Act of 2012</strong>, the Office for Senior Citizens Affairs (OSCA)
                                                - Zamboanga City commits to protecting and respecting your personal data.
                                            </p>
                                            <p style={{ marginBottom: 8 }}>
                                                By proceeding with this application, you acknowledge and consent to the following:
                                            </p>
                                            <ul style={{ paddingLeft: 20, marginBottom: 8 }}>
                                                <li style={{ marginBottom: 4 }}>The personal information you provide, including but not limited to your name, birthdate, address, contact details, and family composition, will be <strong>collected, recorded, stored, processed, and used</strong> by OSCA for the purpose of processing your Senior Citizen ID application and providing government services and benefits.</li>
                                                <li style={{ marginBottom: 4 }}>Your data may be <strong>shared with authorized government agencies</strong> (e.g., DSWD, PhilHealth, LGU offices) strictly for the purpose of delivering senior citizen benefits and services as mandated by <strong>Republic Act No. 9994</strong> (Expanded Senior Citizens Act of 2010).</li>
                                                <li style={{ marginBottom: 4 }}>OSCA will implement <strong>reasonable and appropriate security measures</strong> to protect your personal data against unauthorized access, disclosure, or misuse.</li>
                                                <li style={{ marginBottom: 4 }}>You have the right to <strong>access, correct, and request deletion</strong> of your personal data by contacting the OSCA Main Office.</li>
                                            </ul>
                                            <p style={{ margin: 0, fontStyle: 'italic', color: '#666' }}>
                                                For concerns regarding your personal data, you may contact the OSCA Data Protection Officer at the City Hall, Zamboanga City.
                                            </p>
                                        </div>
                                        <Checkbox
                                            checked={privacyAgreed}
                                            onChange={(e) => setPrivacyAgreed(e.target.checked)}
                                            style={{ fontSize: 14 }}
                                        >
                                            <Text strong>I have read, understood, and agree to the Data Privacy Notice above.</Text>
                                        </Checkbox>
                                    </Card>
                                </div>
                            )}

                            {/* Step 1: Personal Information */}
                            {currentStep === 1 && (
                                <div>
                                    <Title level={4} style={{ color: '#1890ff', marginBottom: 16 }}>
                                        Personal Na Impormasyon
                                    </Title>

                                    <Row gutter={16}>
                                        <Col xs={24} sm={12}>
                                            <Form.Item
                                                name="first_name"
                                                label={<span>First Name <span style={{ color: '#fa8c16' }}>*</span></span>}
                                                rules={[{ required: true, message: 'First name is required' }]}
                                            >
                                                <Input placeholder="Enter first name" size="large" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Form.Item name="middle_name" label="Middle Name">
                                                <Input placeholder="Enter middle name" size="large" />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={16}>
                                        <Col xs={24} sm={12}>
                                            <Form.Item
                                                name="last_name"
                                                label={<span>Last Name <span style={{ color: '#fa8c16' }}>*</span></span>}
                                                rules={[{ required: true, message: 'Last name is required' }]}
                                            >
                                                <Input placeholder="Enter last name" size="large" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Form.Item name="extension" label="Extension">
                                                <Input placeholder="Jr., Sr., III, etc." size="large" />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={16}>
                                        <Col xs={24} sm={12}>
                                            <Form.Item
                                                name="house_number"
                                                label="House No."
                                            >
                                                <Input placeholder="House number" size="large" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Form.Item
                                                name="street"
                                                label="Street"
                                            >
                                                <Input placeholder="Street name" size="large" />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={16}>
                                        <Col xs={24} sm={12}>
                                            <Form.Item
                                                name="barangay_id"
                                                label={<span>Barangay <span style={{ color: '#fa8c16' }}>*</span></span>}
                                                rules={[{ required: true, message: 'Barangay is required' }]}
                                            >
                                                {loadingBarangays ? (
                                                    <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
                                                ) : (
                                                    <Select
                                                        placeholder="Select Barangay"
                                                        size="large"
                                                        showSearch
                                                        filterOption={(input, option) =>
                                                            option.children.toLowerCase().includes(input.toLowerCase())
                                                        }
                                                    >
                                                        {barangays.map((b) => (
                                                            <Option key={b.id} value={b.id}>
                                                                {b.name}
                                                            </Option>
                                                        ))}
                                                    </Select>
                                                )}
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Form.Item label="City, Province, Postal Code">
                                                <Input
                                                    value="Zamboanga City, Philippines, 7000"
                                                    disabled
                                                    size="large"
                                                    style={{ backgroundColor: '#f5f5f5', color: '#000' }}
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={16}>
                                        <Col xs={24} sm={12}>
                                            <Form.Item
                                                name="birthdate"
                                                label={<span>Date of Birth <span style={{ color: '#fa8c16' }}>*</span></span>}
                                                rules={[
                                                    { required: true, message: 'Birthdate is required' },
                                                    {
                                                        validator: (_, value) => {
                                                            if (value && dayjs().diff(value, 'year') < 60) {
                                                                return Promise.reject('Must be at least 60 years old');
                                                            }
                                                            return Promise.resolve();
                                                        },
                                                    },
                                                ]}
                                            >
                                                <DatePicker
                                                    size="large"
                                                    style={{ width: '100%' }}
                                                    placeholder="Select date (YYYY-MM-DD)"
                                                    format={['YYYY-MM-DD', 'MM/DD/YYYY']}
                                                    onChange={handleBirthdateChange}
                                                    showToday={false}
                                                    allowClear
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Form.Item label="Age">
                                                <Input
                                                    value={calculatedAge !== null ? `${calculatedAge} years old` : ''}
                                                    readOnly
                                                    size="large"
                                                    style={{ backgroundColor: '#f5f5f5' }}
                                                    placeholder="Calculated from birthdate"
                                                    suffix={calculatedAge !== null && getAgeCategory(calculatedAge) ? (
                                                        <Tag color={getAgeCategory(calculatedAge).color} style={{ marginRight: 0 }}>
                                                            {getAgeCategory(calculatedAge).label}
                                                        </Tag>
                                                    ) : null}
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={16}>
                                        <Col xs={24} sm={12}>
                                            <Form.Item
                                                name="gender_id"
                                                label={<span>Sex <span style={{ color: '#fa8c16' }}>*</span></span>}
                                                rules={[{ required: true, message: 'Sex is required' }]}
                                            >
                                                <Select placeholder="Select Sex" size="large">
                                                    {genders.map((g) => (
                                                        <Option key={g.id} value={g.id}>
                                                            {g.name}
                                                        </Option>
                                                    ))}
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Form.Item
                                                name="civil_status_id"
                                                label={<span>Civil Status <span style={{ color: '#fa8c16' }}>*</span></span>}
                                                rules={[{ required: true, message: 'Civil status is required' }]}
                                            >
                                                <Select placeholder="Select Civil Status" size="large" allowClear>
                                                    {civilStatuses.map((cs) => (
                                                        <Option key={cs.id} value={cs.id}>
                                                            {cs.name}
                                                        </Option>
                                                    ))}
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Divider />
                                    <Title level={4} style={{ color: '#1890ff', marginBottom: 16 }}>
                                        Contact &amp; Background Information
                                    </Title>

                                    <Row gutter={16}>
                                        <Col xs={24} sm={12}>
                                            <Form.Item
                                                name="mobile_number"
                                                label={<span>Mobile Number <span style={{ color: '#fa8c16' }}>*</span></span>}
                                                rules={[
                                                    { required: true, message: 'Mobile number is required for SMS notifications' },
                                                    { pattern: /^09\d{9}$/, message: 'Must be a valid PH mobile number (09XXXXXXXXX)' },
                                                ]}
                                            >
                                                <Input placeholder="09XX-XXX-XXXX" size="large" maxLength={11} />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Form.Item name="telephone_number" label="Telephone Number">
                                                <Input placeholder="(062) XXX-XXXX" size="large" />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={16}>
                                        <Col xs={24} sm={12}>
                                            <Form.Item
                                                name="email"
                                                label="Email"
                                                rules={[
                                                    { type: 'email', message: 'Please enter a valid email address' },
                                                ]}
                                            >
                                                <Input placeholder="email@example.com" size="large" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Form.Item name="educational_attainment_id" label="Educational Attainment">
                                                <Select placeholder="Select Educational Attainment" size="large" allowClear>
                                                    {educationalAttainments.map((ea) => (
                                                        <Option key={ea.id} value={ea.id}>
                                                            {ea.name}
                                                        </Option>
                                                    ))}
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Row gutter={16}>
                                        <Col xs={24} sm={12}>
                                            <Form.Item name="occupation" label="Occupation">
                                                <Input placeholder="Current or previous occupation" size="large" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Form.Item name="monthly_salary" label="Monthly Salary">
                                                <InputNumber
                                                    placeholder="0.00"
                                                    size="large"
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                    step={0.01}
                                                    formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                    parser={(value) => value.replace(/₱\s?|(,*)/g, '')}
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={16}>
                                        <Col xs={24} sm={12}>
                                            <Form.Item name="other_skills" label="Other Skills">
                                                <Input placeholder="Additional skills" size="large" />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </div>
                            )}

                            {/* Step 2: Family Composition */}
                            {currentStep === 2 && (
                                <div>
                                    <Title level={4} style={{ color: '#1890ff', marginBottom: 16 }}>
                                        Family Composition (Optional)
                                    </Title>
                                    <Paragraph type="secondary" style={{ marginBottom: 24 }}>
                                        Add members of your household if applicable.
                                    </Paragraph>

                                    {familyMembers.map((member, index) => (
                                        <Card
                                            key={member.id}
                                            size="small"
                                            style={{ marginBottom: 16, background: '#fafafa' }}
                                            extra={
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => removeFamilyMember(member.id)}
                                                />
                                            }
                                            title={`Family Member ${index + 1}`}
                                        >
                                            <Row gutter={12}>
                                                <Col xs={24} sm={12} md={6}>
                                                    <Form.Item
                                                        label={<span>First Name <span style={{ color: '#ff4d4f' }}>*</span></span>}
                                                        style={{ marginBottom: 8 }}
                                                    >
                                                        <Input
                                                            value={member.first_name}
                                                            onChange={(e) => updateFamilyMember(member.id, 'first_name', e.target.value)}
                                                            placeholder="First name"
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} sm={12} md={6}>
                                                    <Form.Item label="Middle Name" style={{ marginBottom: 8 }}>
                                                        <Input
                                                            value={member.middle_name}
                                                            onChange={(e) => updateFamilyMember(member.id, 'middle_name', e.target.value)}
                                                            placeholder="Middle name"
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} sm={12} md={6}>
                                                    <Form.Item
                                                        label={<span>Last Name <span style={{ color: '#ff4d4f' }}>*</span></span>}
                                                        style={{ marginBottom: 8 }}
                                                    >
                                                        <Input
                                                            value={member.last_name}
                                                            onChange={(e) => updateFamilyMember(member.id, 'last_name', e.target.value)}
                                                            placeholder="Last name"
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} sm={12} md={6}>
                                                    <Form.Item label="Extension" style={{ marginBottom: 8 }}>
                                                        <Input
                                                            value={member.extension}
                                                            onChange={(e) => updateFamilyMember(member.id, 'extension', e.target.value)}
                                                            placeholder="Jr., Sr."
                                                        />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                            <Row gutter={12}>
                                                <Col xs={24} sm={12} md={6}>
                                                    <Form.Item
                                                        label={<span>Relationship <span style={{ color: '#ff4d4f' }}>*</span></span>}
                                                        style={{ marginBottom: 8 }}
                                                    >
                                                        {member.relationship === '__other__' || (member.relationship && !['Spouse', 'Son', 'Daughter', 'Grandchild', 'Sibling', 'Parent', 'In-Law', 'Nephew/Niece'].includes(member.relationship)) ? (
                                                            <Input
                                                                value={member.relationship === '__other__' ? '' : member.relationship}
                                                                onChange={(e) => updateFamilyMember(member.id, 'relationship', e.target.value)}
                                                                placeholder="Specify relationship"
                                                                addonAfter={
                                                                    <a onClick={() => updateFamilyMember(member.id, 'relationship', '')}
                                                                        style={{ fontSize: 12 }}
                                                                    >Back</a>
                                                                }
                                                            />
                                                        ) : (
                                                            <Select
                                                                value={member.relationship || undefined}
                                                                onChange={(val) => updateFamilyMember(member.id, 'relationship', val)}
                                                                placeholder="Select"
                                                            >
                                                                <Option value="Spouse">Spouse</Option>
                                                                <Option value="Son">Son</Option>
                                                                <Option value="Daughter">Daughter</Option>
                                                                <Option value="Grandchild">Grandchild</Option>
                                                                <Option value="Sibling">Sibling</Option>
                                                                <Option value="Parent">Parent</Option>
                                                                <Option value="In-Law">In-Law</Option>
                                                                <Option value="Nephew/Niece">Nephew/Niece</Option>
                                                                <Option value="__other__">Other (specify)</Option>
                                                            </Select>
                                                        )}
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} sm={12} md={6}>
                                                    <Form.Item label="Date of Birth" style={{ marginBottom: 8 }}>
                                                        <DatePicker
                                                            value={member.birthdate ? dayjs(member.birthdate) : null}
                                                            onChange={(date) => updateFamilyMember(member.id, 'birthdate', date ? date.format('YYYY-MM-DD') : null)}
                                                            style={{ width: '100%' }}
                                                            placeholder="YYYY-MM-DD"
                                                            format={['YYYY-MM-DD', 'MM/DD/YYYY']}
                                                            allowClear
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} sm={12} md={6}>
                                                    <Form.Item label="Age" style={{ marginBottom: 8 }}>
                                                        <Input
                                                            value={member.age !== '' && member.age !== null ? `${member.age}` : ''}
                                                            readOnly
                                                            placeholder="From birthdate"
                                                            style={{ backgroundColor: '#f5f5f5' }}
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} sm={12} md={6}>
                                                    <Form.Item label="Monthly Salary" style={{ marginBottom: 8 }}>
                                                        <InputNumber
                                                            value={member.monthly_salary}
                                                            onChange={(value) => updateFamilyMember(member.id, 'monthly_salary', value)}
                                                            placeholder="0.00"
                                                            min={0}
                                                            style={{ width: '100%' }}
                                                        />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                            <Row gutter={12}>
                                                <Col xs={24} sm={12} md={6}>
                                                    <Form.Item label="Mobile Number" style={{ marginBottom: 8 }}>
                                                        <Input
                                                            value={member.mobile_number}
                                                            onChange={(e) => updateFamilyMember(member.id, 'mobile_number', e.target.value)}
                                                            placeholder="09XXXXXXXXX"
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} sm={12} md={6}>
                                                    <Form.Item label="Telephone Number" style={{ marginBottom: 8 }}>
                                                        <Input
                                                            value={member.telephone_number}
                                                            onChange={(e) => updateFamilyMember(member.id, 'telephone_number', e.target.value)}
                                                            placeholder="(062) XXX-XXXX"
                                                        />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} sm={12} md={6}>
                                                    <Form.Item label="Email" style={{ marginBottom: 8 }}>
                                                        <Input
                                                            value={member.email}
                                                            onChange={(e) => updateFamilyMember(member.id, 'email', e.target.value)}
                                                            placeholder="email@example.com"
                                                        />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                        </Card>
                                    ))}

                                    <Button
                                        type="dashed"
                                        onClick={addFamilyMember}
                                        icon={<PlusOutlined />}
                                        style={{ width: '100%', marginTop: 8 }}
                                    >
                                        Add Family Member
                                    </Button>
                                </div>
                            )}

                            {/* Step 3: Association / Target Sectors */}
                            {currentStep === 3 && (
                                <div>
                                    <Title level={4} style={{ color: '#1890ff', marginBottom: 16 }}>
                                        Association / Target Sectors (Optional)
                                    </Title>

                                    <Form.Item
                                        name="target_sectors"
                                        label="Target Sectors"
                                    >
                                        <Select
                                            mode="multiple"
                                            placeholder="Select applicable sectors"
                                            size="large"
                                            allowClear
                                        >
                                            {targetSectors.map((ts) => (
                                                <Option key={ts.value} value={ts.value}>
                                                    {ts.label} {ts.description && `- ${ts.description}`}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>

                                    <Form.Item
                                        name="sub_categories"
                                        label="Sub Categories"
                                    >
                                        <Select
                                            mode="multiple"
                                            placeholder="Select applicable sub-categories"
                                            size="large"
                                            allowClear
                                        >
                                            {subCategories.map((sc) => (
                                                <Option key={sc.value} value={sc.value}>
                                                    {sc.label}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </div>
                            )}

                            {/* Step 4: Review */}
                            {currentStep === 4 && (
                                <div>
                                    <Title level={4} style={{ marginBottom: 24 }}>Review Your Information</Title>

                                    {/* Registration Type + Assistant Info */}
                                    <Card style={{ background: '#f9fafb', borderRadius: 12, marginBottom: 16 }}>
                                        <Title level={5} style={{ color: '#1890ff', marginBottom: 12 }}>Registration Type</Title>
                                        <Row gutter={[16, 8]}>
                                            <Col xs={24}>
                                                <Text type="secondary">Filled Out By</Text>
                                                <div><Text strong>{registrationType === 'self' ? 'Self (Senior Citizen)' : 'Assisted by someone'}</Text></div>
                                            </Col>
                                            {registrationType === 'assisted' && (
                                                <>
                                                    <Col xs={24}>
                                                        <Text type="secondary">Assistant Name</Text>
                                                        <div><Text strong>{`${formData.assistant_first_name || ''} ${formData.assistant_middle_name || ''} ${formData.assistant_last_name || ''} ${formData.assistant_extension || ''}`.trim() || '-'}</Text></div>
                                                    </Col>
                                                    <Col xs={12}>
                                                        <Text type="secondary">Relationship</Text>
                                                        <div><Text strong>{formData.assistant_relationship || '-'}</Text></div>
                                                    </Col>
                                                    <Col xs={12}>
                                                        <Text type="secondary">Contact Number</Text>
                                                        <div><Text strong>{formData.assistant_contact || '-'}</Text></div>
                                                    </Col>
                                                </>
                                            )}
                                        </Row>
                                    </Card>

                                    <Card style={{ background: '#f9fafb', borderRadius: 12, marginBottom: 24 }}>
                                        <Title level={5} style={{ color: '#1890ff', marginBottom: 12 }}>Personal Information</Title>
                                        <Row gutter={[16, 8]}>
                                            <Col xs={24}>
                                                <Text type="secondary">Full Name</Text>
                                                <div><Text strong>{`${formData.first_name || ''} ${formData.middle_name || ''} ${formData.last_name || ''} ${formData.extension || ''}`.trim() || '-'}</Text></div>
                                            </Col>
                                            <Col xs={12}>
                                                <Text type="secondary">Birthdate</Text>
                                                <div><Text strong>{formData.birthdate ? dayjs(formData.birthdate).format('MMMM D, YYYY') : '-'}</Text></div>
                                            </Col>
                                            <Col xs={12}>
                                                <Text type="secondary">Age</Text>
                                                <div><Text strong>{calculatedAge ? `${calculatedAge} years old` : '-'}</Text></div>
                                            </Col>
                                            <Col xs={12}>
                                                <Text type="secondary">Sex</Text>
                                                <div><Text strong>{genders.find(g => g.id === formData.gender_id)?.name || '-'}</Text></div>
                                            </Col>
                                            <Col xs={12}>
                                                <Text type="secondary">Civil Status</Text>
                                                <div><Text strong>{civilStatuses.find(cs => cs.id === formData.civil_status_id)?.name || '-'}</Text></div>
                                            </Col>
                                        </Row>

                                        <Divider style={{ margin: '16px 0' }} />
                                        <Title level={5} style={{ color: '#1890ff', marginBottom: 12 }}>Contact & Background</Title>
                                        <Row gutter={[16, 8]}>
                                            <Col xs={24}>
                                                <Text type="secondary">Address</Text>
                                                <div><Text strong>{`${formData.house_number || ''} ${formData.street || ''}, ${barangays.find(b => b.id === formData.barangay_id)?.name || ''}, Zamboanga City`.replace(/^\s*,/, '')}</Text></div>
                                            </Col>
                                            <Col xs={12}>
                                                <Text type="secondary">Mobile Number</Text>
                                                <div><Text strong>{formData.mobile_number || '-'}</Text></div>
                                            </Col>
                                            <Col xs={12}>
                                                <Text type="secondary">Telephone Number</Text>
                                                <div><Text strong>{formData.telephone_number || '-'}</Text></div>
                                            </Col>
                                            <Col xs={12}>
                                                <Text type="secondary">Educational Attainment</Text>
                                                <div><Text strong>{educationalAttainments.find(ea => ea.id === formData.educational_attainment_id)?.name || '-'}</Text></div>
                                            </Col>
                                            <Col xs={12}>
                                                <Text type="secondary">Monthly Salary</Text>
                                                <div><Text strong>{formData.monthly_salary ? `₱${Number(formData.monthly_salary).toLocaleString()}` : '-'}</Text></div>
                                            </Col>
                                            <Col xs={12}>
                                                <Text type="secondary">Occupation</Text>
                                                <div><Text strong>{formData.occupation || '-'}</Text></div>
                                            </Col>
                                            <Col xs={12}>
                                                <Text type="secondary">Other Skills</Text>
                                                <div><Text strong>{formData.other_skills || '-'}</Text></div>
                                            </Col>
                                        </Row>

                                        {familyMembers.filter(m => m.first_name).length > 0 && (
                                            <>
                                                <Divider style={{ margin: '16px 0' }} />
                                                <Title level={5} style={{ color: '#1890ff', marginBottom: 12 }}>Family Composition</Title>
                                                {familyMembers.filter(m => m.first_name).map((m, i) => (
                                                    <Card key={m.id} size="small" style={{ marginBottom: 8, background: '#fff' }}>
                                                        <Row gutter={[16, 4]}>
                                                            <Col xs={12}>
                                                                <Text type="secondary">Name</Text>
                                                                <div><Text strong>{`${m.first_name} ${m.middle_name || ''} ${m.last_name || ''} ${m.extension || ''}`.trim()}</Text></div>
                                                            </Col>
                                                            <Col xs={12}>
                                                                <Text type="secondary">Relationship</Text>
                                                                <div><Text strong>{m.relationship || '-'}</Text></div>
                                                            </Col>
                                                            <Col xs={12}>
                                                                <Text type="secondary">Age</Text>
                                                                <div><Text strong>{m.age || '-'}</Text></div>
                                                            </Col>
                                                            <Col xs={12}>
                                                                <Text type="secondary">Monthly Salary</Text>
                                                                <div><Text strong>{m.monthly_salary ? `₱${Number(m.monthly_salary).toLocaleString()}` : '-'}</Text></div>
                                                            </Col>
                                                        </Row>
                                                    </Card>
                                                ))}
                                            </>
                                        )}

                                        {(formData.target_sectors?.length > 0 || formData.sub_categories?.length > 0) && (
                                            <>
                                                <Divider style={{ margin: '16px 0' }} />
                                                <Title level={5} style={{ color: '#1890ff', marginBottom: 12 }}>Association</Title>
                                                <Row gutter={[16, 8]}>
                                                    {formData.target_sectors?.length > 0 && (
                                                        <Col span={24}>
                                                            <Text type="secondary">Target Sectors</Text>
                                                            <div style={{ marginTop: 4 }}>{formData.target_sectors.map((s, i) => (
                                                                <span key={i} style={{
                                                                    display: 'inline-block',
                                                                    background: '#dbeafe',
                                                                    color: '#2563eb',
                                                                    padding: '2px 10px',
                                                                    borderRadius: 12,
                                                                    marginRight: 6,
                                                                    marginBottom: 4,
                                                                    fontSize: 13,
                                                                }}>{s}</span>
                                                            ))}</div>
                                                        </Col>
                                                    )}
                                                    {formData.sub_categories?.length > 0 && (
                                                        <Col span={24}>
                                                            <Text type="secondary">Sub-Categories</Text>
                                                            <div style={{ marginTop: 4 }}>{formData.sub_categories.map((s, i) => (
                                                                <span key={i} style={{
                                                                    display: 'inline-block',
                                                                    background: '#dcfce7',
                                                                    color: '#16a34a',
                                                                    padding: '2px 10px',
                                                                    borderRadius: 12,
                                                                    marginRight: 6,
                                                                    marginBottom: 4,
                                                                    fontSize: 13,
                                                                }}>{s}</span>
                                                            ))}</div>
                                                        </Col>
                                                    )}
                                                </Row>
                                            </>
                                        )}
                                    </Card>
                                    <Card style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 12 }}>
                                        <Text>
                                            <strong>Important:</strong> After submitting this form, please note that you are NOT YET officially registered with OSCA. Online submission is only the initial step of the application process. To complete your registration, you must personally visit the nearest OSCA office and bring the following required documents:
                                            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                                                <li>Birth Certificate (PSA/NSO)</li>
                                                <li>Barangay Certificate</li>
                                                <li>Valid Government ID</li>
                                                <li>1x1 or 2x2 Photo</li>
                                            </ul>
                                        </Text>
                                    </Card>
                                </div>
                            )}

                            {/* Navigation */}
                            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
                                {currentStep > 0 ? (
                                    <Button size="large" onClick={handlePrev} style={{ borderRadius: 8 }}>
                                        <ArrowLeftOutlined /> Previous
                                    </Button>
                                ) : <div />}
                                {currentStep < steps.length - 1 ? (
                                    <Button
                                        type="primary"
                                        size="large"
                                        onClick={handleNext}
                                        disabled={currentStep === 0 && (!registrationType || !privacyAgreed)}
                                        style={{ background: (currentStep === 0 && (!registrationType || !privacyAgreed)) ? undefined : '#4338ca', borderRadius: 8 }}
                                    >
                                        Next <ArrowRightOutlined />
                                    </Button>
                                ) : (
                                    <Button
                                        type="primary"
                                        size="large"
                                        onClick={handleSubmit}
                                        loading={loading}
                                        style={{ background: '#059669', borderRadius: 8 }}
                                    >
                                        Submit Application
                                    </Button>
                                )}
                            </div>
                        </Form>
                    </Card>
                </div>
            </section >
        </div >
    );
};

export default Apply;
