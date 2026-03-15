import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Select,
  Input,
  Spin,
  Empty,
  Tag,
  Pagination,
  Modal,
  Button,
  Image,
  Divider,
  Space,
} from "antd";
import {
  SearchOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { publicApi } from "../../services/api";

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

const News = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedBarangayId, setSelectedBarangayId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;

  // Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    const fetchBarangays = async () => {
      try {
        const response = await publicApi.getBarangays();
        setBarangays(response.data?.data || []);
      } catch (error) {
        console.error("Failed to load barangays", error);
      }
    };

    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        const params = selectedBarangayId
          ? { barangay_id: selectedBarangayId }
          : undefined;
        const response = await publicApi.getAnnouncements(params);
        const apiData = response.data?.data || [];

        const mapped = apiData.map((item) => ({
          id: item.id,
          title: item.title || "Untitled",
          // Maps 'description' from your backend to 'content'
          content:
            item.description || item.content || "No description available.",
          type: item.type?.name?.toLowerCase() || "news",
          date: item.event_date || item.published_at || item.created_at,
          location: item.location,
          media: item.media || [],
          target_audience: item.target_audience,
          barangay_id: item.barangay_id,
          barangay_name: item.barangay_name,
        }));

        setAnnouncements(mapped);
      } catch (error) {
        console.error("Failed to load announcements", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBarangays();
    fetchAnnouncements();
  }, [selectedBarangayId]);

  const typeColors = {
    event: { color: "#4338ca", bg: "#eef2ff" },
    notice: { color: "#059669", bg: "#ecfdf5" },
    advisory: { color: "#dc2626", bg: "#fef2f2" },
    news: { color: "#0891b2", bg: "#ecfeff" },
  };

  const handleOpenModal = (item) => {
    setSelectedItem(item);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    setIsModalVisible(false);
  };

  const filtered = announcements
    .filter((a) => filter === "all" || a.type === filter)
    .filter((a) => a.title.toLowerCase().includes(search.toLowerCase()));

  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Helper to get image URL
  // Helper to get image URL
  const getImageUrl = (mediaOrPath) => {
    if (!mediaOrPath) return "";

    if (typeof mediaOrPath === "object") {
      if (mediaOrPath.url) return mediaOrPath.url;
      mediaOrPath = mediaOrPath.file_path;
    }

    if (!mediaOrPath) return "";
    if (/^https?:\/\//i.test(mediaOrPath)) return mediaOrPath;

    const baseUrl = (
      import.meta.env.VITE_API_URL ||
      window.location.origin ||
      ""
    ).replace(/\/$/, "");
    const cleanPath = String(mediaOrPath).replace(/^\/+/, "");

    if (cleanPath.startsWith("storage/")) {
      return `${baseUrl}/${cleanPath}`;
    }

    return `${baseUrl}/storage/${cleanPath}`;
  };

  return (
    <div>
      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
          color: "white",
          padding: "60px 24px 80px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <Title level={1} style={{ color: "white", marginBottom: 16 }}>
            News & Announcements
          </Title>
          <Paragraph style={{ color: "rgba(255,255,255,0.9)", fontSize: 18 }}>
            Stay updated with the latest news, events, and advisories from OSCA.
          </Paragraph>
        </div>
      </section>

      {/* Filters */}
      <section style={{ padding: "32px 24px 0", background: "#f9fafb" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={8}>
              <Input
                prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
                placeholder="Search announcements..."
                size="large"
                allowClear
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ borderRadius: 8 }}
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                value={filter}
                onChange={(v) => {
                  setFilter(v);
                  setCurrentPage(1);
                }}
                showSearch
                optionFilterProp="children"
                size="large"
                style={{ width: "100%", borderRadius: 8 }}
              >
                <Option value="all">All Types</Option>
                <Option value="event">Events</Option>
                <Option value="notice">Notices</Option>
                <Option value="advisory">Advisories</Option>
                <Option value="news">News</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                value={selectedBarangayId}
                onChange={(v) => {
                  setSelectedBarangayId(v ?? null);
                  setCurrentPage(1);
                }}
                showSearch
                optionFilterProp="children"
                size="large"
                style={{ width: "100%", borderRadius: 8 }}
                placeholder="Filter by barangay"
                allowClear
              >
                {barangays.map((barangay) => (
                  <Option key={barangay.id} value={barangay.id}>
                    {barangay.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} md={12} style={{ textAlign: "right" }}>
              <Text type="secondary">
                {filtered.length} announcements found
              </Text>
            </Col>
          </Row>
        </div>
      </section>

      {/* List Grid */}
      <section style={{ padding: "32px 24px 80px", background: "#f9fafb" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 80 }}>
              <Spin size="large" />
            </div>
          ) : paginated.length === 0 ? (
            <Empty description="No announcements found" />
          ) : (
            <>
              <Row gutter={[24, 24]}>
                {paginated.map((item) => {
                  const typeStyle = typeColors[item.type] || typeColors.news;
                  return (
                    <Col xs={24} md={8} key={item.id}>
                      <Card
                        hoverable
                        onClick={() => handleOpenModal(item)}
                        style={{
                          height: "100%",
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          overflow: "hidden",
                        }}
                        bodyStyle={{ padding: 24 }}
                        cover={
                          item.media?.length > 0 ? (
                            <img
                              alt="cover"
                              src={getImageUrl(item.media[0])}
                              style={{ height: 200, objectFit: "cover" }}
                            />
                          ) : null
                        }
                      >
                        <div style={{ marginBottom: 12 }}>
                          <Tag
                            style={{
                              background: typeStyle.bg,
                              color: typeStyle.color,
                              border: "none",
                              textTransform: "capitalize",
                              fontWeight: 500,
                            }}
                          >
                            {item.type}
                          </Tag>
                          <Text
                            type="secondary"
                            style={{ fontSize: 12, marginLeft: 8 }}
                          >
                            <CalendarOutlined />{" "}
                            {item.date
                              ? dayjs(item.date).format("MMM D, YYYY")
                              : "No date"}
                          </Text>
                        </div>
                        <Title level={5} style={{ marginBottom: 8 }}>
                          {item.title}
                        </Title>
                        <Paragraph
                          style={{ color: "#6b7280", marginBottom: 0 }}
                          ellipsis={{ rows: 3 }}
                        >
                          {item.content}
                        </Paragraph>
                        {item.barangay_name && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Barangay: {item.barangay_name}
                          </Text>
                        )}
                      </Card>
                    </Col>
                  );
                })}
              </Row>
              {filtered.length > pageSize && (
                <div style={{ textAlign: "center", marginTop: 40 }}>
                  <Pagination
                    current={currentPage}
                    total={filtered.length}
                    pageSize={pageSize}
                    onChange={setCurrentPage}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* DETAIL MODAL */}
      <Modal
        title={null}
        open={isModalVisible}
        onCancel={handleCloseModal}
        footer={[
          <Button key="close" onClick={handleCloseModal}>
            Close
          </Button>,
        ]}
        width={800}
        centered
        destroyOnClose
        getContainer={false}
        blockScroll={false}
      >
        {selectedItem && (
          <div style={{ padding: "10px 0" }}>
            <Title level={3}>{selectedItem.title}</Title>

            <Space
              style={{ marginBottom: 16 }}
              split={<Divider type="vertical" />}
            >
              <Tag color="blue">{selectedItem.type?.toUpperCase()}</Tag>
              <Text type="secondary">
                <CalendarOutlined />{" "}
                {dayjs(selectedItem.date).format("MMMM D, YYYY")}
              </Text>
            </Space>

            {/* Image & Document Attachments */}
            {selectedItem.media?.length > 0 && (
              <div
                style={{
                  marginBottom: 24,
                  textAlign: "center",
                  background: "#f5f5f5",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <Image.PreviewGroup>
                  <Row gutter={[8, 8]} justify="center">
                    {selectedItem.media.map((file, index) => {
                      const fileUrl = getImageUrl(file);
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(
                        file.file_path,
                      );

                      return (
                        <Col
                          key={file.id || index}
                          span={index === 0 && isImage ? 24 : 6}
                        >
                          {isImage ? (
                            <Image
                              style={{
                                maxHeight: index === 0 ? 400 : 120,
                                objectFit: "cover",
                                borderRadius: 8,
                                width: "100%",
                              }}
                              src={fileUrl}
                            />
                          ) : (
                            <Button
                              type="primary"
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                width: "100%",
                                height: "100%",
                                minHeight: "120px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              View/Download
                              <br />
                              Attachment
                            </Button>
                          )}
                        </Col>
                      );
                    })}
                  </Row>
                </Image.PreviewGroup>
              </div>
            )}

            {/* Extra Info */}
            {(selectedItem.location || selectedItem.target_audience) && (
              <Card
                size="small"
                style={{
                  marginBottom: 20,
                  background: "#fafafa",
                  border: "none",
                }}
              >
                <Row gutter={16}>
                  {selectedItem.location && (
                    <Col span={12}>
                      <Text strong>
                        <EnvironmentOutlined /> Location
                      </Text>
                      <Paragraph>{selectedItem.location}</Paragraph>
                    </Col>
                  )}
                  {selectedItem.target_audience && (
                    <Col span={12}>
                      <Text strong>
                        <InfoCircleOutlined /> Who can attend
                      </Text>
                      <Paragraph>{selectedItem.target_audience}</Paragraph>
                    </Col>
                  )}
                </Row>
              </Card>
            )}

            <Divider />

            <Paragraph
              style={{
                fontSize: 16,
                lineHeight: "1.8",
                whiteSpace: "pre-wrap",
              }}
            >
              {selectedItem.content}
            </Paragraph>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default News;
