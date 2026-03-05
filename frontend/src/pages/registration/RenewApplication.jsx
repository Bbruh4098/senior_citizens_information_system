import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Card,
    Form,
    Input,
    Select,
    DatePicker,
    Button,
    Row,
    Col,
    Typography,
    Divider,
    Alert,
    Upload,
    message,
    Spin,
    Descriptions,
    Result,
    Space,
    InputNumber,
    Checkbox,
    Image,
    Tag,
} from 'antd';
import {
    UserOutlined,
    SearchOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    ArrowLeftOutlined,
    SaveOutlined,
    UploadOutlined,
    DeleteOutlined,
    EyeOutlined,
    IdcardOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { renewalApi, registrationApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const RenewApplication = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [lookupOptions, setLookupOptions] = useState(null);
    const [barangays, setBarangays] = useState([]);
    const [submitResult, setSubmitResult] = useState(null);
    const [calculatedAge, setCalculatedAge] = useState(null);

    // Age category helper
    const getAgeCategory = (age) => {
        if (age >= 100) return { label: 'Centenarian', color: 'gold' };
        if (age >= 90) return { label: 'Nonagenarian', color: 'purple' };
        if (age >= 80) return { label: 'Octogenarian', color: 'blue' };
        if (age >= 70) return { label: 'Septuagenarian', color: 'cyan' };
        if (age >= 60) return { label: 'Sexagenarian', color: 'green' };
        return null;
    };

    // Senior search state
    const [oscaIdInput, setOscaIdInput] = useState('');
    const [seniorData, setSeniorData] = useState(null);
    const [searchError, setSearchError] = useState(null);
    const [searching, setSearching] = useState(false);

    // Edit mode state
    const [isEditMode, setIsEditMode] = useState(false);
    const [editApplicationId, setEditApplicationId] = useState(null);
    const [applicationNumber, setApplicationNumber] = useState(null);
    const [uploadedDocuments, setUploadedDocuments] = useState([]);
    const [documentUploading, setDocumentUploading] = useState({});
    const [previewImage, setPreviewImage] = useState(null);

    // Renewal checkboxes
    const [oldIdSurrendered, setOldIdSurrendered] = useState(false);
    const [verifiedReady, setVerifiedReady] = useState(false);

    // Load lookup options on mount
    useEffect(() => {
        loadLookupOptions();
        loadBarangays();
    }, []);

    // Check for edit mode and load existing application
    useEffect(() => {
        const editId = searchParams.get('edit');
        if (editId) {
            setIsEditMode(true);
            setEditApplicationId(editId);
            loadApplicationData(editId);
        }
    }, [searchParams]);

    const loadApplicationData = async (id) => {
        try {
            setLoading(true);
            const response = await renewalApi.getById(id);
            const application = response.data.data;

            if (!application.is_editable) {
                message.error('This application cannot be edited');
                navigate('/admin/applications');
                return;
            }

            setApplicationNumber(application.application_number);

            // Parse applicant_data and pre-fill form
            const data = application.applicant_data;
            if (data) {
                const personal = data.personal_info || {};
                const contact = data.contact_info || {};
                const background = data.background_info || {};
                const renewal = data.renewal_info || {};

                // Set form values
                form.setFieldsValue({
                    first_name: personal.first_name,
                    middle_name: personal.middle_name,
                    last_name: personal.last_name,
                    extension: personal.extension,
                    birthdate: personal.birthdate ? dayjs(personal.birthdate) : null,
                    gender_id: personal.gender_id,
                    barangay_id: personal.barangay_id,
                    house_number: contact.house_number,
                    street: contact.street,
                    mobile_number: contact.mobile_number,
                    telephone_number: contact.telephone_number,
                    educational_attainment_id: background.educational_attainment_id,
                    monthly_salary: background.monthly_salary,
                    occupation: background.occupation,
                    other_skills: background.other_skills,
                });

                // Set renewal info
                setOldIdSurrendered(renewal.old_id_surrendered || false);
                setVerifiedReady(renewal.verified_ready || false);

                // Set senior data for display
                setSeniorData({
                    id: application.senior_id,
                    osca_id: renewal.original_osca_id,
                    registration_date: renewal.original_registration_date,
                });

                // Calculate age if birthdate exists
                if (personal.birthdate) {
                    calculateAge(dayjs(personal.birthdate));
                }
            }

            // Load uploaded documents
            try {
                const docsResponse = await renewalApi.getDocuments(id);
                setUploadedDocuments(docsResponse.data.data || []);
            } catch (e) {
                console.error('Failed to load documents:', e);
            }

        } catch (error) {
            console.error('Failed to load application:', error);
            message.error('Failed to load application data');
            navigate('/admin/registration/list');
        } finally {
            setLoading(false);
        }
    };

    const loadLookupOptions = async () => {
        try {
            setLoading(true);
            const response = await registrationApi.getLookupOptions();
            setLookupOptions(response.data.data);
        } catch (error) {
            message.error('Failed to load form options');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadBarangays = async () => {
        try {
            const response = await registrationApi.getBarangays();
            setBarangays(response.data.data);
        } catch (error) {
            console.error('Failed to load barangays:', error);
        }
    };

    // Search for senior by OSCA ID
    const handleSearchSenior = async () => {
        if (!oscaIdInput.trim()) {
            message.warning('Please enter an OSCA ID to search');
            return;
        }

        try {
            setSearching(true);
            setSearchError(null);
            setSeniorData(null);

            const response = await renewalApi.searchByOscaId(oscaIdInput.trim());

            if (response.data.success) {
                const senior = response.data.data;
                setSeniorData(senior);

                // Pre-fill form with senior data
                form.setFieldsValue({
                    first_name: senior.first_name,
                    middle_name: senior.middle_name,
                    last_name: senior.last_name,
                    extension: senior.extension,
                    birthdate: senior.birthdate ? dayjs(senior.birthdate) : null,
                    gender_id: senior.gender_id,
                    civil_status_id: senior.civil_status_id,
                    barangay_id: senior.barangay_id,
                    house_number: senior.contact?.house_number,
                    street: senior.contact?.street,
                    mobile_number: senior.contact?.mobile_number,
                    telephone_number: senior.contact?.telephone_number,
                    email: senior.contact?.email,
                    educational_attainment_id: senior.educational_attainment_id,
                    monthly_salary: senior.monthly_salary,
                    occupation: senior.occupation,
                    other_skills: senior.other_skills,
                });

                setCalculatedAge(senior.age);
                message.success('Senior citizen found! Review and update the information below.');
            }
        } catch (error) {
            console.error('Search error:', error);
            setSearchError(error.response?.data?.message || 'Failed to search for senior citizen');

            // Show existing application info if there's one pending
            if (error.response?.data?.existing_application) {
                const existing = error.response.data.existing_application;
                setSearchError(
                    `${error.response.data.message} (${existing.application_number} - Status: ${existing.status})`
                );
            }
        } finally {
            setSearching(false);
        }
    };

    // Document type IDs for renewal: 1=Birth Cert, 2=Barangay Cert, 4=Photo, 5=Old ID
    const documentTypes = {
        5: { name: 'Photocopy of Old Senior Citizen ID Card', required: true },
        2: { name: 'Original Barangay Certification', required: true },
        1: { name: 'Birth Certificate / ID with Date of Birth', required: true },
        4: { name: 'Senior Citizen Recent Picture (2x2)', required: true },
    };

    // Get document by type from uploadedDocuments
    const getDocumentByType = (typeId) => {
        return uploadedDocuments.find(doc => parseInt(doc.document_type_id) === typeId);
    };

    // Handle document upload
    const handleDocumentUpload = async (file, documentTypeId) => {
        let appId = editApplicationId;

        // If no application exists yet, create a draft first
        if (!appId) {
            if (!seniorData) {
                message.warning('Please search for a senior citizen first.');
                return false;
            }

            const formValues = form.getFieldsValue();

            // Check minimum required fields
            if (!formValues.first_name || !formValues.last_name || !formValues.birthdate || !formValues.gender_id || !formValues.barangay_id) {
                message.warning('Please fill in the required personal information before uploading documents.');
                return false;
            }

            try {
                setDocumentUploading(prev => ({ ...prev, [documentTypeId]: true }));
                message.loading({ content: 'Creating renewal application...', key: 'docUpload' });

                const submitData = {
                    senior_id: seniorData.id,
                    first_name: formValues.first_name,
                    middle_name: formValues.middle_name,
                    last_name: formValues.last_name,
                    extension: formValues.extension,
                    birthdate: formValues.birthdate?.format?.('YYYY-MM-DD') || formValues.birthdate,
                    gender_id: formValues.gender_id,
                    civil_status_id: formValues.civil_status_id,
                    barangay_id: formValues.barangay_id,
                    house_number: formValues.house_number,
                    street: formValues.street,
                    mobile_number: formValues.mobile_number,
                    telephone_number: formValues.telephone_number,
                    email: formValues.email,
                    educational_attainment_id: formValues.educational_attainment_id,
                    monthly_salary: formValues.monthly_salary,
                    occupation: formValues.occupation,
                    other_skills: formValues.other_skills,
                    old_id_surrendered: oldIdSurrendered,
                    verified_ready: verifiedReady,
                    save_as_draft: true,
                };

                const response = await renewalApi.submitNew(submitData);
                appId = response.data.data.application_id;
                setEditApplicationId(appId);
                setApplicationNumber(response.data.data.application_number);
                setIsEditMode(true);
            } catch (error) {
                message.error({ content: 'Failed to create application. Please try again.', key: 'docUpload' });
                setDocumentUploading(prev => ({ ...prev, [documentTypeId]: false }));
                return false;
            }
        }

        // Now upload the document
        try {
            setDocumentUploading(prev => ({ ...prev, [documentTypeId]: true }));
            message.loading({ content: 'Uploading document...', key: 'docUpload' });

            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            uploadFormData.append('application_id', appId);
            uploadFormData.append('document_type_id', documentTypeId);

            const response = await renewalApi.uploadDocument(uploadFormData);

            if (response.data.success) {
                const newDoc = {
                    ...response.data.data,
                    document_type_id: parseInt(response.data.data.document_type_id)
                };

                setUploadedDocuments(prev => {
                    const filtered = prev.filter(d => parseInt(d.document_type_id) !== documentTypeId);
                    return [...filtered, newDoc];
                });
                message.success({ content: 'Document uploaded successfully!', key: 'docUpload' });
            }
        } catch (error) {
            console.error('Upload failed:', error);
            message.error({ content: 'Failed to upload document. Please try again.', key: 'docUpload' });
        } finally {
            setDocumentUploading(prev => ({ ...prev, [documentTypeId]: false }));
        }

        return false;
    };

    // Handle document deletion
    const handleDocumentDelete = async (documentId, documentTypeId) => {
        try {
            setDocumentUploading(prev => ({ ...prev, [documentTypeId]: true }));
            await renewalApi.deleteDocument(documentId);
            setUploadedDocuments(prev => prev.filter(d => d.id !== documentId));
            message.success('Document removed successfully');
        } catch (error) {
            message.error('Failed to remove document');
        } finally {
            setDocumentUploading(prev => ({ ...prev, [documentTypeId]: false }));
        }
    };

    // Handle document preview
    const handlePreviewDocument = (filePath) => {
        if (!filePath) return;
        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
        setPreviewImage(`${baseUrl}/storage/${filePath}`);
    };

    // Calculate age from birthdate
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

    const handleBirthdateChange = (date) => {
        calculateAge(date);
        form.setFieldValue('birthdate', date);
    };

    const handleSubmit = async (saveAsDraft = false) => {
        if (!seniorData) {
            message.error('Please search for a senior citizen first.');
            return;
        }

        try {
            const formValues = form.getFieldsValue();

            // Check required fields
            const missingFields = [];
            if (!formValues.first_name) missingFields.push('First Name');
            if (!formValues.last_name) missingFields.push('Last Name');
            if (!formValues.birthdate) missingFields.push('Date of Birth');
            if (!formValues.gender_id) missingFields.push('Sex');
            if (!formValues.barangay_id) missingFields.push('Barangay');

            if (missingFields.length > 0) {
                message.error(`Please fill in required fields: ${missingFields.join(', ')}`);
                return;
            }

            // Document validation for full submission
            if (!saveAsDraft) {
                const hasOldId = uploadedDocuments.some(doc => parseInt(doc.document_type_id) === 5);
                const hasBarangayCert = uploadedDocuments.some(doc => parseInt(doc.document_type_id) === 2);
                const hasBirthCert = uploadedDocuments.some(doc => parseInt(doc.document_type_id) === 1);
                const hasPhoto = uploadedDocuments.some(doc => parseInt(doc.document_type_id) === 4);

                const missingDocs = [];
                if (!hasOldId) missingDocs.push('Photocopy of Old SC ID Card');
                if (!hasBarangayCert) missingDocs.push('Barangay Certification');
                if (!hasBirthCert) missingDocs.push('Birth Certificate / ID with DOB');
                if (!hasPhoto) missingDocs.push('Senior Picture (2x2)');

                if (missingDocs.length > 0) {
                    message.error(`Please upload required documents: ${missingDocs.join(', ')}`);
                    return;
                }

                if (!oldIdSurrendered) {
                    message.error('Please confirm that the old ID card has been surrendered.');
                    return;
                }

                if (!verifiedReady) {
                    message.error('Please certify that the information is verified and ready for processing.');
                    return;
                }
            }

            setSubmitting(true);

            const submitData = {
                senior_id: seniorData.id,
                first_name: formValues.first_name,
                middle_name: formValues.middle_name,
                last_name: formValues.last_name,
                extension: formValues.extension,
                birthdate: formValues.birthdate?.format?.('YYYY-MM-DD') || formValues.birthdate,
                gender_id: formValues.gender_id,
                civil_status_id: formValues.civil_status_id,
                barangay_id: formValues.barangay_id,
                house_number: formValues.house_number,
                street: formValues.street,
                mobile_number: formValues.mobile_number,
                telephone_number: formValues.telephone_number,
                email: formValues.email,
                educational_attainment_id: formValues.educational_attainment_id,
                monthly_salary: formValues.monthly_salary,
                occupation: formValues.occupation,
                other_skills: formValues.other_skills,
                old_id_surrendered: oldIdSurrendered,
                verified_ready: verifiedReady,
                save_as_draft: saveAsDraft,
            };

            let response;
            if (isEditMode && editApplicationId) {
                response = await renewalApi.update(editApplicationId, submitData);
            } else {
                response = await renewalApi.submitNew(submitData);
            }

            if (response.data.success) {
                setSubmitResult({
                    success: true,
                    applicationNumber: response.data.data.application_number,
                    status: response.data.data.status,
                    isDraft: saveAsDraft,
                });
            }
        } catch (error) {
            console.error('Submission error:', error);
            const errorMsg = error.response?.data?.message || 'Failed to submit renewal application';
            message.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    // Show success result
    if (submitResult) {
        return (
            <Card>
                <Result
                    status="success"
                    icon={<CheckCircleOutlined style={{ color: submitResult.isDraft ? '#faad14' : '#52c41a' }} />}
                    title={submitResult.isDraft ? 'Renewal Saved as Draft' : 'Renewal Application Submitted!'}
                    subTitle={
                        <>
                            <Paragraph>
                                Application Number: <Text strong>{submitResult.applicationNumber}</Text>
                            </Paragraph>
                            <Paragraph>Status: <Text strong>{submitResult.status}</Text></Paragraph>
                        </>
                    }
                    extra={[
                        <Button
                            key="list"
                            type="primary"
                            onClick={() => navigate('/admin/registration/list')}
                        >
                            View Applications
                        </Button>,
                        <Button key="another" onClick={() => window.location.reload()}>
                            Submit Another Renewal
                        </Button>,
                    ]}
                />
            </Card>
        );
    }

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>Loading...</div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <Card
                title={
                    <Space>
                        <IdcardOutlined />
                        <span>{isEditMode ? `Edit Renewal: ${applicationNumber}` : 'Renew Senior Citizen ID'}</span>
                    </Space>
                }
                extra={
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                        Back
                    </Button>
                }
            >
                {/* OSCA ID Search Section */}
                {!isEditMode && (
                    <Card
                        type="inner"
                        title={<><SearchOutlined /> Search Senior Citizen by OSCA ID</>}
                        style={{ marginBottom: 24 }}
                    >
                        <Row gutter={16} align="middle">
                            <Col flex="auto">
                                <Input
                                    size="large"
                                    placeholder="Enter OSCA ID (e.g., ZC-2024-000001)"
                                    value={oscaIdInput}
                                    onChange={(e) => setOscaIdInput(e.target.value)}
                                    onPressEnter={handleSearchSenior}
                                    prefix={<IdcardOutlined />}
                                />
                            </Col>
                            <Col>
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<SearchOutlined />}
                                    loading={searching}
                                    onClick={handleSearchSenior}
                                >
                                    Search
                                </Button>
                            </Col>
                        </Row>

                        {searchError && (
                            <Alert
                                style={{ marginTop: 16 }}
                                message="Search Error"
                                description={searchError}
                                type="error"
                                showIcon
                            />
                        )}
                    </Card>
                )}

                {/* Senior Data Display */}
                {seniorData && (
                    <Card
                        type="inner"
                        title={<><UserOutlined /> Senior Citizen Information</>}
                        style={{ marginBottom: 24 }}
                    >
                        <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 4 }}>
                            <Descriptions.Item label="OSCA ID">
                                <Text strong style={{ color: '#1890ff' }}>{seniorData.osca_id}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Full Name">
                                {seniorData.full_name || `${seniorData.first_name} ${seniorData.middle_name || ''} ${seniorData.last_name}`.trim()}
                            </Descriptions.Item>
                            <Descriptions.Item label="Age">
                                <span style={{ whiteSpace: 'nowrap' }}>
                                    {seniorData.age || calculatedAge} yrs old
                                </span>
                            </Descriptions.Item>
                            <Descriptions.Item label="Category">
                                {(() => {
                                    const age = seniorData.age || calculatedAge;
                                    const cat = age ? getAgeCategory(age) : null;
                                    return cat ? <Tag color={cat.color}>{cat.label}</Tag> : <Text type="secondary">—</Text>;
                                })()}
                            </Descriptions.Item>
                            <Descriptions.Item label="Sex">
                                {seniorData.gender?.name || (seniorData.gender_id === 1 ? 'Male' : seniorData.gender_id === 2 ? 'Female' : '-')}
                            </Descriptions.Item>
                            <Descriptions.Item label="Civil Status">
                                {seniorData.civil_status?.name || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Barangay">
                                {seniorData.barangay}
                            </Descriptions.Item>
                            <Descriptions.Item label="Registration Date">
                                <Text strong>
                                    {seniorData.registration_date
                                        ? dayjs(seniorData.registration_date).format('MMMM D, YYYY')
                                        : 'N/A'
                                    }
                                </Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Registration Location">
                                {seniorData.branch || 'N/A'}
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                )}

                {/* Form - Only show if senior is found */}
                {seniorData && (
                    <Form
                        form={form}
                        layout="vertical"
                        size="large"
                    >
                        {/* Personal Information (Editable) */}
                        <Divider orientation="left">
                            <UserOutlined /> Update Personal Information (if needed)
                        </Divider>

                        <Row gutter={16}>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item
                                    name="first_name"
                                    label="First Name"
                                    rules={[{ required: true, message: 'Required' }]}
                                >
                                    <Input placeholder="First Name" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item name="middle_name" label="Middle Name">
                                    <Input placeholder="Middle Name" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item
                                    name="last_name"
                                    label="Last Name"
                                    rules={[{ required: true, message: 'Required' }]}
                                >
                                    <Input placeholder="Last Name" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item name="extension" label="Extension">
                                    <Select placeholder="Select" allowClear>
                                        <Option value="">N/A</Option>
                                        <Option value="Jr.">Jr.</Option>
                                        <Option value="Sr.">Sr.</Option>
                                        <Option value="II">II</Option>
                                        <Option value="III">III</Option>
                                        <Option value="IV">IV</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item
                                    name="birthdate"
                                    label={
                                        <Space>
                                            <span>Date of Birth</span>
                                            {calculatedAge !== null && (
                                                <Space size="small">
                                                    <Text type="secondary">({calculatedAge} years old)</Text>
                                                    {getAgeCategory(calculatedAge) && (
                                                        <Tag color={getAgeCategory(calculatedAge).color} style={{ marginRight: 0 }}>
                                                            {getAgeCategory(calculatedAge).label}
                                                        </Tag>
                                                    )}
                                                </Space>
                                            )}
                                        </Space>
                                    }
                                    rules={[{ required: true, message: 'Required' }]}
                                >
                                    <DatePicker
                                        style={{ width: '100%' }}
                                        format="YYYY-MM-DD"
                                        placeholder="Select Date"
                                        onChange={handleBirthdateChange}
                                        disabledDate={(current) => current && current > dayjs().endOf('day')}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item
                                    name="gender_id"
                                    label="Sex"
                                    rules={[{ required: true, message: 'Required' }]}
                                >
                                    <Select placeholder="Select Sex">
                                        {lookupOptions?.genders?.map((g) => (
                                            <Option key={g.id} value={g.id}>{g.name}</Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item
                                    name="civil_status_id"
                                    label="Civil Status"
                                >
                                    <Select placeholder="Select Civil Status" allowClear>
                                        {lookupOptions?.civil_statuses?.map((cs) => (
                                            <Option key={cs.id} value={cs.id}>{cs.name}</Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <Form.Item
                                    name="barangay_id"
                                    label="Barangay"
                                    rules={[{ required: true, message: 'Required' }]}
                                >
                                    <Select
                                        showSearch
                                        placeholder="Select Barangay"
                                        optionFilterProp="children"
                                        filterOption={(input, option) =>
                                            option.children?.toLowerCase().includes(input.toLowerCase())
                                        }
                                    >
                                        {barangays.map((b) => (
                                            <Option key={b.id} value={b.id}>{b.name}</Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item name="house_number" label="House Number">
                                    <Input placeholder="House #" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item name="street" label="Street">
                                    <Input placeholder="Street" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item name="mobile_number" label="Mobile Number">
                                    <Input placeholder="09XX XXX XXXX" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item name="telephone_number" label="Telephone Number">
                                    <Input placeholder="Telephone" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item name="email" label="Email Address">
                                    <Input placeholder="email@example.com" type="email" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item name="educational_attainment_id" label="Educational Attainment">
                                    <Select placeholder="Select" allowClear>
                                        {lookupOptions?.educational_attainments?.map((e) => (
                                            <Option key={e.id} value={e.id}>{e.name}</Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item name="monthly_salary" label="Monthly Income">
                                    <InputNumber
                                        style={{ width: '100%' }}
                                        placeholder="0.00"
                                        min={0}
                                        formatter={(value) => `₱ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                        parser={(value) => value.replace(/₱\s?|(,*)/g, '')}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item name="occupation" label="Occupation">
                                    <Input placeholder="Occupation" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <Form.Item name="other_skills" label="Other Skills">
                                    <Input placeholder="Other Skills" />
                                </Form.Item>
                            </Col>
                        </Row>

                        {/* Document Upload Section */}
                        <Divider orientation="left">
                            <FileTextOutlined /> Renewal Requirements
                        </Divider>

                        <Alert
                            message="Required Documents for ID Renewal"
                            description="Please upload all required documents. Make sure the files are clear and readable."
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />

                        <Row gutter={[16, 16]}>
                            {Object.entries(documentTypes).map(([typeId, docType]) => {
                                const existingDoc = getDocumentByType(parseInt(typeId));
                                const isUploading = documentUploading[typeId];

                                return (
                                    <Col xs={24} sm={12} key={typeId}>
                                        <Card
                                            size="small"
                                            title={
                                                <Space>
                                                    <span>{docType.name}</span>
                                                    {docType.required && <Text type="danger">*</Text>}
                                                </Space>
                                            }
                                            extra={
                                                existingDoc && (
                                                    <Space>
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            icon={<EyeOutlined />}
                                                            onClick={() => handlePreviewDocument(existingDoc.file_path)}
                                                        />
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            danger
                                                            icon={<DeleteOutlined />}
                                                            onClick={() => handleDocumentDelete(existingDoc.id, parseInt(typeId))}
                                                            loading={isUploading}
                                                        />
                                                    </Space>
                                                )
                                            }
                                        >
                                            {existingDoc ? (
                                                <div style={{ color: '#52c41a' }}>
                                                    <CheckCircleOutlined /> Uploaded: {existingDoc.original_filename}
                                                </div>
                                            ) : (
                                                <Upload
                                                    accept=".jpg,.jpeg,.png,.pdf"
                                                    showUploadList={false}
                                                    beforeUpload={(file) => handleDocumentUpload(file, parseInt(typeId))}
                                                    disabled={isUploading}
                                                >
                                                    <Button
                                                        icon={<UploadOutlined />}
                                                        loading={isUploading}
                                                        block
                                                    >
                                                        Click to Upload
                                                    </Button>
                                                </Upload>
                                            )}
                                        </Card>
                                    </Col>
                                );
                            })}
                        </Row>

                        {/* Confirmation Checkboxes */}
                        <Divider orientation="left">
                            <CheckCircleOutlined /> Confirmation
                        </Divider>

                        <Card size="small" style={{ marginBottom: 16 }}>
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                <Checkbox
                                    checked={oldIdSurrendered}
                                    onChange={(e) => setOldIdSurrendered(e.target.checked)}
                                >
                                    <Text strong>Surrender old senior citizen ID card</Text>
                                    <br />
                                    <Text type="secondary">
                                        The applicant has surrendered their old ID card for replacement.
                                    </Text>
                                </Checkbox>

                                <Checkbox
                                    checked={verifiedReady}
                                    onChange={(e) => setVerifiedReady(e.target.checked)}
                                >
                                    <Text strong>This certifies that the above information is verified and ready for processing.</Text>
                                    <br />
                                    <Text type="secondary">
                                        I confirm that all information provided has been verified and all required documents have been checked.
                                    </Text>
                                </Checkbox>
                            </Space>
                        </Card>

                        {/* Submit Buttons */}
                        <Divider />

                        <Row justify="end" gutter={16}>
                            <Col>
                                <Button
                                    size="large"
                                    icon={<SaveOutlined />}
                                    loading={submitting}
                                    onClick={() => handleSubmit(true)}
                                >
                                    Save as Draft
                                </Button>
                            </Col>
                            <Col>
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<CheckCircleOutlined />}
                                    loading={submitting}
                                    onClick={() => handleSubmit(false)}
                                >
                                    Submit Renewal Application
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                )}

                {/* Empty state when no senior searched */}
                {!seniorData && !isEditMode && (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <IdcardOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
                        <Title level={4} type="secondary" style={{ marginTop: 16 }}>
                            Search for a Senior Citizen
                        </Title>
                        <Paragraph type="secondary">
                            Enter the OSCA ID above to find and renew a senior citizen's ID card.
                        </Paragraph>
                    </div>
                )}
            </Card>

            {/* Image Preview Modal */}
            <Image
                style={{ display: 'none' }}
                src={previewImage}
                preview={{
                    visible: !!previewImage,
                    onVisibleChange: (visible) => {
                        if (!visible) setPreviewImage(null);
                    },
                }}
            />
        </div>
    );
};

export default RenewApplication;
