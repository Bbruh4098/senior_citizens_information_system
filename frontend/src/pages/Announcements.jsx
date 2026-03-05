import React, { useState, useEffect } from "react";
import {
  Table, Card, Input, Select, Button, Space, Tag, Row, Col,
  Typography, Modal, Form, DatePicker, message, Popconfirm, Upload, List, Grid,
} from "antd";
import {
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  NotificationOutlined, CalendarOutlined, EnvironmentOutlined,
  PaperClipOutlined, UploadOutlined,
} from "@ant-design/icons";
import { announcementsApi } from "../services/api";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

const Announcements = () => {
  const screens = useBreakpoint();
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [types, setTypes] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    is_published: null,
  });
  const [formModal, setFormModal] = useState({
    visible: false,
    mode: "create",
    item: null,
  });
  const [form] = Form.useForm();
  const [mediaList, setMediaList] = useState([]);
  const [mediaUploading, setMediaUploading] = useState(false);

  // --- Data Fetching ---
  useEffect(() => {
    fetchAnnouncements();
    fetchTypes();
  }, []);

  const fetchAnnouncements = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: pageSize,
        search: filters.search,
        ...(filters.is_published !== null && { is_published: filters.is_published }),
      };
      const response = await announcementsApi.getList(params);
      const { data, current_page, per_page, total } = response.data.data;
      setAnnouncements(data);
      setPagination({ current: current_page, pageSize: per_page, total });
    } catch (error) {
      console.error("Error:", error);
      message.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  const fetchTypes = async () => {
    try {
      const response = await announcementsApi.getTypes();
      setTypes(response.data.data);
    } catch (error) {
      console.error("Error fetching types:", error);
    }
  };

  // --- Event Handlers ---
  const handleTableChange = (paginationConfig) => {
    fetchAnnouncements(paginationConfig.current, paginationConfig.pageSize);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchAnnouncements(1);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [filters]);

  // --- Modal Logic ---
  const closeModal = () => {
    setFormModal({ visible: false, mode: "create", item: null });
    form.resetFields();
    setMediaList([]);
  };

  const openCreateModal = () => {
    form.resetFields();
    setMediaList([]);
    setFormModal({ visible: true, mode: "create", item: null });
  };

  const openEditModal = (item) => {
    const mappedItem = {
      ...item,
      content: item.description,
      event_date: item.event_date ? dayjs(item.event_date) : null,
    };
    form.setFieldsValue(mappedItem);
    setFormModal({ visible: true, mode: "edit", item: mappedItem });
    loadMedia(item.id);
  };

  const loadMedia = async (announcementId) => {
    try {
      const res = await announcementsApi.getMedia(announcementId);
      setMediaList(res.data.data || []);
    } catch (error) {
      console.error("Failed to load media", error);
    }
  };

  const processSubmit = async (values, isPublished) => {
    try {
      const data = {
        ...values,
        event_date: values.event_date ? values.event_date.format("YYYY-MM-DD") : null,
        is_published: isPublished,
      };

      if (formModal.mode === "create") {
        const res = await announcementsApi.create(data);
        const createdId = res.data?.data?.id;
        if (createdId && mediaList.length > 0) {
          for (const media of mediaList) {
            if (media.originFileObj) {
              const formData = new FormData();
              formData.append("file", media.originFileObj);
              await announcementsApi.uploadMedia(createdId, formData);
            }
          }
        }
        message.success(isPublished ? "Announcement published" : "Draft saved");
      } else {
        await announcementsApi.update(formModal.item.id, data);
        message.success(isPublished ? "Announcement updated" : "Draft updated");
      }
      fetchAnnouncements(pagination.current);
      closeModal();
    } catch (error) {
      if (error.response?.status === 422 && isPublished) {
        message.error("Please fill in all required fields before publishing.");
      } else {
        message.error("Failed to save announcement");
      }
    }
  };

  const handleSubmit = async (values) => {
    await processSubmit(values, true);
  };

  const handleCancel = () => {
    if (!form.isFieldsTouched()) {
      closeModal();
      return;
    }
    if (formModal.item?.is_published) {
      Modal.confirm({
        title: "Discard Changes?",
        content: "You have unsaved changes. Exit without saving?",
        okText: "Discard",
        okType: 'danger',
        onOk: () => closeModal(),
      });
      return;
    }
    Modal.confirm({
      title: "Save as Draft?",
      content: "You have unsaved changes. Would you like to save as a draft?",
      okText: "Save as Draft",
      cancelText: "Discard",
      onOk: async () => {
        const values = form.getFieldsValue();
        await processSubmit(values, false);
      },
      onCancel: () => closeModal(),
    });
  };

  const handleDelete = async (id) => {
    try {
      await announcementsApi.delete(id);
      message.success("Announcement deleted");
      fetchAnnouncements(pagination.current);
    } catch (error) {
      message.error("Failed to delete");
    }
  };

  // --- Table Columns Configuration ---
  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (title, record) => (
        <div>
          <Text strong>{title}</Text>
          <br />
          {/* Show Type and Status on Mobile as sub-info */}
          {!screens.md && (
            <Space size={4} style={{ marginTop: 4 }} wrap>
              {record.type && <Tag color="blue" style={{ fontSize: '10px' }}>{record.type.name}</Tag>}
              <Tag color={record.is_published ? "green" : "default"} style={{ fontSize: '10px' }}>
                {record.is_published ? "Live" : "Draft"}
              </Tag>
            </Space>
          )}
          {/* Only show type in its own tag for desktop */}
          {screens.md && record.type && <Tag color="blue">{record.type.name}</Tag>}
        </div>
      ),
    },
    {
      title: "Content",
      dataIndex: "description",
      key: "description",
      width: 300,
      responsive: ['md'], // Hide on mobile/tablet
      render: (content) => (
        <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0, fontSize: 13 }}>
          {content}
        </Paragraph>
      ),
    },
    {
      title: "Event",
      key: "event",
      width: 150,
      responsive: ['lg'], // Hide on smaller screens
      render: (_, record) =>
        record.event_date ? (
          <Space direction="vertical" size={0}>
            <Space size={4}>
              <CalendarOutlined />
              <Text style={{ fontSize: 12 }}>{record.event_date}</Text>
            </Space>
            {record.location && (
              <Space size={4}>
                <EnvironmentOutlined />
                <Text type="secondary" style={{ fontSize: 12 }}>{record.location}</Text>
              </Space>
            )}
          </Space>
        ) : "-",
    },
    {
      title: "Status",
      dataIndex: "is_published",
      key: "is_published",
      width: 100,
      responsive: ['md'], // Hide on mobile
      render: (published) => (
        <Tag color={published ? "green" : "default"}>
          {published ? "Published" : "Draft"}
        </Tag>
      ),
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      responsive: ['xl'], // Only show on very large screens
      render: (date) => (date ? dayjs(date).format("MMM D, YYYY") : "-"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: 'right', // Keep sticky on mobile horizontal scroll
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          />
          {/* Only show delete icon button if screen is at least medium */}
          {screens.md && (
            <Popconfirm
              title="Delete this announcement?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="text" icon={<DeleteOutlined />} danger />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: screens.xs ? '8px' : '0px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={screens.xs ? 4 : 3} style={{ margin: 0 }}>
          <NotificationOutlined /> Announcements
        </Title>
        <Text type="secondary">
          Manage announcements and events for senior citizens
        </Text>
      </div>

      <Card style={{ marginBottom: 16, borderRadius: 8 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={10} md={10}>
            <Input
              placeholder="Search announcements..."
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              allowClear
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </Col>
          <Col xs={12} sm={6} md={6}>
            <Select
              placeholder="Status"
              style={{ width: "100%" }}
              allowClear
              value={filters.is_published}
              onChange={(value) => handleFilterChange('is_published', value === undefined ? null : value)}
            >
              <Option value={1}>Published</Option>
              <Option value={0}>Draft</Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={8} style={{ textAlign: "right" }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
              block={screens.xs}
            >
              {screens.xs ? "New" : "New Announcement"}
            </Button>
          </Col>
        </Row>
      </Card>

      <Card style={{ borderRadius: 8 }} bodyStyle={{ padding: screens.xs ? '0px' : '24px' }}>
        <Table
          columns={columns}
          dataSource={announcements}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }} // Allows horizontal scroll on mobile
          pagination={{
            ...pagination,
            simple: screens.xs, // Simple pagination for mobile
            showSizeChanger: !screens.xs,
            showTotal: (total) => screens.xs ? null : `${total} announcements`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      <Modal
        key={formModal.item ? `edit-${formModal.item.id}` : 'create'}
        title={formModal.mode === "create" ? "New Announcement" : "Edit Announcement"}
        open={formModal.visible}
        onCancel={handleCancel}
        footer={null}
        width={screens.xs ? "100%" : 600}
        centered
        destroyOnClose={true}
      >
        <Form 
            form={form} 
            layout="vertical" 
            onFinish={handleSubmit}
            initialValues={formModal.item || {}} 
        >
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="Announcement title" />
          </Form.Item>
          <Form.Item name="content" label="Content" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="Announcement content..." />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="type_id" label="Type">
                <Select placeholder="Select type" allowClear>
                  {types.map((t) => (
                    <Option key={t.id} value={t.id}>{t.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="event_date" label="Event Date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="location" label="Location">
                <Input placeholder="Event location" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="target_audience" label="Target Audience">
                <Input placeholder="e.g., All seniors, PWD" />
              </Form.Item>
            </Col>
          </Row>

          <Card
            type="inner"
            title={<span><PaperClipOutlined /> Attachments</span>}
            style={{ marginBottom: 16 }}
            size="small"
          >
            <Upload
              multiple={false}
              showUploadList={false}
              customRequest={async ({ file, onSuccess, onError }) => {
                if (formModal.mode === "create") {
                  setMediaList((prev) => [
                    ...prev,
                    {
                      uid: file.uid,
                      name: file.name,
                      status: "done",
                      url: URL.createObjectURL(file), 
                      originFileObj: file,
                    },
                  ]);
                  onSuccess();
                  return;
                }

                if (!formModal.item) return;
                setMediaUploading(true);
                const formData = new FormData();
                formData.append("file", file);
                try {
                  const res = await announcementsApi.uploadMedia(formModal.item.id, formData);
                  const uploaded = res.data?.data;
                  setMediaList((prev) => [...prev, uploaded]);
                  onSuccess && onSuccess(res.data);
                  message.success("File uploaded");
                } catch (err) {
                  onError && onError(err);
                  message.error("Failed to upload file");
                } finally {
                  setMediaUploading(false);
                }
              }}
            >
              <Button loading={mediaUploading} icon={<UploadOutlined />} block={screens.xs}>
                Upload File
              </Button>
            </Upload>

            <List
              style={{ marginTop: 16 }}
              size="small"
              bordered
              locale={{ emptyText: "No attachments yet" }}
              dataSource={mediaList}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <a key="view" href={item.url || item.file_path} target="_blank" rel="noopener noreferrer">View</a>,
                    <a key="del" style={{ color: "red" }} onClick={async () => {
                        try {
                          if (formModal.mode !== "create") await announcementsApi.deleteMedia(item.id);
                          setMediaList((prev) => prev.filter((m) => m.id !== item.id && m.uid !== item.uid));
                          message.success("Deleted");
                        } catch (e) { message.error("Failed"); }
                      }}>Delete</a>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<PaperClipOutlined />}
                    title={<Text ellipsis style={{maxWidth: screens.xs ? 100 : 200}}>{item.name || "File"}</Text>}
                  />
                </List.Item>
              )}
            />
          </Card>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space style={{ width: screens.xs ? '100%' : 'auto', justifyContent: 'flex-end' }}>
              <Button onClick={handleCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {formModal.mode === "create" ? "Publish" : "Save"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Announcements;