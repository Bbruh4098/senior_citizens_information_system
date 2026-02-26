import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown, Typography, Space, Drawer, Grid } from 'antd';
import {
    DashboardOutlined,
    UserOutlined,
    TeamOutlined,
    FileTextOutlined,
    PrinterOutlined,
    NotificationOutlined,
    ExclamationCircleOutlined,
    FolderOutlined,
    HeatMapOutlined,
    SettingOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    MenuOutlined,
    GiftOutlined,
    CloseOutlined,
    AuditOutlined,
    DatabaseOutlined,
    BankOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const AdminLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [openKeys, setOpenKeys] = useState(() => {
        const path = window.location.pathname;
        if (path.startsWith('/admin/benefits')) return ['/admin/benefits-menu'];
        if (path.startsWith('/admin/registration')) return ['/admin/registration'];
        if (path.startsWith('/admin/settings') || path.startsWith('/admin/accounts')) return ['/admin/settings'];
        return ['/admin/registration'];
    });
    const { user, logout, isMainAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const screens = useBreakpoint();

    // Determine if mobile view
    const isMobile = !screens.md;

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Get user role
    const userRole = user?.role_id || 3;
    const isFO = userRole === 2;

    // Build menu items based on role
    const menuItems = [
        {
            key: '/admin/dashboard',
            icon: <DashboardOutlined />,
            label: 'Dashboard',
        },
        {
            key: '/admin/registration',
            icon: <FileTextOutlined />,
            label: 'Registration',
            children: [
                { key: '/admin/registration/new', label: 'New ID' },
                { key: '/admin/registration/renew', label: 'Renew ID' },
                { key: '/admin/registration/replace-lost', label: 'Replace Lost ID' },
                { key: '/admin/registration/replace-damaged', label: 'Replace Damaged ID' },
                { key: '/admin/registration/list', label: 'Application List' },
            ],
        },
        {
            key: '/admin/pre-registrations',
            icon: <FileTextOutlined />,
            label: 'Online Applications',
        },
        {
            key: '/admin/seniors',
            icon: <TeamOutlined />,
            label: 'Senior Citizens',
        },
        // ID Printing only for Main Admin
        ...(!isFO ? [{
            key: '/admin/id-printing',
            icon: <PrinterOutlined />,
            label: 'ID Printing',
        }] : []),
        {
            key: '/admin/benefits-menu',
            icon: <GiftOutlined />,
            label: 'Benefits',
            children: [
                { key: '/admin/benefits', label: 'Benefits Eligibility & Claims' },
                ...(isMainAdmin() ? [{ key: '/admin/benefits/configuration', label: 'Benefits Configuration' }] : []),
            ],
        },
        {
            key: '/admin/complaints',
            icon: <ExclamationCircleOutlined />,
            label: 'Complaints',
        },
        {
            key: '/admin/announcements',
            icon: <NotificationOutlined />,
            label: 'Announcements',
        },
        // Archives and Heat Map - View only for FO
        {
            key: '/admin/archives',
            icon: <FolderOutlined />,
            label: 'Archives',
        },
        {
            key: '/admin/heatmap',
            icon: <HeatMapOutlined />,
            label: 'Heat Map',
        },
        // Settings only for Main Admin
        ...(isMainAdmin() ? [{
            key: '/admin/settings',
            icon: <SettingOutlined />,
            label: 'Settings',
            children: [
                { key: '/admin/accounts', icon: <UserOutlined />, label: 'Accounts' },
                { key: '/admin/settings/branches', icon: <BankOutlined />, label: 'Field Offices and Barangays' },
                { key: '/admin/settings/data-management', icon: <DatabaseOutlined />, label: 'Data Management' },
                { key: '/admin/audit-log', icon: <AuditOutlined />, label: 'Audit Log' },
            ],
        }] : []),
    ];

    const userMenuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Profile',
        },
        {
            type: 'divider',
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Logout',
            danger: true,
            onClick: handleLogout,
        },
    ];

    const getRoleBadgeColor = (roleId) => {
        switch (roleId) {
            case 1: return '#52c41a'; // Main Admin - Green
            case 2: return '#1890ff'; // FO Admin - Blue
            case 3: return '#faad14'; // Barangay Admin - Gold
            default: return '#8c8c8c';
        }
    };

    // Sidebar content (shared between desktop sider and mobile drawer)
    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div style={{
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background: 'rgba(255, 255, 255, 0.05)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
                <img
                    src="/images/osca_logo.jpg"
                    alt="OSCA Logo"
                    style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }}
                />
                {(!collapsed || isMobile) && (
                    <Text strong style={{ color: '#fff', fontSize: 18 }}>
                        SCIS Admin
                    </Text>
                )}
            </div>

            {/* Navigation Menu */}
            <Menu
                theme="dark"
                mode="inline"
                selectedKeys={[location.pathname]}
                openKeys={openKeys}
                onOpenChange={(keys) => setOpenKeys(keys)}
                items={menuItems}
                onClick={({ key }) => {
                    // Only navigate if clicking on a leaf item (not a parent with children)
                    const isParentItem = menuItems.some(item => item.key === key && item.children);
                    if (!isParentItem) {
                        navigate(key);
                        if (isMobile) setMobileMenuOpen(false);
                    }
                }}
                style={{
                    background: 'transparent',
                    borderRight: 0,
                    marginTop: 8,
                }}
            />
        </>
    );

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* Desktop Sidebar */}
            {!isMobile && (
                <Sider
                    trigger={null}
                    collapsible
                    collapsed={collapsed}
                    width={260}
                    collapsedWidth={80}
                    style={{
                        background: '#DA1E37',
                        boxShadow: '2px 0 8px rgba(0, 0, 0, 1)',
                        position: 'fixed',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        zIndex: 101,
                        overflow: 'auto',
                    }}
                >
                    <SidebarContent />
                </Sider>
            )}

            {/* Mobile Drawer */}
            <Drawer
                placement="left"
                open={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                width={280}
                styles={{
                    body: { padding: 0, background: '#DA1E37' },
                    header: { display: 'none' },
                }}
            >
                <div style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    zIndex: 10,
                }}>
                    <Button
                        type="text"
                        icon={<CloseOutlined style={{ color: 'white' }} />}
                        onClick={() => setMobileMenuOpen(false)}
                    />
                </div>
                <SidebarContent />
            </Drawer>

            <Layout style={{ marginLeft: isMobile ? 0 : (collapsed ? 80 : 260), transition: 'margin-left 0.2s' }}>
                {/* Header */}
                <Header style={{
                    padding: isMobile ? '0 12px' : '0 24px',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    height: 64,
                }}>
                    {isMobile ? (
                        <Button
                            type="text"
                            icon={<MenuOutlined />}
                            onClick={() => setMobileMenuOpen(true)}
                            style={{ fontSize: 18 }}
                        />
                    ) : (
                        <Button
                            type="text"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{ fontSize: 18 }}
                        />
                    )}

                    <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                        <Space style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 8, transition: 'background 0.2s' }}>
                            <Avatar
                                style={{
                                    background: '#006fd6',
                                }}
                                icon={<UserOutlined />}
                            />
                            {!isMobile && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.3 }}>
                                    <Text strong style={{ fontSize: 13 }}>{user?.full_name || 'User'}</Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>{user?.role_name || 'Admin'}</Text>
                                </div>
                            )}
                        </Space>
                    </Dropdown>
                </Header>

                {/* Main Content */}
                <Content style={{
                    margin: isMobile ? 8 : 24,
                    padding: isMobile ? 12 : 24,
                    background: '#fff',
                    borderRadius: 8,
                    minHeight: 'calc(100vh - 112px)',
                    overflow: 'auto',
                }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default AdminLayout;
