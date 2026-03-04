import { useEffect, useState } from "react";
import {
  Card,
  Table,
  Row,
  Col,
  Input,
  Select,
  DatePicker,
  Tag,
  Typography,
  Space,
  Modal,
  Descriptions,
  Timeline,
  Spin,
  message,
  Button,
} from "antd";
import {
  FolderOutlined,
  SearchOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { archivesApi } from "../services/api";

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const Archives = () => {
  const [loading, setLoading] = useState(false);
  const [archives, setArchives] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    reason: undefined,
    archive_type: undefined, // 1. Changed from "senior_citizen" to undefined
    from_date: undefined,
    to_date: undefined,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    fetchArchives(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchArchives = async (page = 1, pageSize = 10, currentFilters = filters) => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: pageSize,
        ...currentFilters,
      };
      const response = await archivesApi.getList(params);
      const payload = response.data?.data;
      if (payload) {
        const { data, current_page, per_page, total } = payload;
        setArchives(data);
        setPagination({ current: current_page, pageSize: per_page, total });
      }
    } catch (error) {
      console.error("Failed to load archives", error);
      message.error("Failed to load archives");
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (paginationConfig) => {
    fetchArchives(paginationConfig.current, paginationConfig.pageSize);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, search: value }));
  };

  const handleReasonChange = (value) => {
  const newReason = value === "" ? undefined : (value || undefined);
  const newFilters = { ...filters, reason: newReason };
  setFilters(newFilters);
  fetchArchives(1, pagination.pageSize, newFilters);
  };

  const handleTypeChange = (value) => {
    // Treat empty string or null as undefined to remove the filter
    const newType = value === "" ? undefined : (value || undefined);
    const newFilters = { ...filters, archive_type: newType };
    
    setFilters(newFilters);
    fetchArchives(1, pagination.pageSize, newFilters);
  };

  const handleDateRangeChange = (dates) => {
  let newFilters;
  if (!dates || dates.length === 0) {
    newFilters = { ...filters, from_date: undefined, to_date: undefined };
  } else {
    newFilters = {
      ...filters,
      from_date: dates[0].format("YYYY-MM-DD"),
      to_date: dates[1].format("YYYY-MM-DD"),
    };
  }
  setFilters(newFilters);
  fetchArchives(1, pagination.pageSize, newFilters);
  };

  const applyFilters = () => {
    fetchArchives(1, pagination.pageSize);
  };

  const openDetails = async (record) => {
    try {
      setModalOpen(true);
      setSelected(null);
      setTimeline([]);
      setTimelineLoading(true);

      const [detailRes, timelineRes] = await Promise.all([
        archivesApi.getById(record.id),
        archivesApi.getTimeline(record.id),
      ]);

      setSelected(detailRes.data?.data || null);
      setTimeline(timelineRes.data?.data?.events || []);
    } catch (error) {
      console.error("Failed to load archive details", error);
      message.error("Failed to load archive details");
    } finally {
      setTimelineLoading(false);
    }
  };

  const columns = [
  {
    title: "Name & Identifier",
    key: "name_id",
    render: (_, record) => (
      <Space direction="vertical" size={0}>
        <Button 
          type="link" 
          onClick={() => openDetails(record)} 
          style={{ padding: 0, height: 'auto', fontWeight: 600 }}
        >
          {record.full_name || record.username || "Unknown"}
        </Button>
        {record.archive_type === "senior_citizen" ? (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ID: {record.osca_id || "No OSCA ID"}
          </Text>
        ) : (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Emp ID: {record.employee_id || "N/A"}
          </Text>
        )}
      </Space>
    ),
  },
  {
    title: "Archive Type",
    dataIndex: "archive_type",
    key: "archive_type",
    render: (type) => (
      <Tag color={type === "senior_citizen" ? "blue" : "purple"}>
        {type === "senior_citizen" ? "Senior Citizen" : "Admin User"}
      </Tag>
    ),
  },
  {
    title: "Reason",
    dataIndex: "archive_reason",
    key: "archive_reason",
    render: (reason) => (
      <Tag icon={<FolderOutlined />} color="default">
        {reason ? reason.toUpperCase() : "N/A"}
      </Tag>
    ),
  },
  {
    title: "Archived At",
    dataIndex: "archived_at",
    key: "archived_at",
    width: 180,
    render: (date) => (
      <Space>
        <ClockCircleOutlined style={{ color: '#bfbfbf' }} />
        {date ? dayjs(date).format("MMM D, YYYY HH:mm") : "-"}
      </Space>
    ),
  },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <FolderOutlined /> Archives
        </Title>
        <Text type="secondary">
          View archived senior records, reasons, and activity timeline.
        </Text>
      </div>

      <Card style={{ marginBottom: 16, borderRadius: 8 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={6}>
            <Input
              placeholder="Search by name or OSCA ID"
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              allowClear
              onChange={handleSearchChange}
            />
          </Col>
          <Col xs={12} md={5}>
            <Select
              placeholder="Archive type"
              value={filters.archive_type || ""} // 3. Updated Select to handle empty/All state
              style={{ width: "100%" }}
              onChange={handleTypeChange}
            >
              <Option value="">All Types</Option>
              <Option value="senior_citizen">Senior Citizens</Option>
              <Option value="admin_user">Admin Users</Option>
            </Select>
          </Col>
          <Col xs={12} md={5}>
            <Select
              placeholder="Reason"
              value={filters.reason || ""} // Syncs with state: empty string shows "All"
              allowClear
              style={{ width: "100%" }}
              onChange={handleReasonChange}
            >
              <Option value="">All Reasons</Option> {/* Added All option */}
              <Option value="deceased">Deceased</Option>
              <Option value="deactivated">Deactivated</Option>
              <Option value="transferred">Transferred</Option>
              <Option value="other">Other</Option>
            </Select>
            </Col>
          <Col xs={24} md={6}>
            <RangePicker
              style={{ width: "100%" }}
              onChange={handleDateRangeChange}
            />
          </Col>
          <Col xs={24} md={2} style={{ textAlign: "right" }}>
            
          </Col>
        </Row>
      </Card>

      <Card style={{ borderRadius: 8 }}>
        <Table
          columns={columns}
          dataSource={archives}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `${total} archived records`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      <Modal
        title={
          <span>
            Archive Details
            {selected?.full_name && (
              <span style={{ marginLeft: 8, fontWeight: 400 }}>
                - {selected.full_name}
              </span>
            )}
          </span>
        }
        width={600}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
        centered
      >
        {timelineLoading && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin />
          </div>
        )}

        {!timelineLoading && selected && (
          <>
            <Descriptions
              bordered
              size="small"
              column={1}
              style={{ marginBottom: 24 }}
            >
              <Descriptions.Item label="Name">
                {selected.full_name || selected.username || "-"}
              </Descriptions.Item>
              {selected.osca_id && (
                <Descriptions.Item label="OSCA ID">
                  {selected.osca_id}
                </Descriptions.Item>
              )}
              {selected.employee_id && (
                <Descriptions.Item label="Employee ID">
                  {selected.employee_id}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Archive Type">
                {selected.archive_type === "senior_citizen"
                  ? "Senior Citizen"
                  : "Admin User"}
              </Descriptions.Item>
              <Descriptions.Item label="Reason">
                {selected.archive_reason}
              </Descriptions.Item>
              {selected.deceased_date && (
                <Descriptions.Item label="Deceased Date">
                  {dayjs(selected.deceased_date).format("MMM D, YYYY")}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Archived At">
                {selected.archived_at
                  ? dayjs(selected.archived_at).format("MMM D, YYYY HH:mm")
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Archived By">
                {selected.archived_by_name || "Main Admin"}
              </Descriptions.Item>
              {selected.barangay && (
                <Descriptions.Item label="Barangay">
                  {selected.barangay.name}
                </Descriptions.Item>
              )}
              {selected.branch && (
                <Descriptions.Item label="Branch">
                  {selected.branch.name}
                </Descriptions.Item>
              )}
              {selected.archive_notes && (
                <Descriptions.Item label="Notes">
                  {selected.archive_notes}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Title level={5}>
              <ClockCircleOutlined /> Activity Timeline
            </Title>
            {timeline.length === 0 ? (
              <Text type="secondary">No activity records found.</Text>
            ) : (
              <Timeline style={{ marginTop: 16 }}>
                {timeline.map((event, idx) => {
                  if (event.type === "audit") {
                    return (
                      <Timeline.Item
                        key={idx}
                        dot={
                          <ClockCircleOutlined style={{ fontSize: "12px" }} />
                        }
                      >
                        <Text strong>{event.action}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {event.created_at}{" "}
                          {event.user_name && `by ${event.user_name}`}
                        </Text>
                        {event.description && (
                          <div style={{ marginTop: 4 }}>
                            <Text>{event.description}</Text>
                          </div>
                        )}
                      </Timeline.Item>
                    );
                  }

                  // Archive event
                  return (
                    <Timeline.Item
                      key={idx}
                      color="red"
                      dot={<ClockCircleOutlined style={{ fontSize: "12px" }} />}
                    >
                      <Text strong>Archived ({event.reason})</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {event.archived_at}
                      </Text>
                      {event.notes && (
                        <div style={{ marginTop: 4 }}>
                          <Text>{event.notes}</Text>
                        </div>
                      )}
                    </Timeline.Item>
                  );
                })}
              </Timeline>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default Archives;