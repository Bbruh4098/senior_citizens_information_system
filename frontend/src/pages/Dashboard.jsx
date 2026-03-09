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
import { dashboardApi, benefitsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const COLORS = ['#ff00bfff', '#006fd6ff', '#001427', '#708d81', '#f4d58d', '#bf0603', '#8d0801'];
// const COLORS = ['#1890ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1'];

const Dashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total_seniors: 0,
        active_seniors: 0,
        deceased_seniors: 0,
        pending_applications: 0,
        id_claimable: 0,
        released_ids: 0,
    });
    const [events, setEvents] = useState([]);
    const [ageData, setAgeData] = useState([]);
    const [genderData, setGenderData] = useState([]);
    const [barangayData, setBarangayData] = useState([]);
    const [assistanceData, setAssistanceData] = useState([]);

    const currentYear = new Date().getFullYear();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsRes, eventsRes, ageRes, genderRes, heatmapRes, assistanceRes] = await Promise.all([
                dashboardApi.getStats(),
                dashboardApi.getUpcomingEvents(),
                dashboardApi.getAgeDistribution(),
                dashboardApi.getGenderDistribution(),
                dashboardApi.getHeatmapData(),
                benefitsApi.getDistribution({ year: currentYear }),
            ]);

            const apiStats = statsRes.data.data.stats || {};
            setStats(prev => ({
                ...prev,
                ...apiStats,
            }));
            setEvents(eventsRes.data.data.events);
            setAgeData(ageRes.data.data.distribution);
            setGenderData(genderRes.data.data.distribution);
            setBarangayData(heatmapRes.data.data.distribution || []);
            setAssistanceData(assistanceRes.data.data.distribution || []);
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

    const statusData = [
        { name: 'Active', value: stats.active_seniors || 0 },
        { name: 'Deceased', value: stats.deceased_seniors || 0 },
    ];

    const hasStatusData = statusData.some(item => item.value > 0);

    const sortedAgeData = [...ageData].sort((a, b) => {
        const order = ['60-69', '70-79', '80-89', '90-99', '100+'];
        return order.indexOf(a.age_group) - order.indexOf(b.age_group);
    });

    const topBarangays = barangayData
        .slice()
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
        .map(b => ({
            name: b.name,
            total: b.total,
        }));

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
                                    {stat.title === 'Active Senior Citizens' && (
                                        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                                            of {stats.total_seniors.toLocaleString()} registered
                                        </Text>
                                    )}
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

            {/* Barangay Breakdown */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24}>
                    <Card
                        title="Top Barangays by Registered Seniors"
                        style={{ borderRadius: 12 }}
                        bodyStyle={{ height: 320 }}
                    >
                        {topBarangays.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topBarangays}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="total" name="Registered Seniors" radius={[4, 4, 0, 0]}>
                                        {topBarangays.map((entry, index) => (
                                            <Cell
                                                key={`brgy-cell-${entry.name}`}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Bar>
                                    <Legend
                                        align="right"
                                        verticalAlign="top"
                                        content={() => (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, marginBottom: 4 }}>
                                                {topBarangays.map((item, index) => (
                                                    <span
                                                        key={`brgy-legend-${item.name}`}
                                                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                                    >
                                                        <span
                                                            style={{
                                                                width: 10,
                                                                height: 10,
                                                                borderRadius: 2,
                                                                backgroundColor: COLORS[index % COLORS.length],
                                                            }}
                                                        />
                                                        {item.name} ({item.total.toLocaleString()})
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <Text type="secondary">No data available</Text>
                            </div>
                        )}
                    </Card>
                </Col>
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
                        {sortedAgeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={sortedAgeData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="age_group" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {sortedAgeData.map((entry, index) => (
                                            <Cell
                                                key={`age-cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Bar>
                                    <Legend
                                        align="right"
                                        verticalAlign="top"
                                        content={() => (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, marginBottom: 4 }}>
                                                {sortedAgeData.map((item, index) => (
                                                    <span
                                                        key={`age-legend-${item.age_group}`}
                                                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                                    >
                                                        <span
                                                            style={{
                                                                width: 10,
                                                                height: 10,
                                                                borderRadius: 2,
                                                                backgroundColor: COLORS[index % COLORS.length],
                                                            }}
                                                        />
                                                        {item.age_group} ({item.count.toLocaleString()})
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    />
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
                                    <Legend
                                        formatter={(value, entry) => {
                                            const item = genderData.find(d => d.gender === value);
                                            const count = item ? item.count : 0;
                                            return `${value} (${count.toLocaleString()})`;
                                        }}
                                    />
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

            {/* Status & Assistance Row */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {/* Active vs Deceased */}
                <Col xs={24} lg={12}>
                    <Card
                        title="Active vs Deceased Seniors"
                        style={{ borderRadius: 12 }}
                        bodyStyle={{ height: 300 }}
                    >
                        {hasStatusData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        dataKey="value"
                                        nameKey="name"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell
                                                key={`status-cell-${index}`}
                                                fill={index === 0 ? '#52c41a' : '#bf0603'}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend
                                        formatter={(value) => {
                                            const item = statusData.find(s => s.name === value);
                                            const count = item ? item.value : 0;
                                            return `${value} (${count.toLocaleString()})`;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <Text type="secondary">No data available</Text>
                            </div>
                        )}
                    </Card>
                </Col>

                {/* Assistance Distribution */}
                <Col xs={24} lg={12}>
                    <Card
                        title={`Assistance Distribution by Benefit Type (${currentYear})`}
                        style={{ borderRadius: 12 }}
                        bodyStyle={{ height: 300 }}
                    >
                        {assistanceData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={assistanceData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar
                                        dataKey="total_claims"
                                        name="Total Claims"
                                        radius={[4, 4, 0, 0]}
                                    >
                                        {assistanceData.map((entry, index) => (
                                            <Cell
                                                key={`assist-cell-${entry.benefit_type_id || entry.name}`}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Bar>
                                    <Legend
                                        align="right"
                                        verticalAlign="top"
                                        content={() => (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, marginBottom: 4 }}>
                                                {assistanceData.map((item, index) => (
                                                    <span
                                                        key={`assist-legend-${item.benefit_type_id || item.name}`}
                                                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                                    >
                                                        <span
                                                            style={{
                                                                width: 10,
                                                                height: 10,
                                                                borderRadius: 2,
                                                                backgroundColor: COLORS[index % COLORS.length],
                                                            }}
                                                        />
                                                        {item.name} ({(item.total_claims || 0).toLocaleString()})
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    />
                                </BarChart>
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
