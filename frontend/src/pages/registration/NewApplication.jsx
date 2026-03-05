import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
    Card,
    Steps,
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
    Modal,
    List,
    Tag,
    Image,
} from 'antd';
import {
    UserOutlined,
    UsergroupAddOutlined,
    ApartmentOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    WarningOutlined,
    ArrowLeftOutlined,
    ArrowRightOutlined,
    SaveOutlined,
    PlusOutlined,
    DeleteOutlined,
    EyeOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { registrationApi, preRegistrationApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const NewApplication = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const isFO = user?.role_id === 2;
    const [form] = Form.useForm();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [lookupOptions, setLookupOptions] = useState(null);
    const [barangays, setBarangays] = useState([]);
    const [duplicateCheck, setDuplicateCheck] = useState(null);
    const [formData, setFormData] = useState({});
    const [submitResult, setSubmitResult] = useState(null);
    const [familyMembers, setFamilyMembers] = useState([]);
    const [calculatedAge, setCalculatedAge] = useState(null);

    // Edit mode state
    const [isEditMode, setIsEditMode] = useState(false);
    const [isViewMode, setIsViewMode] = useState(false); // View-only mode (no editing allowed)
    const [editApplicationId, setEditApplicationId] = useState(null);
    const [applicationNumber, setApplicationNumber] = useState(null);
    const [uploadedDocuments, setUploadedDocuments] = useState([]);
    const [thumbmarkConfirmed, setThumbmarkConfirmed] = useState(false);
    const [documentUploading, setDocumentUploading] = useState({});
    const [previewImage, setPreviewImage] = useState(null);
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [pendingNextStep, setPendingNextStep] = useState(false);
    const selectedGenderId = Form.useWatch('gender_id', form);

    // Pre-registration conversion state
    const [preRegistrationId, setPreRegistrationId] = useState(null);
    const [preRegistrationRef, setPreRegistrationRef] = useState(null);

    // Age category helper
    const getAgeCategory = (age) => {
        if (age >= 100) return { label: 'Centenarian', color: 'gold' };
        if (age >= 90) return { label: 'Nonagenarian', color: 'purple' };
        if (age >= 80) return { label: 'Octogenarian', color: 'blue' };
        if (age >= 70) return { label: 'Septuagenarian', color: 'cyan' };
        if (age >= 60) return { label: 'Sexagenarian', color: 'green' };
        return null;
    };

    // Target sectors from original form
    const targetSectors = [
        { value: 'PNGNA', label: 'PNGNA', description: 'Pambansang Nagkakaisa ng mga Nakatatanda' },
        { value: 'WEPC', label: 'WEPC', description: 'Women Empowerment Program for the Community' },
        { value: 'PWD', label: 'PWD', description: 'Person with Disability' },
        { value: 'YNSP', label: 'YNSP', description: 'Yakap ng Nagkakaisa sa Serbisyo ng Pangulo' },
        { value: 'PASP', label: 'PASP', description: 'Pag-asa at Suporta ng Pangulo' },
        { value: 'KIA/WIA', label: 'KIA/WIA', description: 'Killed in Action / Wounded in Action' },
    ];

    const subCategories = [
        { value: 'Solo Parents', label: 'Solo Parents', description: 'Senior citizen raising children alone' },
        { value: 'Indigenous Person (IP)', label: 'IP - Indigenous Person', description: '' },
        { value: 'Recovering Person who used drugs', label: 'Recovering Person who used drugs', description: '' },
        { value: "4P's DSWD Beneficiaries", label: "4P's (DSWD Beneficiaries)", description: 'Pantawid Pamilyang Pilipino Program' },
        { value: 'Street Dwellers', label: 'Street Dwellers', description: '' },
        { value: 'Psychosocial/Mental/Learning Disability', label: 'Psychosocial / Mental / Learning Disability', description: '' },
        { value: 'Stateless Person/Asylum', label: 'Stateless Person / Asylum Seeker', description: '' },
    ];

    // Load lookup options on mount
    useEffect(() => {
        loadLookupOptions();
        loadBarangays();
    }, []);

    // Check for edit or view mode and load existing application
    useEffect(() => {
        const editId = searchParams.get('edit');
        const viewId = searchParams.get('view');
        if (editId) {
            setIsEditMode(true);
            setEditApplicationId(editId);
            loadApplicationData(editId);
        } else if (viewId) {
            // View mode - same as edit but sets view-only flag
            setIsEditMode(true);
            setIsViewMode(true);
            setEditApplicationId(viewId);
            loadApplicationData(viewId);
        }
    }, [searchParams]);

    // Handle pre-registration conversion prefill
    useEffect(() => {
        if (location.state?.fromPreRegistration && location.state?.prefillData) {
            const { prefillData, preRegistrationId: preRegId, referenceNumber } = location.state;

            // Store pre-registration info
            setPreRegistrationId(preRegId);
            setPreRegistrationRef(referenceNumber);

            // Pre-fill form with data from online application
            form.setFieldsValue({
                first_name: prefillData.first_name,
                middle_name: prefillData.middle_name,
                last_name: prefillData.last_name,
                extension: prefillData.extension,
                birthdate: prefillData.birthdate ? dayjs(prefillData.birthdate) : null,
                gender_id: prefillData.gender_id,
                civil_status_id: prefillData.civil_status_id,
                barangay_id: prefillData.barangay_id,
                house_number: prefillData.house_number,
                street: prefillData.street,
                mobile_number: prefillData.mobile_number,
                telephone_number: prefillData.telephone_number,
                email: prefillData.email,
                educational_attainment_id: prefillData.educational_attainment_id,
                monthly_salary: prefillData.monthly_salary,
                occupation: prefillData.occupation,
                other_skills: prefillData.other_skills,
                target_sectors: prefillData.target_sectors || [],
                sub_categories: prefillData.sub_categories || [],
            });

            // Store in formData state
            setFormData(prefillData);

            // Pre-fill family members if available
            if (prefillData.family_members && prefillData.family_members.length > 0) {
                setFamilyMembers(prefillData.family_members.map((m, i) => ({
                    ...m,
                    id: m.id || Date.now() + i,
                })));
            }

            // Calculate age if birthdate exists (inline to avoid dependency issue)
            if (prefillData.birthdate) {
                const birth = dayjs(prefillData.birthdate);
                const today = dayjs();
                const age = today.diff(birth, 'year');
                setCalculatedAge(age >= 0 ? age : null);
            }

            message.info(`Pre-filling data from online application: ${referenceNumber}`);
        }
    }, [location.state, form]);

    const loadApplicationData = async (id) => {
        try {
            setLoading(true);
            const response = await registrationApi.getById(id);
            const application = response.data.data;

            if (!application.is_editable) {
                message.error('This application cannot be edited');
                navigate('/admin/registration/list');
                return;
            }

            setApplicationNumber(application.application_number);

            // Parse applicant_data and pre-fill form
            const data = application.applicant_data;
            if (data) {
                const personal = data.personal_info || {};
                const contact = data.contact_info || {};
                const background = data.background_info || {};

                // Set form values
                form.setFieldsValue({
                    first_name: personal.first_name,
                    middle_name: personal.middle_name,
                    last_name: personal.last_name,
                    extension: personal.extension,
                    birthdate: personal.birthdate ? dayjs(personal.birthdate) : null,
                    gender_id: personal.gender_id,
                    civil_status_id: personal.civil_status_id,
                    barangay_id: personal.barangay_id,
                    house_number: contact.house_number,
                    street: contact.street,
                    mobile_number: contact.mobile_number,
                    telephone_number: contact.telephone_number,
                    email: contact.email,
                    educational_attainment_id: background.educational_attainment_id,
                    monthly_salary: background.monthly_salary,
                    occupation: background.occupation,
                    other_skills: background.other_skills,
                    target_sectors: data.target_sectors || [],
                    sub_categories: data.sub_categories || [],
                });

                // Set family members if any
                if (data.family_members && data.family_members.length > 0) {
                    setFamilyMembers(data.family_members.map((m, idx) => ({ ...m, id: idx + Date.now() })));
                }

                // Calculate age if birthdate exists
                if (personal.birthdate) {
                    calculateAge(dayjs(personal.birthdate));
                }

                // Store in formData as well
                setFormData({
                    ...personal,
                    ...contact,
                    ...background,
                    target_sectors: data.target_sectors || [],
                    sub_categories: data.sub_categories || [],
                    birthdate: personal.birthdate ? dayjs(personal.birthdate) : null,
                });
            }

            // Load uploaded documents
            try {
                const docsResponse = await registrationApi.getDocuments(id);
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

    // Document type IDs: 1=Birth Certificate, 2=Barangay Cert, 3=COMELEC, 4=Photo
    const documentTypes = {
        1: { name: 'Proof of Age (Birth Certificate / ID)', required: true },
        2: { name: 'Barangay Certification / Residency', required: true },
        3: { name: 'COMELEC ID / Certification', required: false },
        4: { name: 'Senior Picture (2x2)', required: true },
    };

    // Get document by type from uploadedDocuments
    const getDocumentByType = (typeId) => {
        // Use == for loose comparison to handle string/int mismatch from server
        return uploadedDocuments.find(doc => parseInt(doc.document_type_id) === typeId);
    };

    // Handle document upload - immediate upload on file selection
    const handleDocumentUpload = async (file, documentTypeId) => {
        // Need application_id - if new application, we need to create it first (save as draft)
        let appId = editApplicationId;

        // If no application exists yet, create a draft first
        if (!appId) {
            const allData = { ...formData, ...form.getFieldsValue() };

            // Check minimum required fields
            if (!allData.first_name || !allData.last_name || !allData.birthdate || !allData.gender_id || !allData.civil_status_id || !allData.barangay_id) {
                message.warning('Please fill in all required personal information (name, birthdate, sex, civil status, barangay) before uploading documents.');
                return false;
            }

            try {
                setDocumentUploading(prev => ({ ...prev, [documentTypeId]: true }));
                message.loading({ content: 'Creating application...', key: 'docUpload' });

                // Create draft first
                const submitData = {
                    first_name: allData.first_name,
                    middle_name: allData.middle_name,
                    last_name: allData.last_name,
                    extension: allData.extension,
                    birthdate: allData.birthdate?.format?.('YYYY-MM-DD') || allData.birthdate,
                    gender_id: allData.gender_id,
                    civil_status_id: allData.civil_status_id,
                    barangay_id: allData.barangay_id,
                    house_number: allData.house_number,
                    street: allData.street,
                    mobile_number: allData.mobile_number,
                    telephone_number: allData.telephone_number,
                    email: allData.email,
                    educational_attainment_id: allData.educational_attainment_id,
                    monthly_salary: allData.monthly_salary,
                    occupation: allData.occupation,
                    other_skills: allData.other_skills,
                    family_members: familyMembers.filter(m => m.first_name),
                    target_sectors: allData.target_sectors || [],
                    sub_categories: allData.sub_categories || [],
                    application_type_id: 1,
                    save_as_draft: true,
                };

                const response = await registrationApi.submitNew(submitData);
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

            const response = await registrationApi.uploadDocument(uploadFormData);

            if (response.data.success) {
                // Normalize document_type_id to integer and update state
                const newDoc = {
                    ...response.data.data,
                    document_type_id: parseInt(response.data.data.document_type_id)
                };

                // Update uploadedDocuments - remove old of same type and add new
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

        return false; // Prevent default upload behavior
    };

    // Handle document deletion
    const handleDocumentDelete = async (documentId, documentTypeId) => {
        try {
            setDocumentUploading(prev => ({ ...prev, [documentTypeId]: true }));
            await registrationApi.deleteDocument(documentId);
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

    const checkDuplicate = async (values) => {
        if (!values.first_name || !values.last_name || !values.birthdate) return null;

        try {
            const response = await registrationApi.checkDuplicate({
                first_name: values.first_name,
                last_name: values.last_name,
                middle_name: values.middle_name,
                birthdate: values.birthdate.format ? values.birthdate.format('YYYY-MM-DD') : values.birthdate,
            });
            const result = response.data.data;
            setDuplicateCheck(result);
            return result;
        } catch (error) {
            console.error('Duplicate check failed:', error);
            return null;
        }
    };

    // Family member management
    const addFamilyMember = () => {
        setFamilyMembers([
            ...familyMembers,
            { id: Date.now(), first_name: '', middle_name: '', last_name: '', extension: '', birthdate: null, relationship: '', age: '', monthly_salary: '', mobile_number: '', telephone_number: '', email: '', searchQuery: '', searchResults: [], searching: false },
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

    // Search for registered seniors to add as family members
    const searchFamilySenior = async (memberId, query) => {
        if (!query || query.length < 2) {
            updateFamilyMember(memberId, 'searchResults', []);
            return;
        }
        updateFamilyMember(memberId, 'searching', true);
        try {
            const response = await registrationApi.searchFamilySenior(query);
            setFamilyMembers(prev => prev.map(m =>
                m.id === memberId ? { ...m, searchResults: response.data.data || [], searching: false } : m
            ));
        } catch (error) {
            console.error('Family senior search failed:', error);
            setFamilyMembers(prev => prev.map(m =>
                m.id === memberId ? { ...m, searchResults: [], searching: false } : m
            ));
        }
    };

    // Fill family member from selected senior
    const fillFamilyMemberFromSenior = (memberId, senior) => {
        setFamilyMembers(prev => prev.map(m => {
            if (m.id !== memberId) return m;
            return {
                ...m,
                first_name: senior.first_name,
                middle_name: senior.middle_name || '',
                last_name: senior.last_name,
                extension: senior.extension || '',
                birthdate: senior.birthdate,
                age: senior.age,
                monthly_salary: senior.monthly_salary || '',
                mobile_number: senior.mobile_number || '',
                telephone_number: senior.telephone_number || '',
                email: senior.email || '',
                searchResults: [],
                searchQuery: '',
            };
        }));
        message.success(`Filled from ${senior.full_name} (${senior.osca_id})`);
    };

    const steps = [
        {
            title: 'Personal Information',
            icon: <UserOutlined />,
        },
        {
            title: 'Family Composition',
            icon: <UsergroupAddOutlined />,
        },
        {
            title: 'Association',
            icon: <ApartmentOutlined />,
        },
        {
            title: 'Requirements',
            icon: <FileTextOutlined />,
        },
    ];

    const handleNext = async () => {
        try {
            // Validate required/rule-based fields first
            await form.validateFields();
            // Capture ALL field values (including optional fields without rules like email)
            const allValues = form.getFieldsValue();
            const definedValues = Object.fromEntries(
                Object.entries(allValues).filter(([, v]) => v !== undefined)
            );
            const newFormData = { ...formData, ...definedValues };
            setFormData(newFormData);

            // Check for duplicates after step 1 (Personal Info)
            if (currentStep === 0) {
                const duplicateResult = await checkDuplicate(newFormData);

                // If duplicates found, show warning modal instead of proceeding
                if (duplicateResult?.has_duplicate) {
                    setShowDuplicateWarning(true);
                    setPendingNextStep(true);
                    return; // Block navigation until user acknowledges
                }
            }

            // Validate family member required fields
            if (currentStep === 1 && familyMembers.length > 0) {
                const invalidMembers = familyMembers.filter(
                    m => !m.first_name?.trim() || !m.last_name?.trim() || !m.relationship?.trim() || m.relationship === '__other__'
                );
                if (invalidMembers.length > 0) {
                    message.warning('Please fill in First Name, Last Name, and Relationship for all family members, or remove incomplete entries.');
                    return;
                }
            }

            setCurrentStep(currentStep + 1);
        } catch (error) {
            console.log('Validation failed:', error);
        }
    };

    // Handle acknowledgement of duplicate warning and proceed
    const handleAcknowledgeDuplicate = () => {
        setShowDuplicateWarning(false);
        if (pendingNextStep) {
            setCurrentStep(currentStep + 1);
            setPendingNextStep(false);
        }
    };

    const handlePrev = () => {
        // Save current step's field values before going back
        const currentValues = form.getFieldsValue();
        const definedValues = Object.fromEntries(
            Object.entries(currentValues).filter(([, v]) => v !== undefined)
        );
        setFormData(prev => ({ ...prev, ...definedValues }));
        setCurrentStep(currentStep - 1);
    };

    const handleSubmit = async (saveAsDraft = false) => {
        try {
            // Validate required fields first (first step fields are always required)
            // Filter out undefined values from current step's form to avoid overwriting saved data from other steps
            const currentValues = form.getFieldsValue();
            const definedValues = Object.fromEntries(
                Object.entries(currentValues).filter(([, v]) => v !== undefined)
            );
            const allData = { ...formData, ...definedValues };

            // Check required fields
            const missingFields = [];
            if (!allData.first_name) missingFields.push('First Name');
            if (!allData.last_name) missingFields.push('Last Name');
            if (!allData.birthdate) missingFields.push('Date of Birth');
            if (!allData.gender_id) missingFields.push('Sex');
            if (!allData.barangay_id) missingFields.push('Barangay');

            if (missingFields.length > 0) {
                message.error(`Please fill in required fields: ${missingFields.join(', ')}`);
                // Go back to Step 1 if needed
                if (currentStep > 0) {
                    setCurrentStep(0);
                }
                return;
            }

            // Document validation for full submission (not drafts)
            if (!saveAsDraft) {
                // Check for required documents: 1=Birth Cert, 2=Barangay Cert, 4=Photo
                const hasBirthCert = uploadedDocuments.some(doc => parseInt(doc.document_type_id) === 1);
                const hasBarangayCert = uploadedDocuments.some(doc => parseInt(doc.document_type_id) === 2);
                const hasPhoto = uploadedDocuments.some(doc => parseInt(doc.document_type_id) === 4);

                const missingDocs = [];
                if (!hasBirthCert) missingDocs.push('Proof of Age (Birth Certificate / ID)');
                if (!hasBarangayCert) missingDocs.push('Barangay Certification');
                if (!hasPhoto) missingDocs.push('Senior Picture (2x2)');

                if (missingDocs.length > 0) {
                    message.error(`Please upload required documents: ${missingDocs.join(', ')}`);
                    if (currentStep !== 3) {
                        setCurrentStep(3);
                    }
                    return;
                }

                // Check thumbmark confirmation
                if (!thumbmarkConfirmed) {
                    message.error('Please confirm the thumbmark verification checkbox.');
                    if (currentStep !== 3) {
                        setCurrentStep(3);
                    }
                    return;
                }
            }

            setSubmitting(true);

            // Format the data for submission
            const submitData = {
                // Personal Info
                first_name: allData.first_name,
                middle_name: allData.middle_name,
                last_name: allData.last_name,
                extension: allData.extension,
                birthdate: allData.birthdate?.format('YYYY-MM-DD'),
                gender_id: allData.gender_id,
                civil_status_id: allData.civil_status_id,
                barangay_id: allData.barangay_id,

                // Address/Contact
                house_number: allData.house_number,
                street: allData.street,
                mobile_number: allData.mobile_number,
                telephone_number: allData.telephone_number,
                email: allData.email,

                // Socioeconomic
                educational_attainment_id: allData.educational_attainment_id,
                monthly_salary: allData.monthly_salary,
                occupation: allData.occupation,
                other_skills: allData.other_skills,

                // Family members
                family_members: familyMembers.filter(m => m.first_name),

                // Associations
                target_sectors: allData.target_sectors || [],
                sub_categories: allData.sub_categories || [],

                application_type_id: 1, // New ID
                save_as_draft: saveAsDraft,
            };

            let response;
            if (isEditMode && editApplicationId) {
                // Update existing application
                response = await registrationApi.update(editApplicationId, submitData);
            } else {
                // Create new application
                response = await registrationApi.submitNew(submitData);
            }

            setSubmitResult(response.data.data);
            setCurrentStep(4); // Show success

            // If this was a pre-registration conversion, mark it as completed
            if (preRegistrationId && response.data.data?.application_id) {
                try {
                    await preRegistrationApi.completeConversion(preRegistrationId, response.data.data.application_id);
                } catch (convErr) {
                    console.error('Failed to mark pre-registration as converted:', convErr);
                    // Don't fail the whole operation, just log
                }
            }

            const actionType = isEditMode ? 'updated' : (saveAsDraft ? 'saved as draft' : 'submitted');
            message.success(response.data.message || `Application ${actionType} successfully!`);
        } catch (error) {
            console.error('Submission failed:', error);

            // Handle validation errors from backend
            if (error.response?.data?.errors) {
                const errors = error.response.data.errors;
                const errorMessages = Object.values(errors).flat().join(', ');
                message.error(errorMessages);
            } else {
                message.error(error.response?.data?.message || 'Failed to submit application. Please check all required fields.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveAsDraft = async () => {
        // Validate required fields before saving draft
        const allData = { ...formData, ...form.getFieldsValue() };

        const missingFields = [];
        if (!allData.first_name) missingFields.push('First Name');
        if (!allData.last_name) missingFields.push('Last Name');
        if (!allData.birthdate) missingFields.push('Date of Birth');
        if (!allData.gender_id) missingFields.push('Sex');
        if (!allData.barangay_id) missingFields.push('Barangay');

        if (missingFields.length > 0) {
            message.error(`Cannot save draft. Please fill in required fields: ${missingFields.join(', ')}`);
            if (currentStep > 0) {
                setCurrentStep(0);
            }
            return;
        }

        await handleSubmit(true);
    };

    // Step 1: Personal Information (matching original form)
    const renderPersonalInfo = () => (
        <div>
            <Title level={4} style={{ color: '#1890ff', marginBottom: 16 }}>
                Personal Na Impormasyon
            </Title>

            <Row gutter={16}>
                <Col xs={24} sm={12} md={6}>
                    <Form.Item
                        name="first_name"
                        label={<span>First Name <span style={{ color: '#fa8c16' }}>*</span></span>}
                        rules={[{ required: true, message: 'First name is required' }]}
                    >
                        <Input placeholder="First name" size="large" />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Form.Item name="middle_name" label="Middle Name/Middle Initial">
                        <Input placeholder="Middle name" size="large" />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Form.Item
                        name="last_name"
                        label={<span>Last Name <span style={{ color: '#fa8c16' }}>*</span></span>}
                        rules={[{ required: true, message: 'Last name is required' }]}
                    >
                        <Input placeholder="Last name" size="large" />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Form.Item name="extension" label="Extension">
                        <Input placeholder="Jr., Sr., III" size="large" />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col xs={24} sm={12} md={6}>
                    <Form.Item
                        name="house_number"
                        label="House No."
                    >
                        <Input placeholder="House number" size="large" />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Form.Item
                        name="street"
                        label="Street"
                    >
                        <Input placeholder="Street name" size="large" />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Form.Item
                        name="barangay_id"
                        label={<span>Barangay <span style={{ color: '#fa8c16' }}>*</span></span>}
                        rules={[{ required: true, message: 'Barangay is required' }]}
                    >
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
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
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
                <Col xs={24} sm={12} md={6}>
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
                            placeholder="YYYY-MM-DD"
                            format={['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY']}
                            onChange={handleBirthdateChange}
                            showToday={false}
                            allowClear
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Form.Item
                        label={<span>Age <span style={{ color: '#fa8c16' }}>*</span></span>}
                    >
                        <Input
                            value={calculatedAge !== null ? `${calculatedAge} years old` : ''}
                            readOnly
                            size="large"
                            style={{ backgroundColor: '#f5f5f5' }}
                            placeholder="From birthdate"
                            suffix={calculatedAge !== null && getAgeCategory(calculatedAge) ? (
                                <Tag color={getAgeCategory(calculatedAge).color} style={{ marginRight: 0 }}>
                                    {getAgeCategory(calculatedAge).label}
                                </Tag>
                            ) : null}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Form.Item
                        name="gender_id"
                        label={<span>Sex <span style={{ color: '#fa8c16' }}>*</span></span>}
                        rules={[{ required: true, message: 'Sex is required' }]}
                    >
                        <Select
                            placeholder="Select Sex"
                            size="large"
                            onChange={(value) => {
                                const currentCivilStatus = form.getFieldValue('civil_status_id');
                                if ((value === 1 && currentCivilStatus === 4) ||
                                    (value === 2 && currentCivilStatus === 5)) {
                                    form.setFieldValue('civil_status_id', undefined);
                                }
                            }}
                        >
                            {lookupOptions?.genders?.map((g) => (
                                <Option key={g.id} value={g.id}>
                                    {g.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Form.Item
                        name="civil_status_id"
                        label={<span>Civil Status <span style={{ color: '#fa8c16' }}>*</span></span>}
                        rules={[{ required: true, message: 'Civil Status is required' }]}
                        dependencies={['gender_id']}
                    >
                        <Select placeholder="Select" size="large">
                            {lookupOptions?.civil_statuses?.filter((cs) => {
                                if (cs.id === 4 && selectedGenderId === 1) return false;
                                if (cs.id === 5 && selectedGenderId === 2) return false;
                                return true;
                            }).map((cs) => (
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
                <Col xs={24} sm={12} md={6}>
                    <Form.Item
                        name="mobile_number"
                        label={<span>Mobile Number <span style={{ color: '#fa8c16' }}>*</span></span>}
                        rules={[
                            { required: true, message: 'Mobile number is required' },
                            { pattern: /^09\d{9}$/, message: 'Must be valid PH number (09XXXXXXXXX)' },
                        ]}
                    >
                        <Input placeholder="09XX-XXX-XXXX" size="large" maxLength={11} />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Form.Item name="telephone_number" label="Telephone Number">
                        <Input placeholder="(062) XXX-XXXX" size="large" />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Form.Item name="email" label="Email">
                        <Input placeholder="email@example.com" size="large" />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Form.Item name="educational_attainment_id" label="Educational Attainment">
                        <Select placeholder="Select" size="large" allowClear>
                            {lookupOptions?.educational_attainments?.map((ea) => (
                                <Option key={ea.id} value={ea.id}>
                                    {ea.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
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
                    <Form.Item name="occupation" label="Occupation">
                        <Input placeholder="Current or previous occupation" size="large" />
                    </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                    <Form.Item name="other_skills" label="Other Skills">
                        <Input placeholder="Additional skills" size="large" />
                    </Form.Item>
                </Col>
            </Row>

            {duplicateCheck?.has_duplicate && (
                <Alert
                    message="Potential Duplicate Found"
                    description={
                        <div>
                            <p>A senior citizen with similar details already exists:</p>
                            {duplicateCheck.duplicates.map((d) => (
                                <p key={d.id}>
                                    <strong>{d.full_name || `${d.first_name} ${d.last_name}`}</strong>
                                    {d.osca_id && ` (OSCA ID: ${d.osca_id})`}
                                    {d.barangay && ` - ${d.barangay.name}`}
                                </p>
                            ))}
                            <p>Please verify this is a new applicant before continuing.</p>
                        </div>
                    }
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                    style={{ marginTop: 16 }}
                />
            )}
        </div>
    );

    // Step 2: Family Composition
    const renderFamilyComposition = () => (
        <div>
            <Title level={4} style={{ color: '#1890ff', marginBottom: 16 }}>
                Family Composition
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                To Add a Family Member Please click Add Person Button
            </Paragraph>

            <Space style={{ marginBottom: 16 }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={addFamilyMember}
                    style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                >
                    Add Person
                </Button>
                {familyMembers.length > 0 && (
                    <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => setFamilyMembers([])}
                    >
                        Clear All
                    </Button>
                )}
            </Space>

            {familyMembers.length === 0 ? (
                <Alert
                    message="No family members added"
                    description="Click 'Add Person' to add family members. This is optional."
                    type="info"
                    showIcon
                />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {familyMembers.map((member, index) => (
                        <Card
                            key={member.id}
                            size="small"
                            title={`Family Member ${index + 1}`}
                            extra={
                                <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => removeFamilyMember(member.id)}
                                />
                            }
                        >
                            {/* Matched Senior Indicator */}
                            {member.matched_senior && (
                                <Alert
                                    type="success"
                                    showIcon
                                    icon={<CheckCircleOutlined />}
                                    message={
                                        <span>
                                            This person is a registered senior:{' '}
                                            <strong>{member.matched_senior.full_name} ({member.matched_senior.osca_id})</strong>
                                            {member.matched_senior.barangay && ` · ${member.matched_senior.barangay}`}
                                        </span>
                                    }
                                    style={{ marginBottom: 12 }}
                                />
                            )}
                            {/* Senior Search */}
                            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f0f5ff', borderRadius: 8, border: '1px dashed #adc6ff' }}>
                                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Search registered senior to auto-fill:</Text>
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input
                                        placeholder="Type name or OSCA ID..."
                                        value={member.searchQuery || ''}
                                        onChange={(e) => {
                                            updateFamilyMember(member.id, 'searchQuery', e.target.value);
                                            searchFamilySenior(member.id, e.target.value);
                                        }}
                                        prefix={<SearchOutlined style={{ color: '#999' }} />}
                                        allowClear
                                        onClear={() => updateFamilyMember(member.id, 'searchResults', [])}
                                    />
                                </Space.Compact>
                                {member.searching && <Spin size="small" style={{ marginTop: 4 }} />}
                                {member.searchResults?.length > 0 && (
                                    <div style={{ marginTop: 8, maxHeight: 150, overflowY: 'auto' }}>
                                        {member.searchResults.map(sr => (
                                            <div
                                                key={sr.id}
                                                onClick={() => fillFamilyMemberFromSenior(member.id, sr)}
                                                style={{ padding: '6px 8px', cursor: 'pointer', borderRadius: 4, marginBottom: 2, background: '#fff', border: '1px solid #f0f0f0' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#e6f7ff'}
                                                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                            >
                                                <Text strong>{sr.full_name}</Text>
                                                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                                                    {sr.osca_id} · {sr.age} yrs · {sr.barangay}
                                                </Text>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Row gutter={16}>
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
                            <Row gutter={16}>
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
                            <Row gutter={16}>
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
                </div>
            )}
        </div>
    );

    // Step 3: Association (Target Sectors)
    const renderAssociation = () => (
        <div>
            <Title level={4} style={{ color: '#1890ff', marginBottom: 16 }}>
                Target Sector (Pangunahing Sektor)
            </Title>
            <Alert
                message="Select ALL categories that apply to this senior citizen. Multiple selections are allowed."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
            />

            <Row gutter={24}>
                <Col xs={24} md={12}>
                    <Title level={5}>Target Sectors</Title>
                    <Form.Item name="target_sectors">
                        <Checkbox.Group style={{ width: '100%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {targetSectors.map((sector) => (
                                    <Card key={sector.value} size="small" hoverable style={{ cursor: 'pointer' }}>
                                        <Checkbox value={sector.value}>
                                            <strong>{sector.label}</strong>
                                            {sector.description && (
                                                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                                                    {sector.description}
                                                </div>
                                            )}
                                        </Checkbox>
                                    </Card>
                                ))}
                            </div>
                        </Checkbox.Group>
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Title level={5}>Special Sub-Categories</Title>
                    <Form.Item name="sub_categories">
                        <Checkbox.Group style={{ width: '100%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {subCategories.map((cat) => (
                                    <Card key={cat.value} size="small" hoverable style={{ cursor: 'pointer' }}>
                                        <Checkbox value={cat.value}>
                                            <strong>{cat.label}</strong>
                                            {cat.description && (
                                                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                                                    {cat.description}
                                                </div>
                                            )}
                                        </Checkbox>
                                    </Card>
                                ))}
                            </div>
                        </Checkbox.Group>
                    </Form.Item>
                </Col>
            </Row>
        </div>
    );

    // Step 4: Requirements & Review
    const renderRequirements = () => {
        const data = { ...formData, ...form.getFieldsValue() };
        const selectedBarangay = barangays.find((b) => b.id === data.barangay_id);
        const selectedGender = lookupOptions?.genders?.find((g) => g.id === data.gender_id);
        const selectedCivilStatus = lookupOptions?.civil_statuses?.find((cs) => cs.id === data.civil_status_id);
        const selectedEducation = lookupOptions?.educational_attainments?.find((e) => e.id === data.educational_attainment_id);

        return (
            <div>
                <Title level={4} style={{ color: '#1890ff', marginBottom: 16 }}>
                    Upload Required Documents
                </Title>
                <Paragraph type="secondary">
                    Please upload clear, readable copies of the following documents (JPG, PNG, or PDF Format).
                    <br />
                    <span style={{ fontSize: 12, color: '#888' }}>Maximum file size: 5MB per document</span>
                </Paragraph>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
                    {/* Birth Certificate - Type 1 */}
                    <Card size="small" title={<span>Proof of Age (Birth Certificate / ID): <span style={{ color: '#fa8c16' }}>*</span></span>}>
                        {getDocumentByType(1) ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
                                <span style={{ color: '#52c41a' }}>
                                    <CheckCircleOutlined style={{ marginRight: 8 }} />
                                    {getDocumentByType(1).original_filename}
                                </span>
                                <Space>
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<EyeOutlined />}
                                        onClick={() => handlePreviewDocument(getDocumentByType(1).file_path)}
                                    >
                                        Preview
                                    </Button>
                                    <Button
                                        type="text"
                                        danger
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        loading={documentUploading[1]}
                                        onClick={() => handleDocumentDelete(getDocumentByType(1).id, 1)}
                                    >
                                        Remove
                                    </Button>
                                </Space>
                            </div>
                        ) : (
                            <Upload.Dragger
                                accept=".jpg,.jpeg,.png,.pdf"
                                maxCount={1}
                                showUploadList={false}
                                disabled={documentUploading[1]}
                                beforeUpload={(file) => handleDocumentUpload(file, 1)}
                            >
                                {documentUploading[1] ? (
                                    <Spin tip="Uploading..." />
                                ) : (
                                    <>
                                        <p className="ant-upload-text">Click or drag file to upload</p>
                                        <p className="ant-upload-hint">Upload birth certificate or any valid government ID showing date of birth</p>
                                    </>
                                )}
                            </Upload.Dragger>
                        )}
                    </Card>

                    {/* Barangay Certification - Type 2 */}
                    <Card size="small" title={<span>Barangay Certification / Residency: <span style={{ color: '#fa8c16' }}>*</span></span>}>
                        {getDocumentByType(2) ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
                                <span style={{ color: '#52c41a' }}>
                                    <CheckCircleOutlined style={{ marginRight: 8 }} />
                                    {getDocumentByType(2).original_filename}
                                </span>
                                <Space>
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<EyeOutlined />}
                                        onClick={() => handlePreviewDocument(getDocumentByType(2).file_path)}
                                    >
                                        Preview
                                    </Button>
                                    <Button
                                        type="text"
                                        danger
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        loading={documentUploading[2]}
                                        onClick={() => handleDocumentDelete(getDocumentByType(2).id, 2)}
                                    >
                                        Remove
                                    </Button>
                                </Space>
                            </div>
                        ) : (
                            <Upload.Dragger
                                accept=".jpg,.jpeg,.png,.pdf"
                                maxCount={1}
                                showUploadList={false}
                                disabled={documentUploading[2]}
                                beforeUpload={(file) => handleDocumentUpload(file, 2)}
                            >
                                {documentUploading[2] ? (
                                    <Spin tip="Uploading..." />
                                ) : (
                                    <>
                                        <p className="ant-upload-text">Click or drag file to upload</p>
                                        <p className="ant-upload-hint">Certificate of Residency or Barangay Clearance from your barangay</p>
                                    </>
                                )}
                            </Upload.Dragger>
                        )}
                    </Card>

                    {/* COMELEC - Type 3 (Optional) */}
                    <Card size="small" title="Comelec ID / Certification (optional):">
                        {getDocumentByType(3) ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
                                <span style={{ color: '#52c41a' }}>
                                    <CheckCircleOutlined style={{ marginRight: 8 }} />
                                    {getDocumentByType(3).original_filename}
                                </span>
                                <Space>
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<EyeOutlined />}
                                        onClick={() => handlePreviewDocument(getDocumentByType(3).file_path)}
                                    >
                                        Preview
                                    </Button>
                                    <Button
                                        type="text"
                                        danger
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        loading={documentUploading[3]}
                                        onClick={() => handleDocumentDelete(getDocumentByType(3).id, 3)}
                                    >
                                        Remove
                                    </Button>
                                </Space>
                            </div>
                        ) : (
                            <Upload.Dragger
                                accept=".jpg,.jpeg,.png,.pdf"
                                maxCount={1}
                                showUploadList={false}
                                disabled={documentUploading[3]}
                                beforeUpload={(file) => handleDocumentUpload(file, 3)}
                            >
                                {documentUploading[3] ? (
                                    <Spin tip="Uploading..." />
                                ) : (
                                    <>
                                        <p className="ant-upload-text">Click or drag file to upload</p>
                                        <p className="ant-upload-hint">Voter's ID or certification (if available)</p>
                                    </>
                                )}
                            </Upload.Dragger>
                        )}
                    </Card>

                    {/* Senior Photo - Type 4 */}
                    <Card size="small" title={<span>Senior Picture (2x2): <span style={{ color: '#fa8c16' }}>*</span></span>}>
                        {getDocumentByType(4) ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
                                <span style={{ color: '#52c41a' }}>
                                    <CheckCircleOutlined style={{ marginRight: 8 }} />
                                    {getDocumentByType(4).original_filename}
                                </span>
                                <Space>
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<EyeOutlined />}
                                        onClick={() => handlePreviewDocument(getDocumentByType(4).file_path)}
                                    >
                                        Preview
                                    </Button>
                                    <Button
                                        type="text"
                                        danger
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        loading={documentUploading[4]}
                                        onClick={() => handleDocumentDelete(getDocumentByType(4).id, 4)}
                                    >
                                        Remove
                                    </Button>
                                </Space>
                            </div>
                        ) : (
                            <Upload.Dragger
                                accept=".jpg,.jpeg,.png"
                                maxCount={1}
                                showUploadList={false}
                                disabled={documentUploading[4]}
                                beforeUpload={(file) => handleDocumentUpload(file, 4)}
                            >
                                {documentUploading[4] ? (
                                    <Spin tip="Uploading..." />
                                ) : (
                                    <>
                                        <p className="ant-upload-text">Click or drag file to upload</p>
                                        <p className="ant-upload-hint">Recent 2x2 photo of the senior citizen</p>
                                    </>
                                )}
                            </Upload.Dragger>
                        )}
                    </Card>

                    {/* Thumbmark Confirmation */}
                    <Card size="small" title={<span>Thumbmark Verification: <span style={{ color: '#fa8c16' }}>*</span></span>}>
                        <Checkbox
                            checked={thumbmarkConfirmed}
                            onChange={(e) => setThumbmarkConfirmed(e.target.checked)}
                        >
                            This Certifies That the Person has provided thumb mark Information and is Verified by The Personnel In-charge
                        </Checkbox>
                    </Card>
                </div>

                <Divider />
                <Title level={4} style={{ color: '#1890ff', marginBottom: 16 }}>
                    Review &amp; Confirm
                </Title>

                <Descriptions
                    title="Personal Information"
                    bordered
                    column={{ xs: 1, sm: 2 }}
                    size="small"
                    style={{ marginBottom: 24 }}
                >
                    <Descriptions.Item label="Full Name">
                        {`${data.first_name || ''} ${data.middle_name || ''} ${data.last_name || ''} ${data.extension || ''}`.trim() || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Birthdate">
                        {data.birthdate?.format('MMMM D, YYYY') || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Age">
                        {calculatedAge !== null ? (
                            <Space>
                                {`${calculatedAge} years old`}
                                {getAgeCategory(calculatedAge) && (
                                    <Tag color={getAgeCategory(calculatedAge).color}>
                                        {getAgeCategory(calculatedAge).label}
                                    </Tag>
                                )}
                            </Space>
                        ) : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Sex">
                        {selectedGender?.name || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Civil Status">
                        {selectedCivilStatus?.name || '-'}
                    </Descriptions.Item>
                </Descriptions>

                <Descriptions
                    title="Contact & Background"
                    bordered
                    column={{ xs: 1, sm: 2 }}
                    size="small"
                    style={{ marginBottom: 24 }}
                >
                    <Descriptions.Item label="Barangay">
                        {selectedBarangay?.name || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Address">
                        {data.house_number || data.street ? `${data.house_number || ''} ${data.street || ''}`.trim() : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Mobile Number">
                        {data.mobile_number || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Educational Attainment">
                        {selectedEducation?.name || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Monthly Salary">
                        {data.monthly_salary ? `₱${data.monthly_salary.toLocaleString()}` : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Occupation">
                        {data.occupation || '-'}
                    </Descriptions.Item>
                </Descriptions>

                {familyMembers.length > 0 && (
                    <Descriptions
                        title="Family Composition"
                        bordered
                        column={1}
                        size="small"
                        style={{ marginBottom: 24 }}
                    >
                        {familyMembers.map((m, i) => (
                            <Descriptions.Item key={m.id} label={`Member ${i + 1}`}>
                                {`${m.first_name} ${m.middle_name || ''} ${m.last_name}`.trim()}
                                {m.relationship && ` (${m.relationship})`}
                                {m.age && `, Age: ${m.age}`}
                            </Descriptions.Item>
                        ))}
                    </Descriptions>
                )}

                {(data.target_sectors?.length > 0 || data.sub_categories?.length > 0) && (
                    <Descriptions
                        title="Association"
                        bordered
                        column={{ xs: 1, sm: 2 }}
                        size="small"
                        style={{ marginBottom: 24 }}
                    >
                        {data.target_sectors?.length > 0 && (
                            <Descriptions.Item label="Target Sectors">
                                {data.target_sectors.map((s, i) => (
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
                                ))}
                            </Descriptions.Item>
                        )}
                        {data.sub_categories?.length > 0 && (
                            <Descriptions.Item label="Sub-Categories">
                                {data.sub_categories.map((s, i) => (
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
                                ))}
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                )}
            </div>
        );
    };

    // Success View
    const renderSuccess = () => (
        <Result
            status="success"
            title="Application Submitted Successfully!"
            subTitle={
                <div>
                    <p>Application Number: <strong>{submitResult?.application_number}</strong></p>
                    <p>The application has been submitted and is now pending for verification.</p>
                </div>
            }
            extra={[
                <Button
                    type="primary"
                    key="list"
                    onClick={() => navigate('/admin/registration/list')}
                >
                    View All Applications
                </Button>,
                <Button key="new" onClick={() => window.location.reload()}>
                    Submit Another
                </Button>,
            ]}
        />
    );

    const renderStepContent = () => {
        if (currentStep === 4) return renderSuccess();

        switch (currentStep) {
            case 0:
                return renderPersonalInfo();
            case 1:
                return renderFamilyComposition();
            case 2:
                return renderAssociation();
            case 3:
                return renderRequirements();
            default:
                return null;
        }
    };

    if (loading && !lookupOptions) {
        return (
            <div style={{ textAlign: 'center', padding: 100 }}>
                <Spin size="large" />
                <p style={{ marginTop: 16 }}>Loading form...</p>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}>
                    {isEditMode ? `Edit Application ${applicationNumber || ''}` : 'New Senior Citizen Registration'}
                </Title>
                <Text type="secondary">
                    Office of Senior Citizens Affairs
                </Text>
            </div>

            {/* Progress */}
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Step {currentStep + 1} of {steps.length}
                </Text>
            </div>

            {/* Steps */}
            <Card style={{ marginBottom: 24 }}>
                <Steps
                    current={currentStep}
                    items={steps.map((s, i) => ({
                        ...s,
                        status: i < currentStep ? 'finish' : i === currentStep ? 'process' : 'wait',
                    }))}
                    responsive={false}
                    size="small"
                />
            </Card>

            {/* Form Card */}
            <Card>
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={formData}
                    size="large"
                >
                    {renderStepContent()}
                </Form>

                {/* Navigation Buttons */}
                {currentStep < 4 && (
                    <>
                        <Divider />
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Button
                                onClick={handlePrev}
                                disabled={currentStep === 0}
                                icon={<ArrowLeftOutlined />}
                            >
                                Previous
                            </Button>
                            <Space>
                                <Button
                                    onClick={handleSaveAsDraft}
                                    loading={submitting}
                                    style={{ backgroundColor: '#faad14', borderColor: '#faad14', color: '#fff' }}
                                >
                                    Save as Draft
                                </Button>
                                {currentStep === 3 ? (
                                    <Button
                                        type="primary"
                                        onClick={() => handleSubmit(false)}
                                        loading={submitting}
                                        icon={<SaveOutlined />}
                                        style={{ backgroundColor: isFO ? '#1890ff' : '#52c41a', borderColor: isFO ? '#1890ff' : '#52c41a' }}
                                    >
                                        {isFO ? 'Transmit to Main' : 'Register Senior'}
                                    </Button>
                                ) : (
                                    <Button
                                        type="primary"
                                        onClick={handleNext}
                                        icon={<ArrowRightOutlined />}
                                    >
                                        Next
                                    </Button>
                                )}
                            </Space>
                        </div>
                    </>
                )}
            </Card>

            {/* Duplicate Warning Modal */}
            <Modal
                title={
                    <span style={{ color: '#faad14' }}>
                        <WarningOutlined style={{ marginRight: 8 }} />
                        Potential Duplicate Found
                    </span>
                }
                open={showDuplicateWarning}
                onCancel={() => {
                    setShowDuplicateWarning(false);
                    setPendingNextStep(false);
                }}
                footer={[
                    <Button key="cancel" onClick={() => {
                        setShowDuplicateWarning(false);
                        setPendingNextStep(false);
                    }}>
                        Go Back
                    </Button>,
                    <Button key="proceed" type="primary" onClick={handleAcknowledgeDuplicate}>
                        I Verified - Proceed Anyway
                    </Button>,
                ]}
            >
                <Alert
                    type="warning"
                    message="A senior citizen with similar details already exists:"
                    style={{ marginBottom: 16 }}
                />
                {duplicateCheck?.duplicates && (
                    <List
                        size="small"
                        dataSource={duplicateCheck.duplicates}
                        renderItem={(dup) => (
                            <List.Item>
                                <div>
                                    <Text strong>{dup.first_name} {dup.middle_name} {dup.last_name}</Text>
                                    {' '}
                                    <Tag color="blue">OSCA ID: {dup.osca_id || 'Pending'}</Tag>
                                    <br />
                                    <Text type="secondary">
                                        Barangay: {dup.barangay?.name || 'Unknown'}
                                        {' | '}
                                        Status: {dup.is_active ? 'Active' : 'Inactive'}
                                    </Text>
                                </div>
                            </List.Item>
                        )}
                    />
                )}
                <Alert
                    type="info"
                    message="Please verify this is a new applicant before continuing."
                    style={{ marginTop: 16 }}
                />
            </Modal>

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

export default NewApplication;
