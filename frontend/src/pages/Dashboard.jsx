import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Typography, Spin, Space, Tag } from 'antd';
import {
    UserOutlined,
    FileTextOutlined,
    IdcardOutlined,
    CheckCircleOutlined,
    CalendarOutlined,
    EnvironmentOutlined,
} from '@ant-design/icons';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const COLORS = ['#ff00bfff', '#006fd6ff', '#001427', '#708d81', '#f4d58d', '#bf0603', '#8d0801'];
// const COLORS = ['#1890ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1'];

const Dashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        active_seniors: 0,
        pending_applications: 0,
        id_claimable: 0,
        released_ids: 0,
    });
    const [events, setEvents] = useState([]);
    const [ageData, setAgeData] = useState([]);
    const [genderData, setGenderData] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsRes, eventsRes, ageRes, genderRes] = await Promise.all([
                dashboardApi.getStats(),
                dashboardApi.getUpcomingEvents(),
                dashboardApi.getAgeDistribution(),
                dashboardApi.getGenderDistribution(),
            ]);

            setStats(statsRes.data.data.stats);
            setEvents(eventsRes.data.data.events);
            setAgeData(ageRes.data.data.distribution);
            setGenderData(genderRes.data.data.distribution);
        } catch (error) {
            console.error('Dashboard data fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Active Senior Citizens',
            value: stats.active_seniors,
            icon: <UserOutlined />,
            bgColor: '#001427',
            iconBg: '#0a2540',
        },
        {
            title: 'Pending Applications',
            value: stats.pending_applications,
            icon: <FileTextOutlined />,
            bgColor: '#bf0603',
            iconBg: '#d41b18',
        },
        {
            title: 'IDs Ready for Claim',
            value: stats.id_claimable,
            icon: <IdcardOutlined />,
            bgColor: '#708d81',
            iconBg: '#849e93',
        },
        {
            title: 'Released IDs',
            value: stats.released_ids,
            icon: <CheckCircleOutlined />,
            bgColor: '#8d0801',
            iconBg: '#a31a13',
        },
    ];

    const eventColumns = [
        {
            title: 'Event',
            dataIndex: 'title',
            key: 'title',
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type) => <Tag color="blue">{type}</Tag>,
        },
        {
            title: 'Date',
            dataIndex: 'event_date',
            key: 'event_date',
            render: (date) => (
                <Space>
                    <CalendarOutlined />
                    {date || 'TBD'}
                </Space>
            ),
        },
        {
            title: 'Location',
            dataIndex: 'location',
            key: 'location',
            render: (loc) => loc ? (
                <Space>
                    <EnvironmentOutlined />
                    {loc}
                </Space>
            ) : '-',
        },
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div>
            {/* Welcome Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}>
                    Welcome back, {user?.full_name?.split(' ')[0] || 'Admin'}!
                </Title>
                <Text type="secondary">
                    Here's what's happening with OSCA today.
                </Text>
            </div>

            {/* Stat Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {statCards.map((stat, index) => (
                    <Col xs={24} sm={12} lg={6} key={index}>
                        <Card
                            style={{
                                background: stat.bgColor,
                                border: 'none',
                                borderRadius: 8,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                            }}
                            bodyStyle={{ padding: 20 }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 500 }}>
                                        {stat.title}
                                    </Text>
                                    <div style={{ fontSize: 28, fontWeight: 600, color: '#fff', marginTop: 8 }}>
                                        {stat.value.toLocaleString()}
                                    </div>
                                </div>
                                <div style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 8,
                                    background: stat.iconBg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 24,
                                    color: '#fff',
                                }}>
                                    {stat.icon}
                                </div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Charts Row */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {/* Age Distribution */}
                <Col xs={24} lg={12}>
                    <Card
                        title="Age Distribution"
                        style={{ borderRadius: 12 }}
                        bodyStyle={{ height: 300 }}
                    >
                        {ageData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[...ageData].sort((a, b) => {
                                    const order = ['60-69', '70-79', '80-89', '90-99', '100+'];
                                    return order.indexOf(a.age_group) - order.indexOf(b.age_group);
                                })}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="age_group" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#001427" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <Text type="secondary">No data available</Text>
                            </div>
                        )}
                    </Card>
                </Col>

                {/* Gender Distribution */}
                <Col xs={24} lg={12}>
                    <Card
                        title="Gender Distribution"
                        style={{ borderRadius: 12 }}
                        bodyStyle={{ height: 300 }}
                    >
                        {genderData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={genderData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        dataKey="count"
                                        nameKey="gender"
                                        label={({ gender, percent }) => `${gender} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {genderData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <Text type="secondary">No data available</Text>
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Upcoming Events */}
            <Card
                title="Upcoming Events"
                style={{ borderRadius: 12 }}
            >
                <Table
                    columns={eventColumns}
                    dataSource={events}
                    rowKey="id"
                    pagination={false}
                    locale={{ emptyText: 'No upcoming events' }}
                />
            </Card>
        </div>
    );
};

export default Dashboard;
