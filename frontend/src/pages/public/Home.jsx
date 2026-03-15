import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Row,
  Col,
  Button,
  Card,
  Statistic,
  Typography,
  Spin,
  Modal,
  Tag,
  Space,
  Divider,
  Image,
} from "antd"; // Added Modal, Tag, Space, Divider, Image
import {
  ArrowRightOutlined,
  TeamOutlined,
  IdcardOutlined,
  FileTextOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
  RightOutlined,
  LeftOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { publicApi } from "../../services/api";

const { Title, Paragraph, Text } = Typography;

// Carousel images
const carouselImages = [
  "/images/img_carousel1.jpg",
  "/images/img_carousel2.jpg",
  "/images/img_carousel3.jpg",
  "/images/img_carousel4.jpg",
  "/images/img_carousel5.jpg",
  "/images/img_carousel6.jpg",
];

// Hero Section with Image Carousel
const HeroSection = () => {
  const [currentImage, setCurrentImage] = useState(0);

  // Auto-rotate images every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % carouselImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const goToPrev = useCallback(() => {
    setCurrentImage(
      (prev) => (prev - 1 + carouselImages.length) % carouselImages.length,
    );
  }, []);

  const goToNext = useCallback(() => {
    setCurrentImage((prev) => (prev + 1) % carouselImages.length);
  }, []);

  return (
    <section
      style={{
        background:
          "linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #818cf8 100%)",
        color: "white",
        padding: "100px 24px 120px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          top: "-100px",
          right: "-100px",
          width: "400px",
          height: "400px",
          background: "rgba(255,255,255,0.08)",
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-150px",
          left: "-50px",
          width: "300px",
          height: "300px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "50%",
        }}
      />

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Row gutter={[48, 48]} align="middle">
          <Col xs={24} lg={14}>
            <div
              style={{
                display: "inline-block",
                padding: "6px 16px",
                background: "rgba(255,255,255,0.15)",
                borderRadius: 20,
                fontSize: 13,
                marginBottom: 24,
              }}
            >
              🏛️ Office of Senior Citizens Affairs
            </div>
            <Title
              level={1}
              style={{
                color: "white",
                fontSize: "clamp(32px, 5vw, 52px)",
                lineHeight: 1.2,
                marginBottom: 24,
              }}
            >
              Serving Our Beloved <br />
              Senior Citizens
            </Title>
            <Paragraph
              style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: 18,
                lineHeight: 1.7,
                maxWidth: 500,
                marginBottom: 32,
              }}
            >
              Dedicated to protecting and promoting the rights, dignity, and
              welfare of senior citizens in Zamboanga City. Register now and
              enjoy your benefits.
            </Paragraph>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Link to="/apply">
                <Button
                  size="large"
                  style={{
                    background: "white",
                    color: "#4338ca",
                    border: "none",
                    height: 50,
                    paddingInline: 32,
                    fontWeight: 600,
                    borderRadius: 10,
                  }}
                >
                  Apply for ID <ArrowRightOutlined />
                </Button>
              </Link>
              <Link to="/services">
                <Button
                  size="large"
                  ghost
                  style={{
                    color: "white",
                    borderColor: "rgba(255,255,255,0.5)",
                    height: 50,
                    paddingInline: 32,
                    fontWeight: 500,
                    borderRadius: 10,
                  }}
                >
                  View Services
                </Button>
              </Link>
            </div>
          </Col>
          <Col xs={24} lg={10} style={{ textAlign: "center" }}>
            {/* Image Carousel */}
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 400,
                margin: "0 auto",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 300,
                  borderRadius: 20,
                  overflow: "hidden",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                  position: "relative",
                }}
              >
                {carouselImages.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`Senior Citizens Event ${index + 1}`}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: currentImage === index ? 1 : 0,
                      transition: "opacity 0.8s ease-in-out",
                    }}
                  />
                ))}
              </div>
              {/* Navigation arrows */}
              <button
                onClick={goToPrev}
                style={{
                  position: "absolute",
                  left: -20,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.9)",
                  border: "none",
                  borderRadius: "50%",
                  width: 40,
                  height: 40,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                <LeftOutlined style={{ color: "#4338ca" }} />
              </button>
              <button
                onClick={goToNext}
                style={{
                  position: "absolute",
                  right: -20,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.9)",
                  border: "none",
                  borderRadius: "50%",
                  width: 40,
                  height: 40,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                <RightOutlined style={{ color: "#4338ca" }} />
              </button>
              {/* Dots indicator */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 16,
                }}
              >
                {carouselImages.map((_, index) => (
                  <div
                    key={index}
                    onClick={() => setCurrentImage(index)}
                    style={{
                      width: currentImage === index ? 24 : 8,
                      height: 8,
                      borderRadius: 4,
                      background:
                        currentImage === index
                          ? "white"
                          : "rgba(255,255,255,0.4)",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                    }}
                  />
                ))}
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </section>
  );
};

// Stats Section
const StatsSection = () => {
  const [stats, setStats] = useState({ seniors: 0, approved: 0, claimed: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const API_URL =
          import.meta.env.VITE_API_URL || "http://localhost:8000/api";
        const response = await fetch(`${API_URL}/public/stats`);
        const data = await response.json();
        if (data.data) {
          setStats({
            seniors: data.data.registered_seniors || 0,
            approved: data.data.ids_issued_this_year || 0,
            claimed: data.data.benefits_claimed || 0,
          });
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };
    fetchStats();
  }, []);

  return (
    <section
      style={{
        padding: "0 24px",
        marginTop: -60,
        position: "relative",
        zIndex: 2,
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Card
          style={{
            borderRadius: 16,
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
          }}
        >
          <Row gutter={[32, 24]}>
            <Col xs={24} sm={8}>
              <Statistic
                title={
                  <span style={{ color: "#6b7280" }}>Registered Seniors</span>
                }
                value={stats.seniors}
                prefix={
                  <TeamOutlined style={{ color: "#4338ca", marginRight: 8 }} />
                }
                valueStyle={{ color: "#1f2937", fontWeight: 700 }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title={
                  <span style={{ color: "#6b7280" }}>IDs Issued This Year</span>
                }
                value={stats.approved}
                prefix={
                  <IdcardOutlined
                    style={{ color: "#059669", marginRight: 8 }}
                  />
                }
                valueStyle={{ color: "#1f2937", fontWeight: 700 }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title={
                  <span style={{ color: "#6b7280" }}>Benefits Claimed</span>
                }
                value={stats.claimed}
                prefix={
                  <SafetyCertificateOutlined
                    style={{ color: "#dc2626", marginRight: 8 }}
                  />
                }
                valueStyle={{ color: "#1f2937", fontWeight: 700 }}
              />
            </Col>
          </Row>
        </Card>
      </div>
    </section>
  );
};

// Services Preview
const ServicesPreview = () => {
  const services = [
    {
      icon: <IdcardOutlined style={{ fontSize: 32, color: "#4338ca" }} />,
      title: "Senior Citizen ID",
      description:
        "Register and get your official OSCA ID to access benefits and privileges.",
    },
    {
      icon: (
        <SafetyCertificateOutlined style={{ fontSize: 32, color: "#059669" }} />
      ),
      title: "Benefits & Discounts",
      description:
        "20% discount on medicine, restaurants, transportation, and more.",
    },
    {
      icon: <FileTextOutlined style={{ fontSize: 32, color: "#dc2626" }} />,
      title: "File Complaints",
      description:
        "Report violations of RA 9994 and protect your rights as a senior citizen.",
    },
  ];

  return (
    <section style={{ padding: "80px 24px", background: "white" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <Text
            style={{
              color: "#4338ca",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontSize: 13,
            }}
          >
            What We Offer
          </Text>
          <Title level={2} style={{ marginTop: 8, marginBottom: 16 }}>
            Our Services
          </Title>
          <Paragraph
            style={{
              color: "#6b7280",
              fontSize: 16,
              maxWidth: 600,
              margin: "0 auto",
            }}
          >
            OSCA provides various services and programs for the welfare of
            senior citizens.
          </Paragraph>
        </div>
        <Row gutter={[24, 24]}>
          {services.map((service, index) => (
            <Col xs={24} md={8} key={index}>
              <Card
                hoverable
                style={{
                  height: "100%",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                }}
                bodyStyle={{ padding: 32 }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    background: "#eef2ff",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  {service.icon}
                </div>
                <Title level={4} style={{ marginBottom: 12 }}>
                  {service.title}
                </Title>
                <Paragraph style={{ color: "#6b7280", marginBottom: 0 }}>
                  {service.description}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <Link to="/services">
            <Button type="link" style={{ color: "#4338ca", fontWeight: 600 }}>
              View All Services <RightOutlined />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

// Announcements Preview
const AnnouncementsPreview = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // MODAL STATES
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        const response = await publicApi.getAnnouncements();
        const apiData = response.data?.data || [];

        const mapped = apiData.slice(0, 3).map((item) => ({
          id: item.id,
          title: item.title,
          type: item.type?.name?.toLowerCase() || "news",
          date: item.event_date || item.published_at || item.created_at,
          content: item.description || item.content, // Full content for modal
          location: item.location,
          target_audience: item.target_audience,
          media: item.media || [],
        }));

        setAnnouncements(mapped);
      } catch (error) {
        console.error("Failed to load announcements preview", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  const handleOpenModal = (item) => {
    setSelectedItem(item);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    setIsModalVisible(false);
  };

  const getTypeColor = (type) => {
    const colors = { event: "#4338ca", notice: "#059669", advisory: "#dc2626" };
    return colors[type] || "#6b7280";
  };

  // Helper for image paths
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
    <section style={{ padding: "80px 24px", background: "#f9fafb" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <Text
              style={{
                color: "#4338ca",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 1,
                fontSize: 13,
              }}
            >
              Stay Updated
            </Text>
            <Title level={2} style={{ marginTop: 8, marginBottom: 0 }}>
              Latest Announcements
            </Title>
          </div>
          <Link to="/news">
            <Button style={{ borderRadius: 8, borderColor: "#d1d5db" }}>
              View All <RightOutlined />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : (
          <Row gutter={[24, 24]}>
            {announcements.map((item) => (
              <Col xs={24} md={8} key={item.id}>
                <Card
                  hoverable
                  onClick={() => handleOpenModal(item)} // CLICK TO OPEN MODAL
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
                        style={{ height: 180, objectFit: "cover" }}
                      />
                    ) : null
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        padding: "2px 10px",
                        background: `${getTypeColor(item.type)}15`,
                        color: getTypeColor(item.type),
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: "capitalize",
                      }}
                    >
                      {item.type}
                    </span>
                    <span style={{ color: "#9ca3af", fontSize: 12 }}>
                      <CalendarOutlined />{" "}
                      {dayjs(item.date).format("MMM D, YYYY")}
                    </span>
                  </div>
                  <Title level={5} style={{ marginBottom: 8 }}>
                    {item.title}
                  </Title>
                  <Paragraph
                    style={{ color: "#6b7280", marginBottom: 0, fontSize: 14 }}
                    ellipsis={{ rows: 2 }}
                  >
                    {item.content}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>

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

            {/* Event Info Card */}
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
    </section>
  );
};

// CTA Section
const CTASection = () => (
  <section
    style={{
      padding: "80px 24px",
      background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
    }}
  >
    <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
      <Title level={2} style={{ color: "white", marginBottom: 16 }}>
        Ready to Get Your Senior Citizen ID?
      </Title>
      <Paragraph
        style={{
          color: "rgba(255,255,255,0.9)",
          fontSize: 18,
          marginBottom: 32,
        }}
      >
        Pre-register now and visit your nearest OSCA office to complete your
        registration.
      </Paragraph>
      <Link to="/apply">
        <Button
          size="large"
          style={{
            background: "white",
            color: "#4338ca",
            border: "none",
            height: 54,
            paddingInline: 40,
            fontWeight: 600,
            borderRadius: 10,
            fontSize: 16,
          }}
        >
          Pre-Register Now <ArrowRightOutlined />
        </Button>
      </Link>
    </div>
  </section>
);

// Main Home Page
const Home = () => {
  return (
    <div>
      <HeroSection />
      <StatsSection />
      <ServicesPreview />
      <AnnouncementsPreview />
      <CTASection />
    </div>
  );
};

export default Home;
