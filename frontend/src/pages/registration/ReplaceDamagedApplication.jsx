import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Card,
    Form,
    Input,
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
    Checkbox,
    Image,
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
    ToolOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { replaceDamagedApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const { Text, Paragraph } = Typography;

const ReplaceDamagedApplication = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState(null);

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

    // Verification checkbox
    const [verifiedReady, setVerifiedReady] = useState(false);
    // Surrender damaged ID checkbox (same as Renew ID)
    const [surrenderDamagedId, setSurrenderDamagedId] = useState(false);

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
            const response = await replaceDamagedApi.getById(id);
            const application = response.data.data;

            if (!application.is_editable) {
                message.error('This application cannot be edited');
                navigate('/admin/registration/list');
                return;
            }

            setApplicationNumber(application.application_number);

            const data = application.applicant_data;
            if (data) {
                const personal = data.personal_info || {};
                const replaceDamaged = data.replace_damaged_info || {};

                setVerifiedReady(replaceDamaged.verified_ready || false);
                setSurrenderDamagedId(replaceDamaged.surrender_damaged_id || false);

                setSeniorData({
                    id: application.senior_id,
                    osca_id: replaceDamaged.original_osca_id,
                    first_name: personal.first_name,
                    middle_name: personal.middle_name,
                    last_name: personal.last_name,
                    full_name: `${personal.first_name} ${personal.middle_name || ''} ${personal.last_name}`.trim(),
                    birthdate: personal.birthdate,
                    registration_date: replaceDamaged.original_registration_date,
                });
            }

            try {
                const docsResponse = await replaceDamagedApi.getDocuments(id);
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

    const handleSearchSenior = async () => {
        if (!oscaIdInput.trim()) {
            message.warning('Please enter an OSCA ID to search');
            return;
        }

        try {
            setSearching(true);
            setSearchError(null);
            setSeniorData(null);

            const response = await replaceDamagedApi.searchByOscaId(oscaIdInput.trim());

            if (response.data.success) {
                const senior = response.data.data;
                setSeniorData(senior);
                message.success('Senior citizen found! Upload the required documents below.');
            }
        } catch (error) {
            console.error('Search error:', error);
            setSearchError(error.response?.data?.message || 'Failed to search for senior citizen');

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

    // Same document types as Renew ID (Old ID photocopy instead of Affidavit)
    const documentTypes = {
        5: { name: 'Photocopy of Damaged Senior Citizen ID Card', required: true },
        2: { name: 'Original Barangay Certification', required: true },
        1: { name: 'Birth Certificate / ID with Date of Birth', required: true },
        4: { name: 'Senior Citizen Recent Picture (2x2)', required: true },
    };

    const getDocumentByType = (typeId) => {
        return uploadedDocuments.find(doc => parseInt(doc.document_type_id) === typeId);
    };

    const handleDocumentUpload = async (file, documentTypeId) => {
        let appId = editApplicationId;

        if (!appId) {
            if (!seniorData) {
                message.warning('Please search for a senior citizen first.');
                return false;
            }

            try {
                setDocumentUploading(prev => ({ ...prev, [documentTypeId]: true }));
                message.loading({ content: 'Creating application...', key: 'docUpload' });

                const submitData = {
                    senior_id: seniorData.id,
                    verified_ready: verifiedReady,
                    save_as_draft: true,
                };

                const response = await replaceDamagedApi.submitNew(submitData);
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

        try {
            setDocumentUploading(prev => ({ ...prev, [documentTypeId]: true }));
            message.loading({ content: 'Uploading document...', key: 'docUpload' });

            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            uploadFormData.append('application_id', appId);
            uploadFormData.append('document_type_id', documentTypeId);

            const response = await replaceDamagedApi.uploadDocument(uploadFormData);

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

    const handleDocumentDelete = async (documentId, documentTypeId) => {
        try {
            setDocumentUploading(prev => ({ ...prev, [documentTypeId]: true }));
            await replaceDamagedApi.deleteDocument(documentId);
            setUploadedDocuments(prev => prev.filter(d => d.id !== documentId));
            message.success('Document removed successfully');
        } catch (error) {
            message.error('Failed to remove document');
        } finally {
            setDocumentUploading(prev => ({ ...prev, [documentTypeId]: false }));
        }
    };

    const handlePreviewDocument = (filePath) => {
        if (!filePath) return;
        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
        setPreviewImage(`${baseUrl}/storage/${filePath}`);
    };

    const handleSubmit = async (saveAsDraft = false) => {
        if (!seniorData) {
            message.error('Please search for a senior citizen first.');
            return;
        }

        if (!saveAsDraft) {
            const hasOldIdCopy = uploadedDocuments.some(doc => parseInt(doc.document_type_id) === 5);
            const hasBarangayCert = uploadedDocuments.some(doc => parseInt(doc.document_type_id) === 2);
            const hasBirthCert = uploadedDocuments.some(doc => parseInt(doc.document_type_id) === 1);
            const hasPhoto = uploadedDocuments.some(doc => parseInt(doc.document_type_id) === 4);

            const missingDocs = [];
            if (!hasOldIdCopy) missingDocs.push('Photocopy of Damaged ID');
            if (!hasBarangayCert) missingDocs.push('Barangay Certification');
            if (!hasBirthCert) missingDocs.push('Birth Certificate / ID with DOB');
            if (!hasPhoto) missingDocs.push('Senior Picture (2x2)');

            if (missingDocs.length > 0) {
                message.error(`Please upload required documents: ${missingDocs.join(', ')}`);
                return;
            }

            if (!surrenderDamagedId) {
                message.error('Please confirm that the damaged senior citizen ID card will be surrendered.');
                return;
            }

            if (!verifiedReady) {
                message.error('Please certify that the information is verified and ready for processing.');
                return;
            }
        }

        try {
            setSubmitting(true);

            const submitData = {
                senior_id: seniorData.id,
                verified_ready: verifiedReady,
                surrender_damaged_id: surrenderDamagedId,
                save_as_draft: saveAsDraft,
            };

            let response;
            if (isEditMode && editApplicationId) {
                response = await replaceDamagedApi.update(editApplicationId, submitData);
            } else {
                response = await replaceDamagedApi.submitNew(submitData);
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
            const errorMsg = error.response?.data?.message || 'Failed to submit application';
            message.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    if (submitResult) {
        return (
            <Card>
                <Result
                    status="success"
                    icon={<CheckCircleOutlined style={{ color: submitResult.isDraft ? '#faad14' : '#52c41a' }} />}
                    title={submitResult.isDraft ? 'Application Saved as Draft' : 'Replace Damaged ID Application Submitted!'}
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
                            Submit Another Application
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
                        <ToolOutlined />
                        <span>{isEditMode ? `Edit Application: ${applicationNumber}` : 'Replace Damaged ID'}</span>
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
                        <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
                            <Descriptions.Item label="OSCA ID">
                                <Text strong style={{ color: '#1890ff' }}>{seniorData.osca_id}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Full Name">
                                {seniorData.full_name || `${seniorData.first_name} ${seniorData.middle_name || ''} ${seniorData.last_name}`.trim()}
                            </Descriptions.Item>
                            <Descriptions.Item label="Age">
                                {seniorData.age} years old
                            </Descriptions.Item>
                            <Descriptions.Item label="Sex">
                                {seniorData.gender?.name || (seniorData.gender_id === 1 ? 'Male' : seniorData.gender_id === 2 ? 'Female' : '-')}
                            </Descriptions.Item>
                            <Descriptions.Item label="Civil Status">
                                {seniorData.civil_status?.name || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Barangay">
                                {seniorData.barangay || 'N/A'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Registration Date">
                                <Text strong>
                                    {seniorData.registration_date
                                        ? dayjs(seniorData.registration_date).format('MMMM D, YYYY')
                                        : 'N/A'
                                    }
                                </Text>
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                )}

                {/* Document Upload Section */}
                {seniorData && (
                    <>
                        <Divider orientation="left">
                            <FileTextOutlined /> Required Documents
                        </Divider>

                        <Alert
                            message="Required Documents for Replace Damaged ID"
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
                                                    <Text strong>{docType.name}</Text>
                                                    <Text type="danger">*</Text>
                                                </Space>
                                            }
                                            style={{
                                                borderColor: existingDoc ? '#52c41a' : '#d9d9d9',
                                            }}
                                        >
                                            {existingDoc ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                                    <Text ellipsis style={{ flex: 1 }}>
                                                        {existingDoc.original_filename}
                                                    </Text>
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
                                                        loading={isUploading}
                                                        onClick={() => handleDocumentDelete(existingDoc.id, parseInt(typeId))}
                                                    />
                                                </div>
                                            ) : (
                                                <Upload
                                                    accept="image/*,.pdf"
                                                    showUploadList={false}
                                                    beforeUpload={(file) => handleDocumentUpload(file, parseInt(typeId))}
                                                    disabled={isUploading}
                                                >
                                                    <Button
                                                        icon={<UploadOutlined />}
                                                        loading={isUploading}
                                                        block
                                                    >
                                                        Upload Document
                                                    </Button>
                                                </Upload>
                                            )}
                                        </Card>
                                    </Col>
                                );
                            })}
                        </Row>

                        {/* Verification Section */}
                        <Divider orientation="left">
                            <CheckCircleOutlined /> Verification
                        </Divider>

                        <Card size="small" style={{ marginBottom: 24 }}>
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                <div>
                                    <Checkbox
                                        checked={surrenderDamagedId}
                                        onChange={(e) => setSurrenderDamagedId(e.target.checked)}
                                    >
                                        <Text strong>
                                            Surrender damaged senior citizen ID card
                                        </Text>
                                    </Checkbox>
                                    <div style={{ marginLeft: 24, marginTop: 4 }}>
                                        <Text type="secondary">
                                            The applicant has surrendered their old ID card for replacement.
                                        </Text>
                                    </div>
                                </div>
                                <div>
                                    <Checkbox
                                        checked={verifiedReady}
                                        onChange={(e) => setVerifiedReady(e.target.checked)}
                                    >
                                        <Text strong>
                                            I certify that the above information is verified and ready for processing.
                                        </Text>
                                    </Checkbox>
                                    <div style={{ marginLeft: 24, marginTop: 4 }}>
                                        <Text type="secondary">
                                            I confirm that all information provided has been verified and all required documents have been checked.
                                        </Text>
                                    </div>
                                </div>
                            </Space>
                        </Card>

                        {/* Submit Buttons */}
                        <Row gutter={16} justify="end">
                            <Col>
                                <Button
                                    size="large"
                                    icon={<SaveOutlined />}
                                    onClick={() => handleSubmit(true)}
                                    loading={submitting}
                                >
                                    Save as Draft
                                </Button>
                            </Col>
                            <Col>
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<CheckCircleOutlined />}
                                    onClick={() => handleSubmit(false)}
                                    loading={submitting}
                                    disabled={!verifiedReady}
                                >
                                    Submit for Verification
                                </Button>
                            </Col>
                        </Row>
                    </>
                )}
            </Card>

            {/* Image Preview Modal */}
            <Image
                style={{ display: 'none' }}
                preview={{
                    visible: !!previewImage,
                    src: previewImage,
                    onVisibleChange: (visible) => {
                        if (!visible) setPreviewImage(null);
                    },
                }}
            />
        </div>
    );
};

export default ReplaceDamagedApplication;
