import { Row, Col, Card, Typography, Form, Input, Button, message } from 'antd';
import {
    PhoneOutlined,
    MailOutlined,
    EnvironmentOutlined,
    ClockCircleOutlined,
    SendOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const Contact = () => {
    const [form] = Form.useForm();

    const handleSubmit = (values) => {
        console.log('Contact form:', values);
        message.success('Thank you for your message! We will get back to you soon.');
        form.resetFields();
    };

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
                    <Title level={1} style={{ color: 'white', marginBottom: 16 }}>Contact Us</Title>
                    <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18 }}>
                        Have questions? We're here to help. Reach out to us through any of the channels below.
                    </Paragraph>
                </div>
            </section>

            {/* Contact Cards */}
            <section style={{ padding: '80px 24px', background: 'white' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <Row gutter={[32, 32]}>
                        {/* Contact Info */}
                        <Col xs={24} lg={10}>
                            <div style={{ marginBottom: 32 }}>
                                <Title level={3}>Get in Touch</Title>
                                <Paragraph style={{ color: '#6b7280' }}>
                                    Visit our office or contact us through phone or email.
                                    Our staff is ready to assist you with any inquiries.
                                </Paragraph>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                <Card style={{ borderRadius: 12, background: '#f9fafb' }}>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <div style={{
                                            width: 48,
                                            height: 48,
                                            background: '#eef2ff',
                                            borderRadius: 12,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <EnvironmentOutlined style={{ fontSize: 20, color: '#4338ca' }} />
                                        </div>
                                        <div>
                                            <Text strong>Address</Text>
                                            <Paragraph style={{ marginBottom: 0, color: '#6b7280' }}>
                                                OSCA Building, City Hall Complex<br />
                                                Zamboanga City, 7000<br />
                                                Philippines
                                            </Paragraph>
                                        </div>
                                    </div>
                                </Card>

                                <Card style={{ borderRadius: 12, background: '#f9fafb' }}>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <div style={{
                                            width: 48,
                                            height: 48,
                                            background: '#ecfdf5',
                                            borderRadius: 12,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <PhoneOutlined style={{ fontSize: 20, color: '#059669' }} />
                                        </div>
                                        <div>
                                            <Text strong>Phone</Text>
                                            <Paragraph style={{ marginBottom: 0, color: '#6b7280' }}>
                                                (062) 991-0362<br />
                                                (062) 992-1234
                                            </Paragraph>
                                        </div>
                                    </div>
                                </Card>

                                <Card style={{ borderRadius: 12, background: '#f9fafb' }}>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <div style={{
                                            width: 48,
                                            height: 48,
                                            background: '#fef2f2',
                                            borderRadius: 12,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <MailOutlined style={{ fontSize: 20, color: '#dc2626' }} />
                                        </div>
                                        <div>
                                            <Text strong>Email</Text>
                                            <Paragraph style={{ marginBottom: 0, color: '#6b7280' }}>
                                                osca@zamboanga.gov.ph<br />
                                                support@scis.zamboanga.gov.ph
                                            </Paragraph>
                                        </div>
                                    </div>
                                </Card>

                                <Card style={{ borderRadius: 12, background: '#f9fafb' }}>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <div style={{
                                            width: 48,
                                            height: 48,
                                            background: '#fef3c7',
                                            borderRadius: 12,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <ClockCircleOutlined style={{ fontSize: 20, color: '#d97706' }} />
                                        </div>
                                        <div>
                                            <Text strong>Office Hours</Text>
                                            <Paragraph style={{ marginBottom: 0, color: '#6b7280' }}>
                                                Monday - Friday: 8:00 AM - 5:00 PM<br />
                                                Saturday - Sunday: Closed
                                            </Paragraph>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </Col>

                        {/* Contact Form */}
                        <Col xs={24} lg={14}>
                            <Card style={{ borderRadius: 16, border: '1px solid #e5e7eb' }}>
                                <Title level={4} style={{ marginBottom: 24 }}>Send us a Message</Title>
                                <Form
                                    form={form}
                                    layout="vertical"
                                    onFinish={handleSubmit}
                                >
                                    <Row gutter={16}>
                                        <Col xs={24} sm={12}>
                                            <Form.Item
                                                name="name"
                                                label="Full Name"
                                                rules={[{ required: true, message: 'Please enter your name' }]}
                                            >
                                                <Input size="large" placeholder="Juan Dela Cruz" style={{ borderRadius: 8 }} />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Form.Item
                                                name="email"
                                                label="Email"
                                                rules={[
                                                    { required: true, message: 'Please enter your email' },
                                                    { type: 'email', message: 'Please enter a valid email' },
                                                ]}
                                            >
                                                <Input size="large" placeholder="juan@example.com" style={{ borderRadius: 8 }} />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Form.Item
                                        name="phone"
                                        label="Phone Number"
                                        rules={[{ required: true, message: 'Please enter your phone number' }]}
                                    >
                                        <Input size="large" placeholder="09XX XXX XXXX" style={{ borderRadius: 8 }} />
                                    </Form.Item>
                                    <Form.Item
                                        name="subject"
                                        label="Subject"
                                        rules={[{ required: true, message: 'Please enter a subject' }]}
                                    >
                                        <Input size="large" placeholder="How can we help you?" style={{ borderRadius: 8 }} />
                                    </Form.Item>
                                    <Form.Item
                                        name="message"
                                        label="Message"
                                        rules={[{ required: true, message: 'Please enter your message' }]}
                                    >
                                        <TextArea
                                            rows={5}
                                            placeholder="Type your message here..."
                                            style={{ borderRadius: 8 }}
                                        />
                                    </Form.Item>
                                    <Form.Item style={{ marginBottom: 0 }}>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            size="large"
                                            icon={<SendOutlined />}
                                            style={{
                                                background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
                                                border: 'none',
                                                borderRadius: 8,
                                                height: 48,
                                                paddingInline: 32,
                                            }}
                                        >
                                            Send Message
                                        </Button>
                                    </Form.Item>
                                </Form>
                            </Card>
                        </Col>
                    </Row>
                </div>
            </section>

            {/* Map */}
            <section style={{ padding: '0 24px 80px', background: 'white' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <Card style={{ borderRadius: 16, overflow: 'hidden', padding: 0 }} bodyStyle={{ padding: 0 }}>
                        <iframe
                            title="OSCA Location"
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3959.4481!2d122.0775!3d6.9042!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x325040b0b0b0b0b1%3A0x0!2sZamboanga+City+Hall!5e0!3m2!1sen!2sph!4v1234567890"
                            width="100%"
                            height="350"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    </Card>
                </div>
            </section>
        </div>
    );
};

export default Contact;
