import { Link } from 'react-router-dom';
import { Row, Col, Card, Typography, Button, List, Tabs } from 'antd';
import {
    IdcardOutlined,
    GiftOutlined,
    FileTextOutlined,
    MedicineBoxOutlined,
    CarOutlined,
    ShopOutlined,
    HomeOutlined,
    PhoneOutlined,
    RightOutlined,
    CheckCircleOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const services = [
    {
        icon: <IdcardOutlined style={{ fontSize: 36 }} />,
        title: 'Senior Citizen ID Registration',
        description: 'Get your official OSCA ID to access discounts and benefits.',
        features: [
            'Free registration for applicants',
            'Valid ID accepted nationwide',
            'Includes QR code for verification',
            'Replacement available for lost/damaged IDs',
        ],
        color: '#4338ca',
        link: '/apply',
        cta: 'Apply Now',
    },
    {
        icon: <GiftOutlined style={{ fontSize: 36 }} />,
        title: 'Cash Gift Programs',
        description: 'Monetary assistance for seniors reaching milestone ages.',
        features: [
            'Octogenarian (80+): ₱10,000',
            'Nonagenarian (90+): ₱10,000',
            'Centenarian (100+): ₱100,000',
            'Annual claims available',
        ],
        color: '#059669',
        link: '/contact',
        cta: 'Learn More',
    },
    {
        icon: <FileTextOutlined style={{ fontSize: 36 }} />,
        title: 'Complaints & Assistance',
        description: 'File complaints against establishments violating RA 9994.',
        features: [
            'Report discount violations',
            'Assistance for discrimination cases',
            'Legal support and guidance',
            'Confidential handling',
        ],
        color: '#dc2626',
        link: '/contact',
        cta: 'Contact Us',
    },
];

const discounts = [
    { icon: <MedicineBoxOutlined />, title: 'Medicine', desc: '20% discount + VAT exemption on prescription drugs' },
    { icon: <ShopOutlined />, title: 'Restaurants', desc: '20% discount on food, beverages, and dining' },
    { icon: <CarOutlined />, title: 'Transportation', desc: '20% discount on fares (air, sea, land)' },
    { icon: <HomeOutlined />, title: 'Utilities', desc: '5% discount on monthly water and electricity' },
    { icon: <PhoneOutlined />, title: 'Telco', desc: '5% discount on phone and internet bills' },
];

const requirementTabs = [
    {
        key: 'new',
        label: 'New Applicants',
        items: [
            'Birth Certificate / Valid ID with Date of Birth',
            'Barangay Certification',
            'COMELEC ID / Certification (Optional)',
            'Recent Picture (2x2)',
        ],
    },
    {
        key: 'renewal',
        label: 'Renewal',
        items: [
            'Birth Certificate / Valid ID with Date of Birth',
            'Barangay Certification',
            'Recent Picture (2x2)',
            'Photocopy of Old Senior Citizen ID Card',
        ],
    },
    {
        key: 'lost',
        label: 'Replacement (Lost)',
        items: [
            'Birth Certificate / Valid ID with Date of Birth',
            'Barangay Certification',
            'Recent Picture (2x2)',
            'Affidavit of Loss',
        ],
    },
    {
        key: 'damaged',
        label: 'Replacement (Damaged)',
        items: [
            'Birth Certificate / Valid ID with Date of Birth',
            'Barangay Certification',
            'Recent Picture (2x2)',
            'Photocopy of Damaged Senior Citizen ID Card',
        ],
    },
];

const Services = () => {
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
                    <Title level={1} style={{ color: 'white', marginBottom: 16 }}>Our Services</Title>
                    <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18 }}>
                        OSCA provides various programs and services to support the welfare of senior citizens.
                    </Paragraph>
                </div>
            </section>

            {/* Main Services */}
            <section style={{ padding: '80px 24px', background: 'white' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <Row gutter={[32, 32]}>
                        {services.map((service, index) => (
                            <Col xs={24} lg={8} key={index}>
                                <Card
                                    style={{
                                        height: '100%',
                                        borderRadius: 16,
                                        border: `1px solid ${service.color}20`,
                                        overflow: 'hidden',
                                    }}
                                    bodyStyle={{ padding: 0 }}
                                >
                                    <div style={{
                                        background: `${service.color}10`,
                                        padding: 32,
                                        borderBottom: `1px solid ${service.color}20`,
                                    }}>
                                        <div style={{
                                            width: 72,
                                            height: 72,
                                            background: `${service.color}15`,
                                            borderRadius: 16,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: service.color,
                                            marginBottom: 20,
                                        }}>
                                            {service.icon}
                                        </div>
                                        <Title level={4} style={{ marginBottom: 8 }}>{service.title}</Title>
                                        <Paragraph style={{ color: '#6b7280', marginBottom: 0 }}>
                                            {service.description}
                                        </Paragraph>
                                    </div>
                                    <div style={{ padding: 24 }}>
                                        <List
                                            size="small"
                                            dataSource={service.features}
                                            renderItem={(item) => (
                                                <List.Item style={{ border: 'none', padding: '6px 0' }}>
                                                    <CheckCircleOutlined style={{ color: service.color, marginRight: 8 }} />
                                                    <Text style={{ color: '#4b5563' }}>{item}</Text>
                                                </List.Item>
                                            )}
                                        />
                                        <Link to={service.link}>
                                            <Button
                                                type="primary"
                                                block
                                                style={{
                                                    marginTop: 16,
                                                    background: service.color,
                                                    border: 'none',
                                                    height: 44,
                                                    borderRadius: 8,
                                                }}
                                            >
                                                {service.cta} <RightOutlined />
                                            </Button>
                                        </Link>
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </div>
            </section>

            {/* Discounts & Privileges */}
            <section style={{ padding: '80px 24px', background: '#f9fafb' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 48 }}>
                        <Text style={{ color: '#4338ca', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: 13 }}>
                            Republic Act 9994
                        </Text>
                        <Title level={2} style={{ marginTop: 8 }}>Discounts & Privileges</Title>
                        <Paragraph style={{ color: '#6b7280', fontSize: 16, maxWidth: 600, margin: '0 auto' }}>
                            As a registered senior citizen, you are entitled to these benefits under the law.
                        </Paragraph>
                    </div>
                    <Row gutter={[24, 24]} justify="center">
                        {discounts.map((item, index) => (
                            <Col xs={12} sm={8} lg={4} key={index} style={{ display: 'flex' }}>
                                <Card
                                    style={{ textAlign: 'center', borderRadius: 12, width: '100%' }}
                                    bodyStyle={{ padding: 20 }}
                                >
                                    <div style={{
                                        width: 56,
                                        height: 56,
                                        background: '#eef2ff',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 12px',
                                        fontSize: 24,
                                        color: '#4338ca',
                                    }}>
                                        {item.icon}
                                    </div>
                                    <Title level={5} style={{ marginBottom: 4 }}>{item.title}</Title>
                                    <Text style={{ color: '#6b7280', fontSize: 12 }}>{item.desc}</Text>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </div>
            </section>

            {/* Requirements */}
            <section style={{ padding: '80px 24px', background: 'white' }}>
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 40 }}>
                        <Title level={2}>Requirements for ID Application</Title>
                    </div>
                    <Card style={{ borderRadius: 16, background: '#fafafa' }}>
                        <Tabs
                            centered
                            items={requirementTabs.map(tab => ({
                                key: tab.key,
                                label: tab.label,
                                children: (
                                    <List
                                        dataSource={tab.items}
                                        renderItem={(item) => (
                                            <List.Item style={{ border: 'none', padding: '6px 0' }}>
                                                <CheckCircleOutlined style={{ color: '#059669', marginRight: 8 }} />
                                                {item}
                                            </List.Item>
                                        )}
                                    />
                                ),
                            }))}
                        />
                    </Card>
                </div>
            </section>
        </div>
    );
};

export default Services;
